import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '盆底肌科学训练',
  description: '盆底肌科学训练Web应用 — 分级课程、动画引导、语音播报、AI姿势纠正',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-lg font-bold text-blue-600">
              🏋️ 盆底肌训练
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/train" className="hover:text-blue-600">训练</a>
              <a href="/stats" className="hover:text-blue-600">统计</a>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
