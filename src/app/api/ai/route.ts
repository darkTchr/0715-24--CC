/**
 * API Route — DeepSeek 代理接口
 * 姿势纠正建议，请求去重（同问题5秒内不重复），限制频率
 * 客户端不能直接调用 DeepSeek API
 */
import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

/** 内存级请求去重缓存 */
const requestCache = new Map<string, number>();

export async function POST(req: NextRequest) {
  // 频率限制：简单 IP 检查
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || 'unknown';

  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json({ suggestion: 'AI 服务未配置' }, { status: 503 });
  }

  let body: { postureIssue?: string; severity?: number; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { postureIssue, severity, description } = body;
  if (!postureIssue) {
    return NextResponse.json({ error: '缺少 postureIssue' }, { status: 400 });
  }

  // 去重：同一 IP + 同一问题类型，5秒内不重复
  const cacheKey = `${ip}:${postureIssue}`;
  const lastTime = requestCache.get(cacheKey) || 0;
  if (Date.now() - lastTime < 5000) {
    return NextResponse.json({
      suggestion: '刚刚已生成建议，请稍后再试',
      cached: true,
    });
  }
  requestCache.set(cacheKey, Date.now());

  // 定期清理过期缓存
  if (requestCache.size > 500) {
    const cutoff = Date.now() - 10000;
    for (const [key, time] of requestCache) {
      if (time < cutoff) requestCache.delete(key);
    }
  }

  try {
    const prompt = `用户在做盆底肌训练时，检测到姿势问题：${description}（严重程度：${(severity ?? 0.5) * 100}%）。请给出1-2句简洁的纠正建议（不超过50字）。`;

    const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { suggestion: 'AI 服务暂时不可用' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || '请注意保持正确姿势';

    return NextResponse.json({
      suggestion: suggestion.substring(0, 50), // 确保 ≤ 50 字
    });

  } catch {
    return NextResponse.json(
      { suggestion: 'AI 服务连接失败' },
      { status: 502 }
    );
  }
}
