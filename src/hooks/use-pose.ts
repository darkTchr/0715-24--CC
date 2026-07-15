'use client';
/**
 * use-pose.ts — MediaPipe Pose 封装
 * 摄像头数据纯本地处理，定时检测姿势关键点
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { POSE_DETECTION_INTERVAL_MS } from '@/constants/training';
import { analyzePosture, hasValidPose } from '@/lib/pose-analyzer';
import type { Landmark, PostureAnalysis } from '@/types/pose';

interface UsePoseReturn {
  analysis: PostureAnalysis | null;
  isLoading: boolean;
  error: string | null;
  initPose: (videoElement: HTMLVideoElement) => Promise<void>;
  stopPose: () => void;
}

export function usePose(enabled: boolean): UsePoseReturn {
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseLandmarkerRef = useRef<unknown>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const initPose = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    videoRef.current = videoElement;

    try {
      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks('/wasm/');
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/wasm/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.7,
        minPosePresenceConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      setIsLoading(false);

      intervalRef.current = setInterval(() => {
        // MediaPipe PoseLandmarker 实例（运行时动态导入）
        const landmarker = poseLandmarkerRef.current as { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { landmarks: unknown[] } | null } | null;
        const video = videoRef.current;
        if (!landmarker || !video || video.readyState < 2) return;
        try {
          const result = landmarker.detectForVideo(video, performance.now());
          if (result && result.landmarks && result.landmarks.length > 0) {
            const rawLandmarks = result.landmarks[0] as Landmark[];
            if (hasValidPose(rawLandmarks)) {
              setAnalysis(analyzePosture(rawLandmarks));
            }
          }
        } catch { /* 静默忽略单次失败 */ }
      }, POSE_DETECTION_INTERVAL_MS);

    } catch (err) {
      setError(`姿势检测初始化失败: ${(err as Error).message}`);
      setIsLoading(false);
    }
  }, [enabled]);

  const stopPose = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    poseLandmarkerRef.current = null;
    videoRef.current = null;
    setAnalysis(null);
  }, []);

  useEffect(() => { return () => stopPose(); }, [stopPose]);

  return { analysis, isLoading, error, initPose, stopPose };
}
