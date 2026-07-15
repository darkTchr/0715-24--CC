/** 训练动作类型 */
export type ExerciseType =
  | 'quick_contract'    // 快速收缩：1秒收→1秒放
  | 'sustain_contract'  // 持续收缩：收住保持N秒→放松
  | 'ladder_contract'   // 阶梯收缩：逐步加强→保持→逐步放松
  | 'pulse_contract';   // 脉冲收缩：快速连续收放

/** 训练阶段 */
export type TrainingPhase =
  | 'prepare'    // 准备：倒计时3-2-1
  | 'contract'   // 收缩
  | 'hold'       // 保持
  | 'relax'      // 放松
  | 'rest'       // 组间休息
  | 'complete';  // 完成

/** 呼吸引导 */
export type BreathPhase =
  | 'inhale'    // 吸气
  | 'hold_in'   // 屏气（收缩时）
  | 'exhale';   // 呼气（放松时）

/** 难度级别 */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** 性别 */
export type Gender = 'male' | 'female';

/** 单节动作定义 */
export interface ExerciseStep {
  /** 动作类型 */
  type: ExerciseType;
  /** 该动作持续秒数 */
  durationSeconds: number;
  /** 收缩秒数（sustain/ladder 用） */
  contractSeconds?: number;
  /** 保持秒数 */
  holdSeconds?: number;
  /** 放松秒数 */
  relaxSeconds?: number;
  /** 重复次数 */
  repeats: number;
  /** 语音播报文本 */
  voicePrompt: string;
}

/** 训练课程 */
export interface TrainingCourse {
  /** 课程ID */
  id: string;
  /** 课程名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 适用性别 */
  gender: Gender;
  /** 难度 */
  difficulty: Difficulty;
  /** 总时长（秒） */
  totalDurationSeconds: number;
  /** 动作步骤列表 */
  steps: ExerciseStep[];
  /** 组间休息秒数 */
  restBetweenSets: number;
}

/** 单次训练记录 */
export interface TrainingRecord {
  /** 记录ID */
  id: string;
  /** 课程ID */
  courseId: string;
  /** 开始时间 ISO */
  startedAt: string;
  /** 完成时间 ISO */
  completedAt: string;
  /** 是否完成 */
  completed: boolean;
  /** 完成百分比 */
  completionRate: number;
  /** 姿势问题次数（训练中检测到的） */
  postureIssues: number;
  /** 走神次数 */
  distractionCount: number;
}

/** 训练进行中状态 */
export interface TrainingState {
  /** 是否正在训练 */
  isActive: boolean;
  /** 当前课程 */
  course: TrainingCourse | null;
  /** 当前步骤索引 */
  currentStepIndex: number;
  /** 当前重复次数（当前步骤内） */
  currentRepeat: number;
  /** 当前阶段 */
  phase: TrainingPhase;
  /** 当前呼吸阶段 */
  breathPhase: BreathPhase;
  /** 阶段剩余秒数 */
  phaseRemainingSeconds: number;
  /** 总已过秒数 */
  elapsedSeconds: number;
  /** 暂停中 */
  isPaused: boolean;
}
