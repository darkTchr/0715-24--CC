#!/usr/bin/env node
/**
 * post-comment.js — 将审查结果发布为 GitHub PR 评论，高危问题阻止合并
 * 用法: node post-comment.js <review_json>
 * 退出码: 0=通过, 1=存在critical/high问题（阻止合并）
 *
 * 环境变量（GitHub Actions 自动提供）:
 *   GITHUB_TOKEN     — actions 自带
 *   GITHUB_REPOSITORY — owner/repo
 *   PR_NUMBER        — 由 workflow 传入
 */

const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;

const GITHUB_API_BASE = 'https://api.github.com';

function generateCommentBody(result) {
  const { summary, findings, _counts } = result;
  const counts = _counts || { critical: 0, high: 0, medium: 0, low: 0 };

  const emoji = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🟢',
    security: '🔒', logic: '🧠', performance: '⚡', maintainability: '🔧',
  };

  const totalIssues = Object.values(counts).reduce((a, b) => a + b, 0);

  let body = '## 🤖 Claude Code Review 审查报告\n\n';
  body += `> **总结**: ${summary}\n\n`;
  body += `| 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low |\n`;
  body += `|---|---|---|---|\n`;
  body += `| ${counts.critical || 0} | ${counts.high || 0} | ${counts.medium || 0} | ${counts.low || 0} |\n\n`;

  if (!findings || findings.length === 0) {
    body += '### ✅ 未发现问题\n\n代码质量良好，无改进建议。\n';
    return body;
  }

  body += '---\n\n';

  const criticals = findings.filter(f => f.severity === 'critical');
  const highs = findings.filter(f => f.severity === 'high');
  const others = findings.filter(f => f.severity !== 'critical' && f.severity !== 'high');

  if (criticals.length > 0) {
    body += '### 🔴 严重问题（必须修复）\n\n';
    criticals.forEach((f, i) => {
      body += `**${i + 1}. ${f.description}**\n`;
      body += `- 📁 \`${f.file || 'N/A'}\` | ${emoji[f.category] || ''} ${f.category}\n`;
      body += `- 💡 ${f.suggestion}\n\n`;
    });
  }

  if (highs.length > 0) {
    body += '### 🟠 高优先级问题（应该修复）\n\n';
    highs.forEach((f, i) => {
      body += `**${i + 1}. ${f.description}**\n`;
      body += `- 📁 \`${f.file || 'N/A'}\` | ${emoji[f.category] || ''} ${f.category}\n`;
      body += `- 💡 ${f.suggestion}\n\n`;
    });
  }

  if (others.length > 0) {
    body += `<details>\n<summary>📋 其他建议 (${others.length}条)</summary>\n\n`;
    others.forEach((f, i) => {
      body += `**${i + 1}.** ${emoji[f.severity] || ''} ${f.description}\n`;
      body += `- 📁 \`${f.file || 'N/A'}\`\n`;
      body += `- 💡 ${f.suggestion}\n\n`;
    });
    body += '</details>\n\n';
  }

  body += '---\n';
  body += `> 审查模型: ${result._model || 'Claude'} | 共 ${totalIssues} 条发现\n`;
  body += '> 评论 `@claude review` 重新审查\n';

  return body;
}

async function main() {
  const reviewFile = process.argv[2] || '/tmp/review-result.json';

  if (!GITHUB_TOKEN) {
    console.error('ERROR: GITHUB_TOKEN 未设置');
    process.exit(1);
  }

  let result;
  try {
    result = JSON.parse(fs.readFileSync(reviewFile, 'utf-8'));
  } catch {
    console.error('ERROR: 无法读取审查结果');
    process.exit(1);
  }

  const commentBody = generateCommentBody(result);

  // 发布评论到 PR
  if (PR_NUMBER && GITHUB_REPOSITORY) {
    try {
      const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ body: commentBody }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`评论发布成功: ${data.html_url}`);
      } else {
        const errText = await response.text();
        console.warn(`WARN: 评论发布失败 HTTP ${response.status}: ${errText.substring(0, 300)}`);
        console.log('=== 审查报告（控制台输出）===');
        console.log(commentBody);
      }
    } catch (err) {
      console.warn(`WARN: API调用失败: ${err.message}`);
      console.log(commentBody);
    }
  } else {
    console.log(commentBody);
  }

  // 高危问题阻止合并
  const blockingCount = (result.findings || []).filter(
    f => f.severity === 'critical' || f.severity === 'high'
  ).length;

  if (blockingCount > 0) {
    console.error(`\n::error::发现 ${blockingCount} 个高危问题，请修复后重新提交`);
    process.exit(1);
  }

  console.log('审查通过，无阻止性问题');
  process.exit(0);
}

main();
