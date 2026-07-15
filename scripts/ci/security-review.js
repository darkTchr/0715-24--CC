#!/usr/bin/env node
/**
 * security-review.js — 调用 Claude API 进行深度安全审查
 * 用法: node security-review.js <changed_files> <audit_json> <output_json>
 */

const fs = require('fs');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6-20250929';

const SECURITY_PROMPT = `你是Web前端安全专家。请对以下文件进行安全审查。

重点检查：
1. XSS漏洞 — dangerouslySetInnerHTML、innerHTML、未转义的用户输入
2. 敏感信息泄露 — API密钥硬编码、调试信息暴露、localStorage明文敏感数据
3. CSRF/请求伪造 — 未验证的fetch请求、危险的redirect
4. 依赖注入 — eval、new Function、动态import的危险用法
5. 不安全的摄像头/媒体处理 — MediaStream未释放、Canvas指纹
6. 客户端数据安全 — 敏感数据未加密存储、token暴露
7. 第三方脚本安全 — 不可信的CDN、npm依赖已知漏洞
8. CSP/安全头缺失 — 缺少Content-Security-Policy等

请以JSON格式返回（只返回JSON）：
{
  "summary": "安全审查总结",
  "riskLevel": "critical|high|medium|low|safe",
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "type": "漏洞类型",
      "file": "文件路径",
      "line": "行号或null",
      "cwe": "CWE编号（如CWE-79）",
      "description": "问题描述(中文)",
      "attackScenario": "攻击场景说明",
      "fix": "修复建议",
      "bypass": false
    }
  ]
}

注意：
- bypass=true 表示此问题在当前上下文不构成实际威胁（如仅本地运行的代码）
- 只报告真实存在的安全问题，不要虚报`;

async function main() {
  const changedFilesFile = process.argv[2] || '/tmp/changed_files.txt';
  const auditFile = process.argv[3] || '/tmp/audit-result.json';
  const outputFile = process.argv[4] || '/tmp/claude-security.json';

  if (!ANTHROPIC_API_KEY) {
    console.warn('WARN: ANTHROPIC_API_KEY 未设置，跳过Claude安全审查');
    fs.writeFileSync(outputFile, JSON.stringify({ summary: '跳过（无API Key）', riskLevel: 'unknown', findings: [] }));
    process.exit(0);
  }

  // 读取变更文件列表
  let fileList = [];
  try {
    fileList = fs.readFileSync(changedFilesFile, 'utf-8').split('\n').filter(Boolean);
  } catch {
    fileList = ['src/'];
  }
  console.log(`安全审查文件: ${fileList.length}个`);

  // 读取文件内容（限制总大小）
  const MAX_TOTAL_SIZE = 60000;
  let codeContext = '';
  for (const file of fileList.slice(0, 30)) { // 最多30个文件
    try {
      const content = fs.readFileSync(file.trim(), 'utf-8');
      if (codeContext.length + content.length > MAX_TOTAL_SIZE) {
        codeContext += `\n\n// ${file} (内容已截断)\n${content.substring(0, MAX_TOTAL_SIZE - codeContext.length)}`;
        break;
      }
      codeContext += `\n\n===== ${file} =====\n${content}`;
    } catch {
      // 文件不存在或不可读
    }
  }

  // 读取npm audit结果
  let auditSummary = '';
  try {
    const auditData = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    const v = auditData.vulnerabilities || {};
    auditSummary = `npm audit发现 ${Object.keys(v).length} 个漏洞。`;
    Object.entries(v).slice(0, 10).forEach(([pkg, info]) => {
      auditSummary += `\n  - ${pkg}: ${info.severity}`;
    });
  } catch {
    auditSummary = 'npm audit结果不可用';
  }

  const fullPrompt = `${SECURITY_PROMPT}\n\n## 依赖审计摘要\n${auditSummary}\n\n## 源代码\n${codeContext}`;

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
        system: '你只返回JSON，不要markdown代码块包裹。',
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    });

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    let result;
    const jsonMatch = rawText.match(/```(?:json)?\s*\n?([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/);
    try {
      result = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
    } catch {
      result = { summary: rawText.substring(0, 500), riskLevel: 'medium', findings: [] };
    }

    const realFindings = (result.findings || []).filter(f => !f.bypass);
    console.log(`安全审查完成: riskLevel=${result.riskLevel}, 实际问题=${realFindings.length}`);

    fs.writeFileSync(outputFile, JSON.stringify({ ...result, _realFindingCount: realFindings.length }, null, 2));

  } catch (err) {
    console.error(`安全审查API失败: ${err.message}`);
    process.exit(1);
  }
}

main();
