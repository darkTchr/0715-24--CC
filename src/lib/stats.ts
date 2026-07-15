/**
 * stats.ts — 训练统计计算
 * 打卡热力图、时长趋势、完成率、连续打卡等
 */
import type { TrainingRecord } from '@/types/training';
import { STORAGE_KEYS } from '@/constants/training';

/** 统计摘要 */
export interface StatsSummary {
  /** 总训练次数 */
  totalSessions: number;
  /** 总训练分钟数 */
  totalMinutes: number;
  /** 平均完成率 */
  avgCompletionRate: number;
  /** 当前连续打卡天数 */
  currentStreak: number;
  /** 最长连续打卡天数 */
  maxStreak: number;
  /** 本月训练天数 */
  daysThisMonth: number;
}

/** 每日打卡数据 */
export interface DailyCheckin {
  date: string; // YYYY-MM-DD
  count: number; // 当天训练次数
  minutes: number; // 当天训练分钟数
}

/** 从 localStorage 加载训练记录 */
export function loadRecords(): TrainingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.trainingRecords);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存训练记录 */
export function saveRecords(records: TrainingRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.trainingRecords, JSON.stringify(records));
}

/** 添加一条训练记录 */
export function addRecord(record: TrainingRecord): void {
  const records = loadRecords();
  records.push(record);
  saveRecords(records);
}

/** 计算统计摘要 */
export function computeStatsSummary(records: TrainingRecord[]): StatsSummary {
  const completed = records.filter(r => r.completed);
  const totalSessions = completed.length;
  const totalMinutes = completed.reduce((sum, r) => {
    const start = new Date(r.startedAt).getTime();
    const end = new Date(r.completedAt).getTime();
    return sum + (end - start) / 60000;
  }, 0);

  const avgCompletionRate = records.length > 0
    ? records.reduce((sum, r) => sum + r.completionRate, 0) / records.length
    : 0;

  // 连续打卡计算
  const { currentStreak, maxStreak } = computeStreaks(completed);
  // 本月训练天数
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysThisMonth = new Set(
    completed
      .filter(r => r.startedAt.startsWith(thisMonth))
      .map(r => r.startedAt.substring(0, 10))
  ).size;

  return {
    totalSessions,
    totalMinutes: Math.round(totalMinutes),
    avgCompletionRate: Math.round(avgCompletionRate * 100),
    currentStreak,
    maxStreak,
    daysThisMonth,
  };
}

/** 计算每日打卡数据（近365天） */
export function computeDailyCheckins(records: TrainingRecord[], days = 365): DailyCheckin[] {
  const completed = records.filter(r => r.completed);
  const dateMap = new Map<string, { count: number; minutes: number }>();

  completed.forEach(r => {
    const date = r.startedAt.substring(0, 10);
    const entry = dateMap.get(date) || { count: 0, minutes: 0 };
    const start = new Date(r.startedAt).getTime();
    const end = new Date(r.completedAt).getTime();
    entry.count += 1;
    entry.minutes += (end - start) / 60000;
    dateMap.set(date, entry);
  });

  const result: DailyCheckin[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().substring(0, 10);
    const entry = dateMap.get(dateStr);
    result.push({
      date: dateStr,
      count: entry?.count || 0,
      minutes: Math.round(entry?.minutes || 0),
    });
  }
  return result;
}

/** 计算连续打卡天数 */
function computeStreaks(completed: TrainingRecord[]): { currentStreak: number; maxStreak: number } {
  const dates = [...new Set(completed.map(r => r.startedAt.substring(0, 10)))].sort().reverse();
  if (dates.length === 0) return { currentStreak: 0, maxStreak: 0 };

  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  // 当前连续（从今天或昨天开始）
  let currentStreak = 0;
  const startDate = dates[0] === today ? today : dates[0] === yesterday ? yesterday : null;
  if (startDate) {
    let checkDate = new Date(startDate);
    for (const d of dates) {
      const expected = checkDate.toISOString().substring(0, 10);
      if (d === expected) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (d < expected) {
        break;
      }
    }
  }

  // 最长连续
  let maxStreak = 1;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }
  maxStreak = Math.max(maxStreak, currentStreak);

  return { currentStreak, maxStreak };
}
