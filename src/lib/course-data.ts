/**
 * course-data.ts — 训练课程数据定义
 * 按性别和难度分级，支持灵活扩展新动作类型
 */
import type { TrainingCourse, Gender, Difficulty } from '@/types/training';

/** 所有训练课程 */
export const TRAINING_COURSES: TrainingCourse[] = [
  // ===== 女性课程 =====
  // --- 初级 ---
  {
    id: 'female-beginner-1',
    name: '基础入门',
    description: '适合初次接触盆底肌训练的用户，从基础的快速收缩开始学习',
    gender: 'female',
    difficulty: 'beginner',
    totalDurationSeconds: 300, // 5分钟
    restBetweenSets: 10,
    steps: [
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '快速收缩，1秒收紧，1秒放松',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 60,
        contractSeconds: 3,
        relaxSeconds: 3,
        repeats: 10,
        voicePrompt: '收紧保持3秒，然后放松3秒',
      },
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '再来一组快速收缩',
      },
    ],
  },
  // --- 中级 ---
  {
    id: 'female-intermediate-1',
    name: '耐力提升',
    description: '延长持续收缩时间，增强盆底肌耐力',
    gender: 'female',
    difficulty: 'intermediate',
    totalDurationSeconds: 600, // 10分钟
    restBetweenSets: 15,
    steps: [
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '热身：快速收缩30次',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 120,
        contractSeconds: 5,
        relaxSeconds: 5,
        repeats: 12,
        voicePrompt: '收紧保持5秒，放松5秒',
      },
      {
        type: 'ladder_contract',
        durationSeconds: 90,
        contractSeconds: 3,
        holdSeconds: 2,
        relaxSeconds: 2,
        repeats: 10,
        voicePrompt: '阶梯收缩：逐步加强，保持，逐步放松',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 120,
        contractSeconds: 8,
        relaxSeconds: 4,
        repeats: 10,
        voicePrompt: '长时保持8秒，放松4秒',
      },
    ],
  },
  // --- 高级 ---
  {
    id: 'female-advanced-1',
    name: '综合强化',
    description: '融合多种收缩模式，全面强化盆底肌力量与控制力',
    gender: 'female',
    difficulty: 'advanced',
    totalDurationSeconds: 900, // 15分钟
    restBetweenSets: 20,
    steps: [
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '热身快收30次',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 180,
        contractSeconds: 10,
        relaxSeconds: 5,
        repeats: 12,
        voicePrompt: '收紧保持10秒，放松5秒',
      },
      {
        type: 'pulse_contract',
        durationSeconds: 120,
        contractSeconds: 0.5,
        relaxSeconds: 0.5,
        repeats: 120,
        voicePrompt: '脉冲收缩：快速连续收放',
      },
      {
        type: 'ladder_contract',
        durationSeconds: 150,
        contractSeconds: 5,
        holdSeconds: 3,
        relaxSeconds: 3,
        repeats: 12,
        voicePrompt: '阶梯收缩：逐步加力到最大，保持，缓慢放松',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 180,
        contractSeconds: 15,
        relaxSeconds: 5,
        repeats: 9,
        voicePrompt: '极限保持15秒，专注控制力',
      },
    ],
  },

  // ===== 男性课程 =====
  // --- 初级 ---
  {
    id: 'male-beginner-1',
    name: '基础入门',
    description: '适合初次接触盆底肌训练的男性用户',
    gender: 'male',
    difficulty: 'beginner',
    totalDurationSeconds: 300,
    restBetweenSets: 10,
    steps: [
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '快速收缩，收紧1秒放松1秒',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 60,
        contractSeconds: 3,
        relaxSeconds: 3,
        repeats: 10,
        voicePrompt: '收紧保持3秒，放松3秒',
      },
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '最后一组快速收缩',
      },
    ],
  },
  // --- 中级 ---
  {
    id: 'male-intermediate-1',
    name: '力量增强',
    description: '增强盆底肌力量和控制能力',
    gender: 'male',
    difficulty: 'intermediate',
    totalDurationSeconds: 600,
    restBetweenSets: 15,
    steps: [
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '热身快收30次',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 150,
        contractSeconds: 8,
        relaxSeconds: 4,
        repeats: 12,
        voicePrompt: '收紧保持8秒，放松4秒',
      },
      {
        type: 'pulse_contract',
        durationSeconds: 90,
        contractSeconds: 0.5,
        relaxSeconds: 0.5,
        repeats: 90,
        voicePrompt: '脉冲收缩90次',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 120,
        contractSeconds: 10,
        relaxSeconds: 5,
        repeats: 8,
        voicePrompt: '长时保持10秒',
      },
    ],
  },
  // --- 高级 ---
  {
    id: 'male-advanced-1',
    name: '巅峰控制',
    description: '高难度综合训练，提升极限控制力',
    gender: 'male',
    difficulty: 'advanced',
    totalDurationSeconds: 900,
    restBetweenSets: 20,
    steps: [
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 1,
        relaxSeconds: 1,
        repeats: 30,
        voicePrompt: '热身快收',
      },
      {
        type: 'ladder_contract',
        durationSeconds: 180,
        contractSeconds: 5,
        holdSeconds: 3,
        relaxSeconds: 3,
        repeats: 15,
        voicePrompt: '阶梯收缩，逐级加力',
      },
      {
        type: 'pulse_contract',
        durationSeconds: 150,
        contractSeconds: 0.5,
        relaxSeconds: 0.5,
        repeats: 150,
        voicePrompt: '高频脉冲收缩',
      },
      {
        type: 'sustain_contract',
        durationSeconds: 240,
        contractSeconds: 15,
        relaxSeconds: 5,
        repeats: 12,
        voicePrompt: '极限保持15秒',
      },
      {
        type: 'quick_contract',
        durationSeconds: 60,
        holdSeconds: 0.5,
        relaxSeconds: 0.5,
        repeats: 60,
        voicePrompt: '终极快收冲刺',
      },
    ],
  },
];

/** 按条件筛选课程 */
export function getCoursesByFilter(gender: Gender, difficulty: Difficulty): TrainingCourse[] {
  return TRAINING_COURSES.filter(c => c.gender === gender && c.difficulty === difficulty);
}

/** 按ID获取课程 */
export function getCourseById(id: string): TrainingCourse | undefined {
  return TRAINING_COURSES.find(c => c.id === id);
}

/** 获取全部课程 */
export function getAllCourses(): TrainingCourse[] {
  return TRAINING_COURSES;
}
