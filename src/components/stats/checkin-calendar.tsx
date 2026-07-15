'use client';
/**
 * checkin-calendar.tsx — 打卡日历热力图（类似 GitHub 贡献图）
 * 使用 Recharts 渲染年度训练热力分布
 */
import { useMemo } from 'react';
import type { DailyCheckin } from '@/lib/stats';

interface CheckinCalendarProps {
  data: DailyCheckin[];
  year?: number;
}

/** 根据训练分钟数返回颜色等级 0-4 */
function getColorLevel(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 5) return 1;
  if (minutes < 15) return 2;
  if (minutes < 30) return 3;
  return 4;
}

const COLOR_CLASSES = [
  'bg-gray-100',       // 0: 无训练
  'bg-green-200',      // 1: <5分钟
  'bg-green-400',      // 2: 5-15分钟
  'bg-green-600',      // 3: 15-30分钟
  'bg-green-800',      // 4: >=30分钟
];

export function CheckinCalendar({ data }: CheckinCalendarProps) {
  // 按周分组
  const weeks = useMemo(() => {
    const result: DailyCheckin[][] = [];
    let currentWeek: DailyCheckin[] = [];

    data.forEach((day, i) => {
      currentWeek.push(day);
      const date = new Date(day.date);
      if (date.getDay() === 6 || i === data.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [data]);

  const months = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;
    data.forEach((day, i) => {
      const m = new Date(day.date).getMonth();
      if (m !== lastMonth) {
        labels.push({ label: `${m + 1}月`, index: i });
        lastMonth = m;
      }
    });
    return labels;
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 mb-2 ml-8">
        {months.map((m, i) => (
          <span
            key={i}
            className="text-xs text-gray-400"
            style={{ marginLeft: m.index > 0 ? `${m.index * 1.4}rem` : 0 }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={`${wi}-${di}`}
                className={`w-3.5 h-3.5 rounded-sm ${COLOR_CLASSES[getColorLevel(day.minutes)]}`}
                title={`${day.date}: ${day.minutes}分钟`}
              />
            ))}
          </div>
        ))}
      </div>
      {/* 图例 */}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 justify-end">
        <span>少</span>
        {COLOR_CLASSES.map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
