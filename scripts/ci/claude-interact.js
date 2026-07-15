#!/usr/bin/env node
/**
 * claude-interact.js — 根据解析的@claude命令调用Anthropic API生成回复
 * 用法: node claude-interact.js <command_context_json> <output_json>
 * 输出: JSON { response, command, model, usage }
 */

const fs = require('fs');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6-20250929';

// ============================================================
// 各命令的 System Prompt
// ============================================================
const SYSTEM_PROMPTS = {
  review: `你是一位资深前端代码审查专家，专注于 Next.js + TypeScript + React 项目。
审查维度：
1. 功能逻辑 — 逻辑错误、边界情况遗漏、状态管理问题
2. 安全性 — XSS、注入、敏感信息泄露
3. 性能 — 不必要的重渲染、内存泄漏、大计算阻塞主线程
4. 可维护性 — 命名规范、类型安全、代码重复、组件职责单一
5. 架构 — 是否符合项目规范（优先RSC、'use client'标注、hooks封装）

输出格式：Markdown 报告。
- 严重问题用 🔴 标注
- 中等问题用 🟡 标注
- 轻微建议用 🟢 标注
- 每个发现标注文件和行号`,

  explain: `你是前端技术专家，用通俗易懂的中文解释代码。

要求：
1. 先给出"一句话总结"这段代码的作用
2. 再逐段解释关键逻辑
3. 指出值得注意的细节（陷阱、巧妙之处）
4. 如果涉及项目特有的模式，结合项目上下文说明

格式：Markdown，使用代码块展示关键逻辑。`,

  suggest: `你是资深前端架构师，为代码提供改进建议。

改进维度（按优先级）：
1. 架构优化 — 组件拆分、状态管理、数据流
2. 性能优化 — 渲染优化、懒加载、缓存策略
3. 类型安全 — TypeScript类型完善
4. 可维护性 — 命名、注释、文件组织
5. 用户体验 — 交互细节、错误处理

要求：
- 每个建议包含：现状问题 → 改进方案 → 示例代码
- 按影响程度从高到低排列
- 优先符合项目现有架构规范（RSC优先、hooks封装等）`,

  security: `你是Web前端安全专家。对代码进行深度安全审查。

检查清单：
1. XSS — dangerouslySetInnerHTML、innerHTML、v-html、未转义的用户输入
2. 敏感信息泄露 — API Key硬编码、调试日志、localStorage明文敏感数据
3. CSRF/SSRF — 未验证的fetch、危险的redirect
4. 代码注入 — eval、new Function、动态import危险用法
5. 依赖安全 — 已知漏洞的npm包版本
6. 客户端存储 — token存储方式、敏感数据加密
7. 摄像头/媒体 — MediaStream释放、权限管理
8. CSP/CORS — 安全头配置缺失

输出格式：
- 按严重程度排列（🔴Critical → 🟠High → 🟡Medium → 🟢Low）
- 每个发现包含：漏洞类型、CWE编号、攻击场景、修复方案
- 标注"是否可被实际利用"`,
};

// ============================================================
// 各命令的 User Prompt 构建
// ============================================================
function buildUserPrompt(context, diffContent) {
  const { command, args, commentBody, codeBlocks, fileRefs, changedFiles } = context;

  let prompt = '';

  switch (command) {
    case 'review': {
      const targetFiles = args || fileRefs.join(', ');
      prompt = `请审查以下PR变更`;

      if (targetFiles) {
        prompt += `，重点关注: ${targetFiles}`;
      }
      prompt += `。\n\n变更文件: ${changedFiles.join(', ') || '见diff'}`;
      prompt += `\n\n## PR Diff\n\`\`\`diff\n${truncate(diffContent, 60000)}\n\`\`\``;
      break;
    }

    case 'explain': {
      // 优先使用代码块内容，其次args，再其次文件引用
      const codeToExplain = codeBlocks.length > 0
        ? codeBlocks.map(b => `\`\`\`${b.language}\n${b.code}\n\`\`\``).join('\n\n')
        : args;

      prompt = `请解释以下代码：\n\n${codeToExplain || '（请用户提供代码片段）'}`;

      // 附加文件上下文
      if (fileRefs.length > 0) {
        prompt += `\n\n相关文件: ${fileRefs.join(', ')}`;
      }
      break;
    }

    case 'suggest': {
      const targetFiles = fileRefs.length > 0 ? fileRefs.join(', ') : (args || '全部变更');

      prompt = `请为以下代码提供改进建议，聚焦: ${targetFiles}`;

      if (diffContent) {
        prompt += `\n\n## 代码变更\n\`\`\`diff\n${truncate(diffContent, 50000)}\n\`\`\``;
      }

      if (codeBlocks.length > 0) {
        prompt += `\n\n## 关注的代码片段\n${codeBlocks.map(b => `\`\`\`${b.language}\n${b.code}\n\`\`\``).join('\n\n')}`;
      }
      break;
    }

    case 'security': {
      prompt = `请对以下代码进行深度安全审查。`;

      if (diffContent) {
        prompt += `\n\n## 代码变更\n\`\`\`diff\n${truncate(diffContent, 50000)}\n\`\`\``;
      }

      if (changedFiles.length > 0) {
        prompt += `\n\n变更文件列表:\n${changedFiles.map(f => `- ${f}`).join('\n')}`;
      }
      break;
    }

    default:
      prompt = commentBody || '请提供帮助。';
  }

  return prompt;
}

