#!/usr/bin/env node
/**
 * claude-review.js — 调用 Anthropic API 审查 PR 代码变更
 * 用法: node claude-review.js <diff_file> <output_json>
 * 输出: JSON { summary, findings: [{severity, file, line, description, suggestion}] }
 */

const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6-20250929';

const REVIEW_PROMPT = `你是一位资深前端代码审查专家。请审查以下 PR 的代码变更。

审查维度：
1. 功能逻辑 — 是否有逻辑错误、边界情况遗漏
2. 安全性 — XSS、注入、敏感信息泄露、不安全的数据处理
3. 性能 — 不必要的重渲染、内存泄漏、大计算阻塞主线程
4. 可维护性 — 命名规范、代码重复、类型安全、组件拆分

严重程度定义：
- critical: 必须修复（安全漏洞、生产崩溃、数据丢失风险）
- high: 应该修复（明显bug、严重性能问题）
- medium: 建议修复（代码异味、不规范写法）
- low: 可选修复（更好的写法建议）

请以 JSON 格式返回（只返回 JSON，不要其他内容）：
{
  "summary": "一句话总结本次变更",
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "category": "security|logic|performance|maintainability",
      "file": "文件路径",
      "line": "行号或null",
      "description": "问题描述（中文）",
      "suggestion": "修复建议（中文）"
    }
  ]
}

以下是 PR 变更内容：`;

async function main() {
  const diffFile = process.argv[2] || '/tmp/pr_diff.txt';
  const outputFile = process.argv[3] || '/tmp/review-result.json';

  if (!ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY 未设置');
    process.exit(1);
  }

  let diffContent;
  try {
    diffContent = fs.readFileSync(diffFile, 'utf-8');
  } catch {
    console.warn('WARN: 无法读取 diff 文件，尝试获取变更文件列表');
    diffContent = '（无diff内容，请审查最新提交的变更）';
  }

  if (diffContent.trim().length === 0) {
    console.log('INFO: Diff为空，无需审查');
    fs.writeFileSync(outputFile, JSON.stringify({ summary: '无变更', findings: [] }));
    process.exit(0);
  }

  // diff过大时截断（Claude上下文限制）
  const MAX_DIFF_SIZE = 80000;
  if (diffContent.length > MAX_DIFF_SIZE) {
    console.warn(`WARN: Diff过大 (${diffContent.length} chars)，截断至 ${MAX_DIFF_SIZE} chars`);
    diffContent = diffContent.substring(0, MAX_DIFF_SIZE) + '\n\n... (diff内容已截断)';
  }

  console.log(`INFO: 发送审查请求，diff ${diffContent.length}字符`);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: '你只返回JSON，不要markdown代码块包裹，不要任何额外文字说明。',
        messages: [
          { role: 'user', content: REVIEW_PROMPT + '\n\n' + diffContent },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`API请求失败 HTTP ${response.status}: ${errBody}`);
      process.exit(1);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // 尝试从可能的markdown代码块中提取JSON
    let result;
    const jsonMatch = rawText.match(/```(?:json)?\s*\n?([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/);
    try {
      result = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
    } catch {
      console.warn('WARN: Claude返回非JSON格式，包装为原始输出');
      result = {
        summary: '审查完成（非结构化输出）',
        findings: [{
          severity: 'medium',
          category: 'maintainability',
          file: null,
          line: null,
          description: 'Claude审查意见（非结构化）',
          suggestion: rawText.substring(0, 1000),
        }],
      };
    }

    // 统计
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    (result.findings || []).forEach(f => { counts[f.severity] = (counts[f.severity] || 0) + 1; });
    console.log(`审查完成: critical=${counts.critical} high=${counts.high} medium=${counts.medium} low=${counts.low}`);

    fs.writeFileSync(outputFile, JSON.stringify({ ...result, _counts: counts, _model: CLAUDE_MODEL }, null, 2));
    console.log(`结果写入: ${outputFile}`);

  } catch (err) {
    console.error(`API调用异常: ${err.message}`);
    process.exit(1);
  }
}

main();
