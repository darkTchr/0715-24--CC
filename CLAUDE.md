# 今天你提么 (tg-helper) - Claude Code配置

## 1. 项目概览
- **项目描述**：盆底肌科学训练Web应用，提供分级别训练课程、动画引导、语音播报、摄像头体位校正、训练打卡统计等功能。
- **技术栈**：Next.js + TypeScript、MediaPipe Pose、Framer Motion、CSS3动画、Web Speech API、deepseek-v4-flash（AI对话）
- **当前阶段**：开发初期
- **开发人数**：1人
- **部署方式**：纯前端静态部署，无后端服务

## 2. 核心功能模块
### 2.1 训练课程
- 按性别（男/女）和难度（初级/中级/高级）分级
- 动作类型：快速收缩、持续收缩、阶梯收缩等
- 课程数据结构需支持灵活扩展新动作类型

### 2.2 动画引导
- 呼吸圈动画：CSS3 animations + Framer Motion 实现缩放/颜色渐变节奏引导
- 人体姿势示范动画：Framer Motion 驱动的骨骼/肌肉示意动画
- 动画需与训练节奏严格同步，误差<50ms

### 2.3 语音播报
- 使用 Web Speech API（SpeechSynthesis）实时播报指令
- 支持呼吸引导（"吸气-收紧-保持-放松-呼气"循环）
- 语音播报需与动画节奏同步

### 2.4 体位校正（亮点功能）
- 通过 MediaPipe Pose（纯前端 WASM 运行）实时检测关键点
- 检测项：驼背（肩髋角度）、耸肩（肩耳距离）、身体歪斜（左右肩高差）、站姿是否中立
- 检测到姿势问题时，通过 Next.js API Route 代理调用 deepseek-v4-flash 生成个性化纠正建议
- 训练中随机抽检用户表情，判断是否走神/溜号

### 2.5 训练统计
- 打卡日历（类似 GitHub 贡献热力图）
- 统计图表：训练时长趋势、完成率、连续打卡天数等
- 图表库推荐 Recharts（React 原生，轻量）

## 3. 代码规范
### 通用规则
- 所有函数/组件必须有 TypeScript 类型注解
- 函数不超过50行，组件不超过300行
- 禁止使用 `any` 类型（特殊情况需注释说明）
- 优先使用 Next.js 服务端组件（RSC），仅在需要交互/状态时使用客户端组件
- 客户端组件必须显式标注 `'use client'`

### 命名约定
- 文件名：kebab-case（如 `breathing-circle.tsx`、`use-camera.ts`）
- 组件名：PascalCase（如 `BreathingCircle`、`TrainingTimer`）
- 函数/变量：camelCase（如 `getTrainingCourse`、`poseLandmarks`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_TRAINING_DURATION`、`POSE_CONFIDENCE_THRESHOLD`）
- API Route 文件：Next.js 约定，`route.ts` 放在 `app/api/` 下

### 目录结构
```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/                # API Routes（AI代理等）
│   │   └── ai/
│   │       └── route.ts    # deepseek 代理接口
│   ├── train/              # 训练页面
│   ├── stats/              # 统计页面
│   └── layout.tsx
├── components/
│   ├── training/           # 训练相关组件
│   │   ├── breathing-circle.tsx
│   │   ├── posture-demo.tsx
│   │   ├── training-timer.tsx
│   │   └── voice-coach.tsx
│   ├── camera/             # 摄像头/姿势检测
│   │   ├── pose-detector.tsx
│   │   └── posture-corrector.tsx
│   ├── stats/              # 统计图表组件
│   │   ├── checkin-calendar.tsx
│   │   └── training-charts.tsx
│   └── ui/                 # 通用UI组件
├── hooks/                  # 自定义Hooks
│   ├── use-camera.ts       # 摄像头管理
│   ├── use-pose.ts         # MediaPipe Pose封装
│   ├── use-speech.ts       # Web Speech API封装
│   └── use-training.ts     # 训练状态管理
├── lib/                    # 工具函数
│   ├── pose-analyzer.ts    # 姿势分析逻辑（驼背/耸肩/歪斜检测）
│   ├── course-data.ts      # 课程数据定义
│   └── stats.ts            # 统计计算
├── types/                  # 类型定义
│   ├── training.ts         # 训练相关类型
│   └── pose.ts             # 姿势检测相关类型
└── constants/              # 常量配置
    └── training.ts         # 训练参数常量
```

### 文档要求
- 所有公共组件和Hook必须有JSDoc注释
- 复杂业务逻辑（姿势分析算法、训练节奏控制）必须有流程注释
- 使用中文注释，代码标识符用英文

### 动画规范
- CSS3动画统一使用 `transform` 和 `opacity`，避免触发 reflow（`width`/`height`/`left`/`top` 禁止用于动画）
- Framer Motion 动画变量集中定义在组件顶部 `const animations = {...}`，禁止内联 magic number
- 动画时长/缓动函数统一从 `constants/training.ts` 引用，确保各组件同步一致

## 4. 安全规则
### 禁止行为
- 禁止在代码中硬编码 API Key，使用环境变量 `DEEPSEEK_API_KEY`
- 禁止提交 `.env` / `.env.local` 文件到仓库
- 禁止在客户端直接调用 deepseek API（必须通过 API Route 代理）
- 禁止将摄像头画面/MediaPipe检测数据上传到任何服务器（纯本地处理）

### 必须行为
- API Route 必须验证请求来源和频率限制
- 摄像头权限必须用户主动授权，并提供关闭开关
- 用户训练数据仅存储在 localStorage/IndexedDB，不上传

## 5. 测试要求
- 核心工具函数（姿势分析、统计计算）必须有单元测试
- 关键训练流程组件需有集成测试
- 测试框架：Vitest + React Testing Library
- 当前阶段：开发初期，可先聚焦核心功能测试，后续补全

## 6. Git规范
### 分支命名
- `main`：主分支，保持可部署状态
- `feature/xxx`：新功能（如 `feature/pose-detection`、`feature/training-course`）
- `fix/xxx`：bug修复
- `refactor/xxx`：重构

### 提交信息
格式：`<type>(<scope>): <description>`（中文描述）

示例：
- `feat(training): 添加分级训练课程数据结构`
- `feat(camera): 集成MediaPipe Pose实时姿势检测`
- `fix(voice): 修复语音播报与动画不同步问题`
- `refactor(pose): 优化姿势分析算法阈值`

## 7. 项目特殊说明
### MediaPipe Pose 集成注意
- 使用 `@mediapipe/tasks-vision` WASM 版本，纯前端运行
- 姿势关键点置信度阈值：`POSE_CONFIDENCE_THRESHOLD = 0.7`
- 每次检测间隔 ≥ 200ms，避免阻塞主线程
- WASM 文件需放在 `public/wasm/` 目录下，设置正确的 COOP/COEP 头

### AI 对话注意
- 使用 Next.js API Route (`app/api/ai/route.ts`) 代理 deepseek-v4-flash
- prompt 需包含姿势偏差数据 + 上下文，要求模型返回简洁的纠正建议（≤50字）
- 添加请求去重，同一姿势问题在 5 秒内不重复请求

### 隐私与性能
- 摄像头数据不出浏览器，MediaPipe 在 Web Worker 中运行
- Framer Motion 动画在训练页面使用 `layoutId` 减少重渲染
- 语音播报队列最大长度 3，避免指令堆积
