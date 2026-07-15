#!/usr/bin/env node
/**
 * post-security-report.js — 发布安全报告到 GitHub PR 评论
 * 用法: node post-security-report.js <npm_report_json> <claude_report_json>
 *
 * 环境变量（GitHub Actions 自动提供）:
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER
 */

const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;

const GITHUB_API_BASE = 'https://api.github.com';

function generateReport(npmReport, claudeReport) {
  let body = '## 🔒 安全扫描报告\n\n';

  // npm audit 摘要
  if (npmReport && npmReport.summary) {
    body += '### 📦 依赖漏洞 (npm audit)\n\n';
    body += '| 严重程度 | 数量 |\n|---|---|\n';
    const s = npmReport.summary;
    body += `| 🔴 Critical | ${s.critical || 0} |\n`;
    body += `| 🟠 High | ${s.high || 0} |\n`;
    body += `| 🟡 Moderate | ${s.moderate || 0} |\n`;
    body += `| 🟢 Low | ${s.low || 0} |\n\n`;

    const blocking = npmReport.blocking || [];
    if (blocking.length > 0) {
      body += '**⚠️ 需立即修复：**\n\n';
      blocking.forEach(v => {
        body += `- \`${v.package}\` — ${v.severity}`;
        if (v.recommendation) body += ` (${v.recommendation})`;
        body += '\n';
      });
      body += '\n';
    } else {
      body += '✅ 未发现高危依赖漏洞\n\n';
    }
  }

  // Claude 安全审查
  if (claudeReport && claudeReport.findings) {
    body += '### 🧠 AI 深度安全分析\n\n';
    body += `**风险等级**: ${claudeReport.riskLevel || 'unknown'}\n\n`;
    body += `**总结**: ${claudeReport.summary || '无'}\n\n`;

    const findings = (claudeReport.findings || []).filter(f => !f.bypass);
    if (findings.length > 0) {
      findings.forEach((f, i) => {
        const sev = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : '🟡';
        body += `**${i + 1}.** ${sev} ${f.description}\n`;
        body += `- CWE: ${f.cwe || 'N/A'} | 📁 \`${f.file || 'N/A'}\`\n`;
        body += `- 攻击场景: ${f.attackScenario || 'N/A'}\n`;
        body += `- 修复: ${f.fix || 'N/A'}\n\n`;
      });
    } else {
      body += '✅ 未发现代码级安全问题\n\n';
    }
  }

  body += '---\n> 安全扫描由 GitHub Actions + Claude AI 自动完成\n';
  return body;
}

async function main() {
  const npmFile = process.argv[2] || '/tmp/security-report.json';
  const claudeFile = process.argv[3] || '/tmp/claude-security.json';

  let npmReport = null;
  let claudeReport = null;

  try { npmReport = JSON.parse(fs.readFileSync(npmFile, 'utf-8')); } catch {}
  try { claudeReport = JSON.parse(fs.readFileSync(claudeFile, 'utf-8')); } catch {}

  const commentBody = generateReport(npmReport, claudeReport);

  // 发布评论
  if (PR_NUMBER && GITHUB_TOKEN && GITHUB_REPOSITORY) {
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
        console.log(`安全报告发布成功: ${data.html_url}`);
      } else {
        const errText = await response.text();
        console.warn(`WARN: 报告发布失败 HTTP ${response.status}: ${errText.substring(0, 300)}`);
      }
    } catch (err) {
      console.warn(`WARN: API 调用失败: ${err.message}`);
    }
  }

  // 始终输出到控制台
  console.log(commentBody);

  // 高危问题阻止合并
  const blockingNpm = (npmReport?.blocking || []).length;
  const blockingClaude = (claudeReport?.findings || []).filter(
    f => !f.bypass && (f.severity === 'critical' || f.severity === 'high')
  ).length;

  if (blockingNpm > 0 || blockingClaude > 0) {
    console.error(`::error::安全扫描发现问题: npm依赖=${blockingNpm} AI审查=${blockingClaude}`);
    process.exit(1);
  }

  console.log('安全扫描通过');
  process.exit(0);
}

main();
