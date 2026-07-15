'use client';
/**
 * use-speech.ts — Web Speech API 封装
 * 语音播报指令，与训练节奏同步，队列最大3条
 */
import { useCallback, useRef } from 'react';
import { SPEECH_QUEUE_MAX } from '@/constants/training';

interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export function useSpeech() {
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  const getSynth = useCallback((): SpeechSynthesis | null => {
    if (typeof window === 'undefined') return null;
    return window.speechSynthesis;
  }, []);

  /** 加入队列播报 */
  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    const synth = getSynth();
    if (!synth) return;

    if (queueRef.current.length >= SPEECH_QUEUE_MAX) {
      queueRef.current.shift();
    }
    queueRef.current.push(text);

    if (!speakingRef.current) {
      dequeue(synth, options, queueRef, speakingRef);
    }
  }, [getSynth]);

  /** 立即播报（清空队列） */
  const speakImmediate = useCallback((text: string, options: SpeakOptions = {}) => {
    const synth = getSynth();
    if (!synth) return;
    synth.cancel();
    queueRef.current = [];
    speakingRef.current = false;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;
    utterance.lang = options.lang ?? 'zh-CN';
    utterance.onend = () => { speakingRef.current = false; };
    synth.speak(utterance);
    speakingRef.current = true;
  }, [getSynth]);

  /** 停止所有播报 */
  const stop = useCallback(() => {
    const synth = getSynth();
    if (synth) synth.cancel();
    queueRef.current = [];
    speakingRef.current = false;
  }, [getSynth]);

  return { speak, speakImmediate, stop };
}

/** 从队列取下一个播报 */
function dequeue(
  synth: SpeechSynthesis,
  options: SpeakOptions,
  queueRef: React.MutableRefObject<string[]>,
  speakingRef: React.MutableRefObject<boolean>,
) {
  if (queueRef.current.length === 0) {
    speakingRef.current = false;
    return;
  }
  const text = queueRef.current.shift()!;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;
  utterance.lang = options.lang ?? 'zh-CN';
  utterance.onend = () => dequeue(synth, options, queueRef, speakingRef);
  speakingRef.current = true;
  synth.speak(utterance);
}
