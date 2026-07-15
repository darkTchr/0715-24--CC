'use client';
/**
 * voice-coach.tsx — 语音播报教练
 * 根据训练阶段自动播报指令，与动画/呼吸节奏同步
 */
import { useEffect, useRef } from 'react';
import type { TrainingPhase, BreathPhase, ExerciseStep } from '@/types/training';

interface VoiceCoachProps {
  isActive: boolean;
  isPaused: boolean;
  phase: TrainingPhase;
  breathPhase: BreathPhase;
  currentStep: ExerciseStep | null;
  currentRepeat: number;
  /** speak/immediate/stop 方法 */
  speak: (text: string) => void;
  speakImmediate: (text: string) => void;
  stop: () => void;
}

const BREATH_PROMPTS: Record<BreathPhase, string> = {
  inhale: '吸气',
  hold_in: '屏住呼吸',
  exhale: '呼气放松',
};

const PHASE_START_PROMPTS: Record<string, string> = {
  prepare: '准备开始，深呼吸',
  contract: '收紧',
  hold: '保持',
  relax: '放松',
  rest: '休息一下',
};

export function VoiceCoach(props: VoiceCoachProps) {
  const {
    isActive, isPaused, phase, breathPhase, currentStep,
    currentRepeat, speak, speakImmediate, stop,
  } = props;

  const prevPhaseRef = useRef(phase);
  const prevRepeatRef = useRef(currentRepeat);

  useEffect(() => {
    if (!isActive || isPaused) {
      if (!isActive) stop();
      return;
    }

    // 阶段切换时播报
    if (phase !== prevPhaseRef.current) {
      const prompt = PHASE_START_PROMPTS[phase];
      if (prompt) speakImmediate(prompt);
      prevPhaseRef.current = phase;
    }

    // 新重复开始时播报呼吸指令
    if (currentRepeat !== prevRepeatRef.current) {
      speakImmediate(BREATH_PROMPTS[breathPhase]);
      prevRepeatRef.current = currentRepeat;
    }

    // 每步首次播报动作说明
    if (currentRepeat === 0 && currentStep?.voicePrompt) {
      speak(currentStep.voicePrompt);
    }
  }, [isActive, isPaused, phase, breathPhase, currentRepeat, currentStep, speak, speakImmediate, stop]);

  // 组件本身不渲染UI
  return null;
}
