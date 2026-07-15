#!/usr/bin/env node
/**
 * reply-comment.js — 将 Claude 回复发布为 GitHub PR 评论（嵌套回复）
 * 用法: node reply-comment.js <claude_response_json>
 * 退出码: 0=成功, 1=失败
 *
 * 环境变量（GitHub Actions 自动提供）:
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER
 *   COMMENT_ID — 原始评论 ID（用于嵌套回复）
 */

const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;
const COMMENT_ID = process.env.COMMENT_ID;

const GITHUB_API_BASE = 'https://api.github.com';

/** 从上下文文件中获取原始评论 ID（降级路径） */
function getCommentIdFromContext() {
  try {
    const ctx = JSON.parse(fs.readFileSync('/tmp/command-context.json', 'utf-8'));
    return ctx.commentId || null;
  } catch {
    return null;
  }
}

/** 包装 Claude 回复 */
function formatReply(result, command) {
  const cmdLabels = {
    review: '📋 代码审查',
    explain: '📖 代码解释',
    suggest: '💡 改进建议',
    security: '🔒 安全审查',
    help: '❓ 帮助',
  };

  const label = cmdLabels[command] || '🤖 Claude 回复';
  const model = result.model || 'Claude';

  let body = `## ${label}\n\n`;
  body += result.response;
  body += `\n\n---\n`;
  body += `<sub>🤖 由 ${model} 自动生成 | 回复 \`@claude ${command}\`</sub>`;

  return body;
}

/** 回复指定评论（嵌套） */
async function replyToComment(commentId, body) {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      body,
      in_reply_to: parseInt(commentId, 10),
    }),
  });
  return response;
}

/** 发布一般评论（非嵌套） */
async function postGeneralComment(body) {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ body }),
  });
  return response;
}

async function main() {
  const responseFile = process.argv[2] || '/tmp/claude-response.json';

  if (!GITHUB_TOKEN) {
    console.error('ERROR: GITHUB_TOKEN 未设置');
    process.exit(1);
  }
  if (!PR_NUMBER) {
    console.error('ERROR: PR_NUMBER 未设置');
    process.exit(1);
  }

  let result;
  try {
    result = JSON.parse(fs.readFileSync(responseFile, 'utf-8'));
  } catch {
    console.error('ERROR: 无法读取 Claude 回复文件');
    process.exit(1);
  }

  if (!result.response) {
    console.error('ERROR: Claude 回复为空');
    process.exit(1);
  }

  const commentBody = formatReply(result, result.command || 'review');
  const replyTargetId = COMMENT_ID || getCommentIdFromContext();

  try {
    let response;

    if (replyTargetId) {
      // 尝试嵌套回复
      console.log(`尝试嵌套回复评论 #${replyTargetId}`);
      response = await replyToComment(replyTargetId, commentBody);
      if (!response.ok) {
        const err = await response.text();
        console.warn(`嵌套回复失败 (${response.status})，降级为普通评论: ${err.substring(0, 200)}`);
        response = await postGeneralComment(commentBody);
      }
    } else {
      response = await postGeneralComment(commentBody);
    }

    if (response.ok) {
      const data = await response.json();
      console.log(`评论发布成功: ${data.html_url}`);
      process.exit(0);
    } else {
      const errText = await response.text();
      console.error(`评论发布失败 HTTP ${response.status}: ${errText.substring(0, 300)}`);
      // 降级输出到控制台
      console.log('========== Claude 回复 ==========');
      console.log(commentBody);
      process.exit(1);
    }
  } catch (err) {
    console.error(`API 调用异常: ${err.message}`);
    console.log(commentBody);
    process.exit(1);
  }
}

main();
