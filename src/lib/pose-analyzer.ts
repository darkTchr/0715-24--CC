/**
 * pose-analyzer.ts — 姿势分析逻辑
 * 检测：驼背、耸肩、身体歪斜、站姿不中立
 * 纯前端计算，数据不出浏览器
 */
import type { Landmark, PostureAnalysis, PostureIssue } from '@/types/pose';
import {
  HUNCHBACK_ANGLE_THRESHOLD,
  SHOULDER_RAISE_RATIO,
  BODY_TILT_RATIO,
  POSE_CONFIDENCE_THRESHOLD,
} from '@/constants/training';

/** 获取关键点（带默认值） */
function getLm(landmarks: Landmark[], index: number): Landmark | null {
  const lm = landmarks[index];
  if (!lm || lm.visibility < POSE_CONFIDENCE_THRESHOLD) return null;
  return lm;
}

/** 计算两点距离 */
function dist(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * 检测驼背：肩髋连线与垂直线的角度
 * 11: left_shoulder, 23: left_hip（或用右侧）
 */
function detectHunchback(landmarks: Landmark[]): PostureIssue | null {
  const shoulder = getLm(landmarks, 11) || getLm(landmarks, 12);
  const hip = getLm(landmarks, 23) || getLm(landmarks, 24);
  if (!shoulder || !hip) return null;

  // 肩在髋前方过远 = 驼背
  const forwardLean = (shoulder.x - hip.x) * 100;
  const severity = Math.min(1, Math.max(0, forwardLean / HUNCHBACK_ANGLE_THRESHOLD));

  if (severity < 0.3) return null;

  return {
    type: 'hunchback',
    severity,
    description: severity > 0.6
      ? '检测到明显驼背，请挺直背部，肩部后收'
      : '上身略前倾，注意保持背部挺直',
  };
}

/**
 * 检测耸肩：耳-肩距离占肩宽比例
 * 7: left_ear, 8: right_ear, 11: left_shoulder, 12: right_shoulder
 */
function detectShoulderRaise(landmarks: Landmark[]): PostureIssue | null {
  const leftEar = getLm(landmarks, 7);
  const leftShoulder = getLm(landmarks, 11);
  const rightEar = getLm(landmarks, 8);
  const rightShoulder = getLm(landmarks, 12);

  // 检测两侧
  const issues: number[] = [];
  if (leftEar && leftShoulder) {
    const earToShoulder = dist(leftEar, leftShoulder);
    issues.push(earToShoulder);
  }
  if (rightEar && rightShoulder) {
    const earToShoulder = dist(rightEar, rightShoulder);
    issues.push(earToShoulder);
  }
  if (issues.length === 0) return null;

  const avgDist = issues.reduce((a, b) => a + b, 0) / issues.length;
  const severity = Math.min(1, Math.max(0, (SHOULDER_RAISE_RATIO * 2 - avgDist) / SHOULDER_RAISE_RATIO));

  if (severity < 0.3) return null;

  return {
    type: 'shoulder_raise',
    severity,
    description: '检测到耸肩，请放松肩膀，自然下沉',
  };
}

/**
 * 检测身体歪斜：左右肩高差
 */
function detectBodyTilt(landmarks: Landmark[]): PostureIssue | null {
  const leftShoulder = getLm(landmarks, 11);
  const rightShoulder = getLm(landmarks, 12);
  if (!leftShoulder || !rightShoulder) return null;

  const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderWidth = dist(leftShoulder, rightShoulder);
  if (shoulderWidth < 0.01) return null;

  const ratio = heightDiff / shoulderWidth;
  const severity = Math.min(1, ratio / BODY_TILT_RATIO);

  if (severity < 0.3) return null;

  return {
    type: 'body_tilt',
    severity,
    description: leftShoulder.y < rightShoulder.y
      ? '身体向左侧倾斜，请调整重心居中'
      : '身体向右侧倾斜，请调整重心居中',
  };
}

/** 分析姿势，返回所有检测到的问题 */
export function analyzePosture(landmarks: Landmark[]): PostureAnalysis {
  const issues: PostureIssue[] = [];

  const hunchback = detectHunchback(landmarks);
  if (hunchback) issues.push(hunchback);

  const shoulderRaise = detectShoulderRaise(landmarks);
  if (shoulderRaise) issues.push(shoulderRaise);

  const bodyTilt = detectBodyTilt(landmarks);
  if (bodyTilt) issues.push(bodyTilt);

  // 综合评分：100 - 各项扣分
  let penalty = 0;
  issues.forEach(i => { penalty += i.severity * 30; });
  const overallScore = Math.max(0, Math.round(100 - penalty));

  return {
    issues,
    overallScore,
    isGoodPosture: issues.length === 0,
    timestamp: Date.now(),
  };
}

/**
 * 判断关键点是否足够可信
 */
export function hasValidPose(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 25) return false;
  const keyIndices = [11, 12, 23, 24]; // 双肩+双髋
  return keyIndices.every(i => {
    const lm = landmarks[i];
    return lm && lm.visibility >= POSE_CONFIDENCE_THRESHOLD;
  });
}
