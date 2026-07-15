/** 训练参数常量（所有动画/语音同步的基准） */

/** 姿势检测置信度阈值 */
export const POSE_CONFIDENCE_THRESHOLD = 0.7;

/** 姿势检测间隔 ms */
export const POSE_DETECTION_INTERVAL_MS = 200;

/** 同一姿势问题不重复请求 AI 的间隔 ms */
export const AI_REQUEST_DEBOUNCE_MS = 5000;

/** 最大训练时长 秒 */
export const MAX_TRAINING_DURATION = 3600;

/** 语音播报队列最大长度 */
export const SPEECH_QUEUE_MAX = 3;

// ---------- 动画参数 ----------

/** 呼吸圈基础缩放比例 */
export const BREATHING_CIRCLE_SCALE = {
  inhale: 1.4,    // 吸气放大
  hold_in: 1.4,   // 屏气保持
  exhale: 0.8,    // 呼气缩小
} as const;

/** 呼吸圈颜色 */
export const BREATHING_CIRCLE_COLORS = {
  inhale: '#4FC3F7',     // 蓝
  hold_in: '#7C4DFF',    // 紫
  exhale: '#66BB6A',     // 绿
} as const;

/** 呼吸圈过渡时长 ms */
export const BREATHING_TRANSITION_MS = 300;

/** 准备倒计时秒数 */
export const PREPARE_COUNTDOWN_SECONDS = 3;

/** 训练节奏检查容差 ms */
export const SYNC_TOLERANCE_MS = 50;

// ---------- 姿势分析阈值 ----------

/** 驼背：肩-髋连线与垂直线的最大角度（度） */
export const HUNCHBACK_ANGLE_THRESHOLD = 15;

/** 耸肩：耳-肩距离占身高比例阈值 */
export const SHOULDER_RAISE_RATIO = 0.06;

/** 身体歪斜：左右肩高差占肩宽比例 */
export const BODY_TILT_RATIO = 0.05;

// ---------- 存储 Key ----------

export const STORAGE_KEYS = {
  trainingRecords: 'tg_training_records',
  settings: 'tg_settings',
  stats: 'tg_stats',
} as const;
