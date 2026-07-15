#!/usr/bin/env node
/**
 * parse-claude-command.js — 解析 GitHub PR 评论中的 @claude 命令
 * 用法: node parse-claude-command.js <diff_file> <output_json>
 * 输出: JSON { command, args, prContext, commentBody, commentId }
 *
 * 环境变量（由 workflow 传入）:
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER
 *   COMMENT_BODY, COMMENT_ID  — 来自 github.event.comment
 */

const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;
const COMMENT_BODY = process.env.COMMENT_BODY;
const COMMENT_ID = process.env.COMMENT_ID;

const GITHUB_API_BASE = 'https://api.github.com';

/** 解析 @claude 命令 */
function parseCommand(commentBody) {
  if (!commentBody) return { command: 'help', args: '', rawCommand: '@claude help' };

  const match = commentBody.match(/@claude\s+(\w+)([\s\S]*)/i);
  if (!match) return { command: 'help', args: '', rawCommand: '@claude help' };

  const command = match[1].toLowerCase();
  const args = match[2].trim();

  const validCommands = ['review', 'explain', 'suggest', 'security', 'help'];
  if (!validCommands.includes(command)) {
    return { command: 'help', args: `未知命令: ${command}`, rawCommand: match[0].trim() };
  }

  return { command, args, rawCommand: match[0].trim() };
}

/** 从评论中提取代码块 */
function extractCodeBlocks(commentBody) {
  const blocks = [];
  const regex = /```(\w*)\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(commentBody || '')) !== null) {
    blocks.push({ language: m[1] || 'text', code: m[2].trim() });
  }
  return blocks;
}

/** 从评论中提取文件引用 */
function extractFileRefs(commentBody) {
  const refs = [];
  const regex = /`([^`]+\.(ts|tsx|js|jsx|css|json|yml|yaml))`/gi;
  let m;
  while ((m = regex.exec(commentBody || '')) !== null) {
    refs.push(m[1]);
  }
  return [...new Set(refs)];
}

async function main() {
  const diffFile = process.argv[2] || '/tmp/pr_diff.txt';
  const outputFile = process.argv[3] || '/tmp/command-context.json';

  const commentBody = COMMENT_BODY || '@claude help';
  const commentId = COMMENT_ID || null;

  // 解析命令
  const parsed = parseCommand(commentBody);
  console.log(`命令: @claude ${parsed.command}${parsed.args ? ' ' + parsed.args.substring(0, 50) : ''}`);

  // 提取上下文
  const codeBlocks = extractCodeBlocks(commentBody);
  const fileRefs = extractFileRefs(commentBody);

  // 读取 PR diff
  let prDiff = '';
  try {
    prDiff = fs.readFileSync(diffFile, 'utf-8');
  } catch {
    console.warn('WARN: 无法读取 PR diff');
  }

  // 提取变更文件列表
  let changedFiles = [];
  if (prDiff) {
    const fileMatch = prDiff.match(/^diff --git a\/(.+) b\/(.+)/gm);
    if (fileMatch) {
      changedFiles = fileMatch.map(m => {
        const parts = m.match(/b\/(.+)/);
        return parts ? parts[1] : '';
      }).filter(Boolean);
    }
  }

  // 构建上下文
  const context = {
    command: parsed.command,
    args: parsed.args,
    rawCommand: parsed.rawCommand,
    prId: PR_NUMBER || null,
    repo: GITHUB_REPOSITORY || '',
    commentId,
    commentBody: commentBody.substring(0, 2000),
    codeBlocks,
    fileRefs,
    changedFiles,
    prDiffSize: prDiff.length,
    diffFile,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(outputFile, JSON.stringify(context, null, 2));
  console.log(`上下文写入: ${outputFile}`);
  console.log(`命令=${parsed.command}, 文件引用=${fileRefs.length}, 代码块=${codeBlocks.length}`);

  process.exit(0);
}

main();
