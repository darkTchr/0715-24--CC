/** MediaPipe Pose 关键点索引 */
export type PoseLandmarkIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23
  | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32;

/** 姿势关键点名称 */
export const POSE_LANDMARK_NAMES: Record<number, string> = {
  0: 'nose', 1: 'left_eye_inner', 2: 'left_eye', 3: 'left_eye_outer',
  4: 'right_eye_inner', 5: 'right_eye', 6: 'right_eye_outer',
  7: 'left_ear', 8: 'right_ear', 9: 'left_mouth', 10: 'right_mouth',
  11: 'left_shoulder', 12: 'right_shoulder',
  13: 'left_elbow', 14: 'right_elbow',
  15: 'left_wrist', 16: 'right_wrist',
  17: 'left_pinky', 18: 'right_pinky',
  19: 'left_index', 20: 'right_index',
  21: 'left_thumb', 22: 'right_thumb',
  23: 'left_hip', 24: 'right_hip',
  25: 'left_knee', 26: 'right_knee',
  27: 'left_ankle', 28: 'right_ankle',
  29: 'left_heel', 30: 'right_heel',
  31: 'left_foot_index', 32: 'right_foot_index',
};

/** 单个关键点坐标 */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/** 姿势检测结果 */
export interface PoseResult {
  /** 33个关键点 */
  landmarks: Landmark[];
  /** 时间戳 */
  timestamp: number;
}

/** 姿势问题类型 */
export type PostureIssueType =
  | 'hunchback'      // 驼背
  | 'shoulder_raise' // 耸肩
  | 'body_tilt'      // 身体歪斜
  | 'not_neutral';   // 站姿不中立

/** 姿势问题检测结果 */
export interface PostureIssue {
  type: PostureIssueType;
  /** 严重程度 0-1 */
  severity: number;
  /** 描述文本 */
  description: string;
  /** AI 纠正建议（异步获取） */
  suggestion?: string;
}

/** 姿态分析摘要 */
export interface PostureAnalysis {
  /** 检测到的问题列表 */
  issues: PostureIssue[];
  /** 整体姿势评分 0-100 */
  overallScore: number;
  /** 是否姿势良好 */
  isGoodPosture: boolean;
  /** 分析时间戳 */
  timestamp: number;
}
