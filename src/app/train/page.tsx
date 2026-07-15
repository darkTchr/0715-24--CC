'use client';
/**
 * train/page.tsx — 训练页面
 * 课程选择 → 训练进行 → 完成统计
 */
import { useState, useCallback } from 'react';
import { useTraining } from '@/hooks/use-training';
import { useSpeech } from '@/hooks/use-speech';
import { useCamera } from '@/hooks/use-camera';
import { usePose } from '@/hooks/use-pose';
import { getCoursesByFilter } from '@/lib/course-data';
import { TrainingTimer } from '@/components/training/training-timer';
import { VoiceCoach } from '@/components/training/voice-coach';
import { PostureCorrector } from '@/components/camera/posture-corrector';
import type { Gender, Difficulty, TrainingCourse } from '@/types/training';

export default function TrainPage() {
  // 课程选择
  const [gender, setGender] = useState<Gender | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);

  // 训练的 hooks
  const training = useTraining();
  const speech = useSpeech();
  const camera = useCamera({ facingMode: 'user' });
  const pose = usePose(camera.isActive);

  // 选择课程后开始
  const handleStartCourse = useCallback((course: TrainingCourse) => {
    setSelectedCourse(course);
    training.startTraining(course);
  }, [training]);

  // 摄像头视频 ref 回调
  const videoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    if (el && camera.isActive) {
      el.srcObject = camera.stream;
      pose.initPose(el);
    }
  }, [camera.isActive, camera.stream, pose]);

  // 训练完成
  if (training.state.phase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-bold">训练完成!</h2>
        <p className="text-gray-500">
          总时长: {Math.floor(training.state.elapsedSeconds / 60)}分{training.state.elapsedSeconds % 60}秒
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-500 text-white rounded-full mt-4"
        >
          再来一组
        </button>
      </div>
    );
  }

  // 训练进行中
  if (training.state.isActive && selectedCourse) {
    return (
      <div className="relative">
        {/* 摄像头预览（可开关） */}
        {camera.isActive && (
          <div className="absolute top-0 right-0 w-48 h-36 rounded-lg overflow-hidden border-2 border-blue-300 z-20">
            <video
              ref={videoRefCallback}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* 姿势纠正覆盖层 */}
            {pose.analysis && (
              <PostureCorrector issues={pose.analysis.issues} />
            )}
          </div>
        )}

        <TrainingTimer
          state={training.state}
          currentStep={training.currentStep}
          onPause={training.togglePause}
          onStop={training.stopTraining}
        />

        <VoiceCoach
          isActive={training.state.isActive}
          isPaused={training.state.isPaused}
          phase={training.state.phase}
          breathPhase={training.state.breathPhase}
          currentStep={training.currentStep}
          currentRepeat={training.state.currentRepeat}
          speak={speech.speak}
          speakImmediate={speech.speakImmediate}
          stop={speech.stop}
        />

        {/* 摄像头开关 */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={camera.toggleCamera}
            className={`px-4 py-2 rounded-full text-sm ${
              camera.isActive
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {camera.isActive ? '关闭摄像头' : '开启摄像头（姿势纠正）'}
          </button>
        </div>
      </div>
    );
  }

  // 课程选择
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">选择训练课程</h1>

      {/* 性别选择 */}
      {!gender ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-500">请选择性别</p>
          <div className="flex gap-4">
            <button
              onClick={() => setGender('female')}
              className="px-8 py-4 bg-pink-100 rounded-xl hover:bg-pink-200 transition-colors"
            >
              <span className="text-3xl">👩</span>
              <p className="mt-1 font-medium">女性</p>
            </button>
            <button
              onClick={() => setGender('male')}
              className="px-8 py-4 bg-blue-100 rounded-xl hover:bg-blue-200 transition-colors"
            >
              <span className="text-3xl">👨</span>
              <p className="mt-1 font-medium">男性</p>
            </button>
          </div>
        </div>
      ) : !difficulty ? (
        /* 难度选择 */
        <div className="flex flex-col items-center gap-4">
          <button onClick={() => setGender(null)} className="text-sm text-blue-500">← 返回</button>
          <p className="text-gray-500">选择难度级别</p>
          <div className="flex gap-4">
            {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="px-6 py-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="font-medium">
                  {d === 'beginner' ? '🌱 初级' : d === 'intermediate' ? '🌿 中级' : '🔥 高级'}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* 课程列表 */
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <button onClick={() => setDifficulty(null)} className="text-sm text-blue-500">← 返回</button>
          {getCoursesByFilter(gender, difficulty).map(course => (
            <button
              key={course.id}
              onClick={() => handleStartCourse(course)}
              className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <h3 className="font-bold text-lg">{course.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{course.description}</p>
              <p className="text-xs text-gray-300 mt-2">
                {Math.floor(course.totalDurationSeconds / 60)}分钟 · {course.steps.length}个步骤
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
