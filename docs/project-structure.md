# 今天你提么 (tg-helper) - 项目结构文档

## 项目技术栈
- 前端框架：Next.js 15 + TypeScript 5
- 动画：Framer Motion + CSS3 Animations
- 姿势检测：MediaPipe Pose (@mediapipe/tasks-vision)，纯前端 WASM 运行
- AI 对话：Next.js API Route 代理 → deepseek-v4-flash
- 语音合成：Web Speech API (SpeechSynthesis)
- 图表：Recharts
- 数据存储：localStorage / IndexedDB（纯前端，无后端数据库）
- 测试：Vitest + React Testing Library
- 部署：纯静态导出 (next export)，Vercel / Cloudflare Pages

## 目录结构

```
tg-helper/
├── public/
│   └── wasm/                      # MediaPipe WASM 文件
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/
│   │   │   └── ai/
│   │   │       └── route.ts       # deepseek API 代理
│   │   ├── train/
│   │   │   └── page.tsx           # 训练页面
│   │   ├── stats/
│   │   │   └── page.tsx           # 统计页面
│   │   ├── settings/
│   │   │   └── page.tsx           # 设置页面
│   │   ├── layout.tsx             # 根布局
│   │   └── page.tsx               # 首页（课程选择）
│   ├── components/
│   │   ├── training/
│   │   │   ├── breathing-circle.tsx    # 呼吸圈动画组件
│   │   │   ├── posture-demo.tsx        # 人体姿势示范动画
│   │   │   ├── training-timer.tsx      # 训练计时器
│   │   │   ├── training-controls.tsx   # 训练控制（开始/暂停/结束）
│   │   │   └── voice-coach.tsx         # 语音播报组件
│   │   ├── camera/
│   │   │   ├── camera-view.tsx         # 摄像头预览
│   │   │   ├── pose-detector.tsx       # MediaPipe Pose 检测
│   │   │   ├── posture-corrector.tsx   # 体位分析与纠正建议
│   │   │   └── expression-check.tsx    # 表情/走神抽检
│   │   ├── stats/
│   │   │   ├── checkin-calendar.tsx    # 打卡日历（热力图）
│   │   │   ├── training-streak.tsx     # 连续打卡统计
│   │   │   └── training-charts.tsx     # 训练时长/完成率图表
│   │   ├── course/
│   │   │   ├── course-selector.tsx     # 课程选择器（性别+难度）
│   │   │   └── course-card.tsx         # 课程卡片
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── modal.tsx
│   │       └── progress-bar.tsx
│   ├── hooks/
│   │   ├── use-camera.ts              # 摄像头权限与流管理
│   │   ├── use-pose.ts                # MediaPipe Pose 封装 Hook
│   │   ├── use-speech.ts              # SpeechSynthesis 封装 Hook
│   │   ├── use-training.ts            # 训练状态机（idle/running/paused/done）
│   │   └── use-stats.ts               # 统计数据读取 Hook
│   ├── lib/
│   │   ├── pose-analyzer.ts           # 姿势偏差计算（驼背/耸肩/歪斜）
│   │   ├── course-data.ts             # 课程数据定义
│   │   ├── course-generator.ts        # 根据性别+难度生成训练计划
│   │   ├── stats-calculator.ts        # 统计计算（连续天数/完成率）
│   │   ├── speech-queue.ts            # 语音播报队列管理
│   │   └── storage.ts                 # localStorage/IndexedDB 封装
│   ├── types/
│   │   ├── training.ts                # 训练相关类型定义
│   │   ├── pose.ts                    # 姿势检测相关类型定义
│   │   └── course.ts                  # 课程相关类型定义
│   ├── constants/
│   │   └── training.ts                # 训练参数常量（时长/阈值/动画参数）
│   └── workers/
│       └── pose-worker.ts             # MediaPipe Web Worker（可选，性能优化）
├── __tests__/                         # 测试文件
│   ├── lib/
│   │   ├── pose-analyzer.test.ts
│   │   ├── course-generator.test.ts
│   │   └── stats-calculator.test.ts
│   └── hooks/
│       └── use-training.test.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── .env.local                         # DEEPSEEK_API_KEY（不提交）
```

