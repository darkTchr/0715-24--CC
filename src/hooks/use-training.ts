'use client';
/**
 * use-training.ts — 训练状态管理 Hook
 * 管理训练流程：准备→收缩→保持→放松→休息→完成
 */
import { useState, useCallback, useRef } from 'react';
import type {
  TrainingState, TrainingCourse, TrainingPhase,
  BreathPhase, ExerciseStep, TrainingRecord,
} from '@/types/training';
import { PREPARE_COUNTDOWN_SECONDS } from '@/constants/training';
import { addRecord } from '@/lib/stats';

// ---------- 阶段流转辅助 ----------

function getPhaseDuration(step: ExerciseStep, phase: TrainingPhase): number {
  switch (phase) {
    case 'contract': return step.contractSeconds || step.holdSeconds || 1;
    case 'hold': return step.holdSeconds || 1;
    case 'relax': return step.relaxSeconds || 1;
    case 'rest': return 1;
    default: return 1;
  }
}

function getBreathPhase(phase: TrainingPhase): BreathPhase {
  switch (phase) {
    case 'contract': return 'inhale';
    case 'hold': return 'hold_in';
    case 'relax':
    case 'rest': return 'exhale';
    default: return 'exhale';
  }
}

function advancePhase(state: TrainingState, onComplete: () => void): TrainingState {
  const { course, currentStepIndex, currentRepeat, phase } = state;
  if (!course) return { ...state, phase: 'complete' };

  const step = course.steps[currentStepIndex];
  if (!step) return { ...state, phase: 'complete' };

  const phaseOrder: TrainingPhase[] = ['contract', 'hold', 'relax', 'rest'];
  const idx = phaseOrder.indexOf(phase as TrainingPhase);

  if (idx >= 0 && idx < phaseOrder.length - 1) {
    const nextPhase = phaseOrder[idx + 1];
    return {
      ...state,
      phase: nextPhase,
      phaseRemainingSeconds: getPhaseDuration(step, nextPhase),
      breathPhase: getBreathPhase(nextPhase),
    };
  }

  // 进入下一次重复
  const nextRepeat = currentRepeat + 1;
  if (nextRepeat < step.repeats) {
    return {
      ...state,
      currentRepeat: nextRepeat,
      phase: 'contract',
      phaseRemainingSeconds: step.contractSeconds || step.holdSeconds || 1,
      breathPhase: 'inhale',
    };
  }

  // 进入下一个步骤
  const nextStepIndex = currentStepIndex + 1;
  if (nextStepIndex < course.steps.length) {
    return {
      ...state,
      currentStepIndex: nextStepIndex,
      currentRepeat: 0,
      phase: 'rest',
      phaseRemainingSeconds: course.restBetweenSets,
      breathPhase: 'exhale',
    };
  }

  // 全部完成
  onComplete();
  return { ...state, phase: 'complete', isActive: false };
}

// ---------- Hook ----------

function initialState(): TrainingState {
  return {
    isActive: false,
    course: null,
    currentStepIndex: 0,
    currentRepeat: 0,
    phase: 'prepare',
    breathPhase: 'inhale',
    phaseRemainingSeconds: PREPARE_COUNTDOWN_SECONDS,
    elapsedSeconds: 0,
    isPaused: false,
  };
}

export function useTraining() {
  const [state, setState] = useState<TrainingState>(initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const postureIssuesRef = useRef(0);
  const distractionRef = useRef(0);

  const getCurrentStep = useCallback((): ExerciseStep | null => {
    return state.course?.steps[state.currentStepIndex] || null;
  }, [state.course, state.currentStepIndex]);

  const saveComplete = useCallback(() => {
    if (!state.course) return;
    const record: TrainingRecord = {
      id: crypto.randomUUID(),
      courseId: state.course.id,
      startedAt: new Date(Date.now() - state.elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      completed: true,
      completionRate: 100,
      postureIssues: postureIssuesRef.current,
      distractionCount: distractionRef.current,
    };
    addRecord(record);
  }, [state.course, state.elapsedSeconds]);

  const startTraining = useCallback((course: TrainingCourse) => {
    postureIssuesRef.current = 0;
    distractionRef.current = 0;
    setState({
      isActive: true,
      course,
      currentStepIndex: 0,
      currentRepeat: 0,
      phase: 'prepare',
      breathPhase: 'inhale',
      phaseRemainingSeconds: PREPARE_COUNTDOWN_SECONDS,
      elapsedSeconds: 0,
      isPaused: false,
    });

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.isActive || prev.isPaused) return prev;
        const newRemaining = prev.phaseRemainingSeconds - 1;
        const newElapsed = prev.elapsedSeconds + 1;

        if (newRemaining <= 0) {
          return advancePhase(prev, () => {
            if (timerRef.current) clearInterval(timerRef.current);
            saveComplete();
          });
        }
        return {
          ...prev,
          phaseRemainingSeconds: newRemaining,
          elapsedSeconds: newElapsed,
          breathPhase: getBreathPhase(prev.phase),
        };
      });
    }, 1000);
  }, [saveComplete]);

  const togglePause = useCallback(() => {
    setState(prev => {
      if (prev.phase === 'complete') return prev;
      return { ...prev, isPaused: !prev.isPaused };
    });
  }, []);

  const stopTraining = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setState(prev => {
      if (prev.course) {
        const record: TrainingRecord = {
          id: crypto.randomUUID(),
          courseId: prev.course.id,
          startedAt: new Date(Date.now() - prev.elapsedSeconds * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          completed: false,
          completionRate: prev.course.totalDurationSeconds > 0
            ? Math.round((prev.elapsedSeconds / prev.course.totalDurationSeconds) * 100)
            : 0,
          postureIssues: postureIssuesRef.current,
          distractionCount: distractionRef.current,
        };
        addRecord(record);
      }
      return initialState();
    });
  }, []);

  const recordPostureIssue = useCallback(() => { postureIssuesRef.current += 1; }, []);
  const recordDistraction = useCallback(() => { distractionRef.current += 1; }, []);

  return {
    state,
    currentStep: getCurrentStep(),
    startTraining,
    togglePause,
    stopTraining,
    recordPostureIssue,
    recordDistraction,
  };
}
