#!/usr/bin/env python3

import json
from pathlib import Path
from collections import Counter
from datetime import datetime, timedelta

def analyze_audit_logs(log_dir: str, days: int = 7):
    """分析最近N天的审计日志"""

    log_path = Path(log_dir)
    cutoff = datetime.now() - timedelta(days=days)

    stats = {
        "total_events": 0,
        "tool_usage": Counter(),
        "denied_access": [],
        "errors": [],
        "users": Counter(),
        "sensitive_access": []
    }

    for log_file in log_path.glob("*.json"):
        try:
            file_date = datetime.strptime(log_file.stem, "%Y-%m-%d")
            if file_date < cutoff:
                continue

            with open(log_file) as f:
                data = json.load(f)

            for entry in data.get("entries", []):
                stats["total_events"] += 1
                stats["tool_usage"][entry.get("tool", "unknown")] += 1
                stats["users"][entry.get("userId", "unknown")] += 1

                if entry.get("status") == "blocked":
                    stats["denied_access"].append(entry)

                if entry.get("event") == "error":
                    stats["errors"].append(entry)

        except Exception as e:
            print(f"Error processing {log_file}: {e}")

    return stats

def generate_report(stats: dict) -> str:
    """生成审计报告"""

    report = []
    report.append("=" * 60)
    report.append("Claude Code 审计报告")
    report.append("=" * 60)
    report.append("")

    report.append(f"总事件数：{stats['total_events']}")
    report.append("")

    report.append("工具使用统计：")
    for tool, count in stats["tool_usage"].most_common(10):
        report.append(f"  - {tool}: {count}次")
    report.append("")

    report.append("用户活动统计：")
    for user, count in stats["users"].most_common(10):
        report.append(f"  - {user}: {count}次")
    report.append("")

    if stats["denied_access"]:
        report.append(f"权限拒绝事件：{len(stats['denied_access'])}次")
        for entry in stats["denied_access"][:5]:
            report.append(f"  - {entry['timestamp']}: {entry.get('path', 'N/A')}")
    report.append("")

    if stats["errors"]:
        report.append(f"错误事件：{len(stats['errors'])}次")
        for entry in stats["errors"][:5]:
            report.append(f"  - {entry['timestamp']}: {entry.get('message', 'N/A')}")

    return "\n".join(report)

if __name__ == "__main__":
    import sys
    log_dir = sys.argv[1] if len(sys.argv) > 1 else "./logs/claude-audit/"
    stats = analyze_audit_logs(log_dir)
    print(generate_report(stats))