## 核心模块

### 训练课程模块 (src/lib/course-data.ts + course-generator.ts)
- 按性别（男/女）和难度（初级/中级/高级）生成训练计划
- 动作类型：快速收缩（quick）、持续收缩（sustained）、阶梯收缩（ladder）
- 每个动作定义：收缩时长(s)、保持时长(s)、放松时长(s)、循环次数
- 数据结构：
```typescript
interface TrainingAction {
  type: 'quick' | 'sustained' | 'ladder'
  contractDuration: number    // 秒
  holdDuration: number        // 秒
  relaxDuration: number       // 秒
  repeat: number              // 循环次数
}

interface TrainingCourse {
  id: string
  gender: 'male' | 'female'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  totalDuration: number       // 秒
  actions: TrainingAction[]
}
```

### 动画引导模块 (src/components/training/)
- **breathing-circle.tsx**：呼吸圈缩放+颜色渐变，CSS3 animation-duration 与当前动作时长同步
- **posture-demo.tsx**：Framer Motion 驱动的人体骨骼/肌肉示意动画
- 动画参数统一从 `constants/training.ts` 导出，确保各组件同步
- 动画与训练计时器通过 `use-training.ts` 的共享状态同步，误差 <50ms

### 语音播报模块 (src/hooks/use-speech.ts + lib/speech-queue.ts)
- 封装 `window.speechSynthesis`
- 播报队列最大长度 3，避免指令堆积
- 播报内容与当前动作联动：`"吸气收紧" → "保持" → "缓慢放松"`
- 支持中断和恢复

### 体位校正模块 (src/components/camera/ + lib/pose-analyzer.ts)
- **pose-detector.tsx**：调用 MediaPipe Pose，获取 33 个关键点，间隔 ≥200ms
- **pose-analyzer.ts**：计算姿势偏差
  - 驼背：肩-髋连线与垂直面夹角 >15°
  - 耸肩：耳-肩距离低于阈值
  - 歪斜：左右肩高度差 >5cm
- **posture-corrector.tsx**：检测到偏差后调用 `/api/ai` 获取纠正建议，5秒内不重复请求
- **expression-check.tsx**：训练中随机抽检，通过面部关键点判断注意力方向
- 摄像头数据不出浏览器，MediaPipe 纯本地运行

### 统计模块 (src/components/stats/ + lib/stats-calculator.ts)
- **checkin-calendar.tsx**：GitHub 风格热力图，展示每日训练完成情况
- **training-streak.tsx**：连续打卡天数、最长连续记录
- **training-charts.tsx**：训练时长趋势折线图、完成率饼图（Recharts）
- 数据存储：localStorage，按日期记录训练会话

### AI 代理模块 (src/app/api/ai/route.ts)
- 接收姿势偏差数据，构建 prompt 调用 deepseek-v4-flash
- 要求模型返回 ≤50 字的简洁纠正建议
- 请求去重：相同姿势问题 5 秒内不重复请求
- API Key 从 `DEEPSEEK_API_KEY` 环境变量读取

## 数据流

```
用户进入训练 → course-generator 生成计划
  → use-training Hook 驱动状态机（idle→running）
    → 计时器推进当前动作索引
    → breathing-circle + posture-demo 同步动画
    → voice-coach 播报语音指令
    → [可选] 摄像头开启
      → pose-detector 获取关键点
      → pose-analyzer 计算偏差
      → posture-corrector 调用 /api/ai 获取建议
      → expression-check 随机抽检表情
  → 训练完成 → stats-calculator 计算并存入 localStorage
```

## 代码规约
- 所有组件/Hook 必须有 TypeScript 类型注解
- 客户端组件显式标注 `'use client'`
- 动画只动 `transform` + `opacity`，禁止触发 reflow
- 动画参数统一引用 `constants/training.ts`，禁止内联 magic number
- 摄像头数据不上传，AI 请求不携带原始图像
- 所有日期时间使用本地时间，存储在 localStorage