/** 截断文本到指定长度 */
function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  return text.substring(0, maxLen) + `\n\n... (已截断，原文 ${text.length} 字符)`;
}

/** 读取PR diff内容 */
function readDiff(diffFile) {
  try {
    return fs.readFileSync(diffFile, 'utf-8');
  } catch {
    return '';
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  const contextFile = process.argv[2] || '/tmp/command-context.json';
  const outputFile = process.argv[3] || '/tmp/claude-response.json';

  // --- 读取上下文 ---
  let context;
  try {
    context = JSON.parse(fs.readFileSync(contextFile, 'utf-8'));
  } catch {
    console.error('ERROR: 无法读取命令上下文');
    process.exit(1);
  }

  // --- 处理help命令（直接返回，不调API） ---
  if (context.command === 'help') {
    console.log('help命令，跳过API调用');
    const helpResponse = {
      // eslint-disable-next-line
      response: '## 🤖 @claude 命令帮助\n\n' +
        '| 命令 | 说明 |\n|------|------|\n' +
        '| `@claude review` | 审查PR全部代码变更 |\n' +
        '| `@claude review `file`` | 审查指定文件 |\n' +
        '| `@claude explain `code`` | 解释代码片段 |\n' +
        '| `@claude suggest` | 提供代码改进建议 |\n' +
        '| `@claude security` | 深度安全审查 |\n' +
        '| `@claude help` | 显示此帮助 |',
      command: 'help',
      isHelp: true,
    };
    fs.writeFileSync(outputFile, JSON.stringify(helpResponse, null, 2));
    process.exit(0);
  }

  // --- 检查API Key ---
  if (!ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY 未设置');
    const fallback = {
      response: '⚠️ Claude AI 未配置（缺少 ANTHROPIC_API_KEY），请联系仓库管理员设置密钥。',
      command: context.command,
      error: 'NO_API_KEY',
    };
    fs.writeFileSync(outputFile, JSON.stringify(fallback, null, 2));
    process.exit(1);
  }

  // --- 读取PR diff ---
  const diffContent = readDiff(context.diffFile || '/tmp/pr_diff.txt');

  // --- 构建prompt ---
  const systemPrompt = SYSTEM_PROMPTS[context.command] || SYSTEM_PROMPTS.review;
  const userPrompt = buildUserPrompt(context, diffContent);

  console.log(`命令: ${context.command}, prompt长度: ${userPrompt.length}`);

  // --- 调用 Anthropic API ---
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
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`API错误 HTTP ${response.status}: ${errText}`);
      const fallback = {
        response: `⚠️ Claude API调用失败 (HTTP ${response.status})，请稍后重试。\n\n错误详情: ${errText.substring(0, 200)}`,
        command: context.command,
        error: `HTTP_${response.status}`,
      };
      fs.writeFileSync(outputFile, JSON.stringify(fallback, null, 2));
      process.exit(1);
    }

    const data = await response.json();
    const replyText = data.content?.[0]?.text || '（空响应）';

    const result = {
      response: replyText,
      command: context.command,
      model: CLAUDE_MODEL,
      usage: data.usage || null,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Claude回复长度: ${replyText.length}, tokens: ${JSON.stringify(data.usage)}`);

  } catch (err) {
    console.error(`API调用异常: ${err.message}`);
    const fallback = {
      response: `⚠️ Claude API调用异常: ${err.message}`,
      command: context.command,
      error: 'NETWORK_ERROR',
    };
    fs.writeFileSync(outputFile, JSON.stringify(fallback, null, 2));
    process.exit(1);
  }
}

main();
