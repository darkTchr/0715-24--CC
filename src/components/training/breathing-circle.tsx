'use client';
/**
 * breathing-circle.tsx — 呼吸圈动画组件
 * 根据呼吸阶段展示缩放+颜色渐变的圆形动画引导
 * 动画使用 CSS3 transform + opacity，与训练节奏严格同步
 */
import { motion } from 'framer-motion';
import type { BreathPhase } from '@/types/training';
import {
  BREATHING_CIRCLE_SCALE,
  BREATHING_CIRCLE_COLORS,
  BREATHING_TRANSITION_MS,
} from '@/constants/training';

interface BreathingCircleProps {
  phase: BreathPhase;
  /** 阶段剩余秒数，用于缩放过渡时长 */
  phaseDuration: number;
}

export function BreathingCircle({ phase, phaseDuration }: BreathingCircleProps) {
  const scale = BREATHING_CIRCLE_SCALE[phase] ?? 1;
  const color = BREATHING_CIRCLE_COLORS[phase] ?? '#4FC3F7';

  const label: Record<BreathPhase, string> = {
    inhale: '吸气',
    hold_in: '屏气',
    exhale: '呼气',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* 外圈光环 */}
      <motion.div
        className="rounded-full border-4"
        style={{
          width: 200,
          height: 200,
          borderColor: color,
          opacity: 0.3,
        }}
        animate={{
          scale: scale * 1.3,
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: phaseDuration > 0 ? phaseDuration : 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 主圆 */}
      <motion.div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: 160,
          height: 160,
          backgroundColor: color,
          opacity: 0.15,
        }}
        animate={{ scale }}
        transition={{ duration: BREATHING_TRANSITION_MS / 1000, ease: 'easeInOut' }}
      />

      {/* 内圆 */}
      <motion.div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: 100,
          height: 100,
          backgroundColor: color,
        }}
        animate={{ scale }}
        transition={{ duration: BREATHING_TRANSITION_MS / 1000, ease: 'easeInOut' }}
      >
        <span className="text-white font-bold text-lg">{label[phase]}</span>
      </motion.div>
    </div>
  );
}
