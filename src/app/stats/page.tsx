'use client';
/**
 * stats/page.tsx — 训练统计页面
 * 打卡热力图 + 趋势图表 + 统计摘要
 */
import { useState, useMemo } from 'react';
import type { TrainingRecord } from '@/types/training';
import type { DailyCheckin, StatsSummary } from '@/lib/stats';
import { loadRecords, computeStatsSummary, computeDailyCheckins } from '@/lib/stats';
import { CheckinCalendar } from '@/components/stats/checkin-calendar';
import { TrainingCharts } from '@/components/stats/training-charts';

export default function StatsPage() {
  const [records] = useState<TrainingRecord[]>(() => loadRecords());

  const summary: StatsSummary = useMemo(() => computeStatsSummary(records), [records]);
  const dailyData: DailyCheckin[] = useMemo(() => computeDailyCheckins(records), [records]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <span className="text-6xl mb-4">📊</span>
        <p>还没有训练记录</p>
        <a href="/train" className="text-blue-500 mt-2">开始第一次训练 →</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">训练统计</h1>

      {/* 打卡热力图 */}
      <section>
        <h2 className="text-lg font-medium mb-3">训练日历</h2>
        <CheckinCalendar data={dailyData} />
      </section>

      {/* 图表 */}
      <section>
        <h2 className="text-lg font-medium mb-3">数据概览</h2>
        <TrainingCharts records={records} summary={summary} />
      </section>

      {/* 最近记录 */}
      <section>
        <h2 className="text-lg font-medium mb-3">最近训练</h2>
        <div className="space-y-2">
          {records.slice(-10).reverse().map(r => (
            <div key={r.id} className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  {new Date(r.startedAt).toLocaleDateString('zh-CN')}
                </p>
                <p className="text-xs text-gray-300">{r.courseId}</p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium ${r.completed ? 'text-green-600' : 'text-orange-500'}`}>
                  {r.completionRate}%
                </span>
                {r.postureIssues > 0 && (
                  <p className="text-xs text-gray-400">{r.postureIssues}次姿势提醒</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
