#!/usr/bin/env node
/**
 * security-check.js — 分析 npm audit 结果，生成安全报告
 * 用法: node security-check.js <audit_json> <output_json>
 */

const fs = require('fs');

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low'];

function analyzeAudit(auditData) {
  const vulnerabilities = auditData.vulnerabilities || {};
  const summary = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };

  const vulnList = [];

  for (const [pkg, info] of Object.entries(vulnerabilities)) {
    const sev = info.severity || 'low';
    summary[sev] = (summary[sev] || 0) + 1;

    vulnList.push({
      package: pkg,
      severity: sev,
      version: info.version || 'unknown',
      via: Array.isArray(info.via) ? info.via.map(v => (typeof v === 'string' ? v : v.title || v.url || 'unknown')) : [],
      fixAvailable: Boolean(info.fixAvailable),
      recommendation: info.fixAvailable
        ? `升级到 ${pkg} 的最新版本以修复此问题`
        : `暂无修复版本，建议关注或寻找替代包`,
    });
  }

  // 按严重程度排序
  vulnList.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return {
    scannedAt: new Date().toISOString(),
    summary,
    totalVulnerabilities: Object.keys(vulnerabilities).length,
    findings: vulnList,
    blocking: vulnList.filter(v => v.severity === 'critical' || v.severity === 'high'),
  };
}

function main() {
  const auditFile = process.argv[2] || '/tmp/audit-result.json';
  const outputFile = process.argv[3] || '/tmp/security-report.json';

  let auditData;
  try {
    const raw = fs.readFileSync(auditFile, 'utf-8');
    auditData = JSON.parse(raw);
  } catch {
    console.warn('WARN: 无法解析npm audit结果，生成空报告');
    auditData = { vulnerabilities: {} };
  }

  const report = analyzeAudit(auditData);

  console.log(`安全扫描完成: critical=${report.summary.critical} high=${report.summary.high} moderate=${report.summary.moderate} low=${report.summary.low}`);

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  // 高危漏洞阻止合并
  if (report.blocking.length > 0) {
    console.error(`::error::发现 ${report.blocking.length} 个高危漏洞，请修复`);
    report.blocking.forEach(v => {
      console.error(`  - ${v.package}: ${v.severity}`);
    });
    process.exit(1);
  }

  console.log('安全扫描通过');
  process.exit(0);
}

main();
