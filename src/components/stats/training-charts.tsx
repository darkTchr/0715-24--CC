'use client';
/**
 * training-charts.tsx — 训练统计图表
 * 使用 Recharts 渲染时长趋势、完成率等
 */
import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import type { TrainingRecord } from '@/types/training';
import type { StatsSummary } from '@/lib/stats';

interface TrainingChartsProps {
  records: TrainingRecord[];
  summary: StatsSummary;
}

const PIE_COLORS = ['#4CAF50', '#FF9800', '#F44336'];

export function TrainingCharts({ records, summary }: TrainingChartsProps) {
  // 近30天训练时长趋势
  const trendData = useMemo(() => {
    const completed = records.filter(r => r.completed);
    const map = new Map<string, number>();
    completed.forEach(r => {
      const date = r.startedAt.substring(0, 10);
      const dur = (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 60000;
      map.set(date, (map.get(date) || 0) + dur);
    });

    const result: { date: string; minutes: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().substring(0, 10);
      result.push({ date: key.substring(5), minutes: Math.round(map.get(key) || 0) });
    }
    return result;
  }, [records]);

  // 完成率分布
  const completionData = useMemo(() => {
    const high = records.filter(r => r.completionRate >= 80).length;
    const mid = records.filter(r => r.completionRate >= 40 && r.completionRate < 80).length;
    const low = records.filter(r => r.completionRate < 40).length;
    return [
      { name: '高完成(≥80%)', value: high },
      { name: '中完成(40-80%)', value: mid },
      { name: '低完成(<40%)', value: low },
    ].filter(d => d.value > 0);
  }, [records]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="总训练次数" value={summary.totalSessions} unit="次" />
        <StatCard label="总训练时长" value={summary.totalMinutes} unit="分钟" />
        <StatCard label="平均完成率" value={summary.avgCompletionRate} unit="%" />
        <StatCard label="连续打卡" value={summary.currentStreak} unit="天" />
      </div>

      {/* 训练时长趋势 */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-2">近30天训练时长</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="minutes" stroke="#4FC3F7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 完成率分布 */}
      {completionData.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">完成率分布</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={completionData}
                cx="50%" cy="50%"
                innerRadius={40} outerRadius={70}
                dataKey="value" nameKey="name"
              >
                {completionData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-800">
        {value}<span className="text-sm text-gray-400 ml-1">{unit}</span>
      </p>
    </div>
  );
}
