'use client';
/**
 * posture-corrector.tsx — AI 姿势纠正建议组件
 * 检测到姿势问题时，通过 API Route 代理调用 DeepSeek 获取建议
 */
import { useState, useCallback, useRef } from 'react';
import type { PostureIssue } from '@/types/pose';
import { AI_REQUEST_DEBOUNCE_MS } from '@/constants/training';

interface PostureCorrectorProps {
  issues: PostureIssue[];
  onSuggestion?: (issue: PostureIssue, suggestion: string) => void;
}

export function PostureCorrector({ issues, onSuggestion }: PostureCorrectorProps) {
  const [loading, setLoading] = useState(false);
  const lastRequestRef = useRef<Record<string, number>>({});

  const fetchSuggestion = useCallback(async (issue: PostureIssue) => {
    const now = Date.now();
    const lastTime = lastRequestRef.current[issue.type] || 0;
    if (now - lastTime < AI_REQUEST_DEBOUNCE_MS) return; // 5秒内去重

    lastRequestRef.current[issue.type] = now;
    setLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postureIssue: issue.type,
          severity: issue.severity,
          description: issue.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSuggestion?.(issue, data.suggestion);
      }
    } catch {
      // API 不可用时静默
    } finally {
      setLoading(false);
    }
  }, [onSuggestion]);

  if (issues.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/70 text-white rounded-lg p-3 max-w-xs text-sm z-10">
      <p className="font-bold mb-2">⚠️ 姿势提醒</p>
      {issues.map((issue, i) => (
        <div key={i} className="mb-2 border-b border-white/20 pb-1 last:border-0">
          <p>{issue.description}</p>
          {issue.suggestion ? (
            <p className="text-green-300 mt-1">{issue.suggestion}</p>
          ) : (
            <button
              className="text-blue-300 underline text-xs mt-1"
              onClick={() => fetchSuggestion(issue)}
              disabled={loading}
            >
              {loading ? '获取建议中...' : '查看AI纠正建议'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
