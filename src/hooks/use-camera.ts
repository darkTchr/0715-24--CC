'use client';
/**
 * use-camera.ts — 摄像头管理 Hook
 * 权限请求、开关控制、画面流管理
 * 摄像头数据不出浏览器
 */
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCameraOptions {
  /** 摄像头 facingMode */
  facingMode?: 'user' | 'environment';
}

export function useCamera(options: UseCameraOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /** 启动摄像头 */
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode ?? 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false, // 不需要音频
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
      setIsPermissionGranted(true);
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问'
        : `摄像头启动失败: ${(err as Error).message}`;
      setError(message);
      setIsPermissionGranted(false);
    }
  }, [options.facingMode]);

  /** 停止摄像头 */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsActive(false);
  }, []);

  /** 切换摄像头开关 */
  const toggleCamera = useCallback(() => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isActive, startCamera, stopCamera]);

  // 组件卸载时释放摄像头
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    stream,
    isActive,
    isPermissionGranted,
    error,
    startCamera,
    stopCamera,
    toggleCamera,
  };
}
