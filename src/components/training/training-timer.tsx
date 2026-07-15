'use client';
/**
 * training-timer.tsx — 训练计时与进度组件
 * 显示当前动作、进度条、阶段信息和倒计时
 */
import type { TrainingState, ExerciseStep } from '@/types/training';
import { BreathingCircle } from './breathing-circle';

interface TrainingTimerProps {
  state: TrainingState;
  currentStep: ExerciseStep | null;
  onPause: () => void;
  onStop: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  prepare: '准备',
  contract: '收缩',
  hold: '保持',
  relax: '放松',
  rest: '休息',
  complete: '完成',
};

export function TrainingTimer({ state, currentStep, onPause, onStop }: TrainingTimerProps) {
  const { course, phase, phaseRemainingSeconds, elapsedSeconds, isPaused, currentStepIndex, currentRepeat } = state;
  if (!course || phase === 'complete') return null;

  const totalSteps = course.steps.length;
  const progress = course.totalDurationSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / course.totalDurationSeconds) * 100))
    : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* 进度条 */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>步骤 {currentStepIndex + 1}/{totalSteps}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 呼吸圈 */}
      <BreathingCircle phase={state.breathPhase} phaseDuration={phaseRemainingSeconds} />

      {/* 当前阶段提示 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {PHASE_LABELS[phase] || phase}
        </h2>
        <p className="text-lg text-gray-600 mt-1">
          {currentStep?.voicePrompt || ''}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          第 {currentRepeat + 1}/{currentStep?.repeats || 0} 次
        </p>
      </div>

      {/* 倒计时 */}
      <div className="text-center">
        <span className="text-5xl font-mono font-bold text-blue-600 tabular-nums">
          {phaseRemainingSeconds}
        </span>
        <span className="text-gray-400 ml-1">秒</span>
      </div>

      {/* 总计时 */}
      <div className="text-sm text-gray-400">
        已训练 {formatTime(elapsedSeconds)} / {formatTime(course.totalDurationSeconds)}
      </div>

      {/* 控制按钮 */}
      <div className="flex gap-4">
        <button
          onClick={onPause}
          className="px-6 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          {isPaused ? '继续' : '暂停'}
        </button>
        <button
          onClick={onStop}
          className="px-6 py-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          结束训练
        </button>
      </div>
    </div>
  );
}
