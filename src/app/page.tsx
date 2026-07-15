import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center gap-6">
      <h1 className="text-4xl font-bold text-gray-800">
        盆底肌科学训练
      </h1>
      <p className="text-lg text-gray-500 max-w-md">
        基于医学指南的分级训练课程<br />
        动画引导 · 语音播报 · AI 姿势纠正 · 训练统计
      </p>
      <div className="flex gap-4 mt-4">
        <Link
          href="/train"
          className="px-8 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
        >
          开始训练
        </Link>
        <Link
          href="/stats"
          className="px-8 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-colors"
        >
          训练统计
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-2xl w-full">
        <FeatureCard icon="🎯" title="分级课程" desc="男女/初-中-高级" />
        <FeatureCard icon="🎤" title="语音播报" desc="实时呼吸引导" />
        <FeatureCard icon="📷" title="AI姿势纠正" desc="摄像头实时检测" />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm text-center">
      <span className="text-3xl">{icon}</span>
      <h3 className="font-medium mt-2">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{desc}</p>
    </div>
  );
}
