const SYSTEM_INSTRUCTION = `당신은 초등학교 선생님을 돕는 교육 퀴즈 생성 AI입니다.
반드시 순수 JSON 배열만 출력하세요. 마크다운 코드블록이나 설명 텍스트를 절대 포함하지 마세요.`;

const PROMPTS = {
  multiple: `초등학교 {grade}학년 {subject} [{unit}] 단원의 4지선다 퀴즈 {count}개를 만들어 주세요.
조건: {grade}학년 눈높이 · 오답도 그럴듯하게 · answer는 정답 인덱스(0~3)
출력(JSON 배열만): [{"question":"질문","options":["①","②","③","④"],"answer":0,"explanation":"해설"}]`,

  ox: `초등학교 {grade}학년 {subject} [{unit}] 단원의 O/X 퀴즈 {count}개를 만들어 주세요.
조건: {grade}학년 눈높이 · true/false 균형
출력(JSON 배열만): [{"question":"진술문","answer":true,"explanation":"해설"}]`,

  boss: `초등학교 {grade}학년 {subject} [{unit}] 단원 전체 내용을 종합하는 심화 4지선다 문제 1개를 만들어 주세요.
조건: 단원의 핵심 개념을 묻는 어려운 보스 문제 · 오답도 그럴듯하게 · answer는 인덱스(0~3)
출력(JSON 배열, 1개): [{"question":"질문","options":["①","②","③","④"],"answer":0,"explanation":"해설"}]`,

  final: `초등학교 {grade}학년 {subject}에서 다음 단원들을 모두 배운 학생들과의 최종 보스 전투입니다: [{units}]
이 단원들을 두루 다루는 종합 복습 4지선다 문제 {count}개를 만들어 주세요.
조건: 각 단원에서 골고루 출제 · 단원 간 연계 포함 · 도전적인 난이도
출력(JSON 배열): [{"question":"질문","options":["①","②","③","④"],"answer":0,"explanation":"해설","unit":"관련단원"}]`,
};

function buildPrompt({ grade, subject, unit, units, mode, count }) {
  let tmpl = PROMPTS[mode] || PROMPTS.multiple;
  return tmpl
    .replace(/{grade}/g, String(grade || ''))
    .replace(/{subject}/g, String(subject || ''))
    .replace(/{unit}/g, String(unit || ''))
    .replace(/{units}/g, Array.isArray(units) ? units.join(', ') : String(units || ''))
    .replace(/{count}/g, String(count || 5));
}

function cleanJson(text) {
  return text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  try {
    const body = await request.json();
    const { grade, subject, unit, units, mode = 'multiple', count = 5 } = body;

    if (!grade || !subject || !mode) {
      return new Response(
        JSON.stringify({ error: '필수 항목 누락 (grade, subject, mode)' }),
        { status: 400, headers: CORS }
      );
    }
    if (mode !== 'final' && !unit) {
      return new Response(
        JSON.stringify({ error: 'final 모드가 아니면 unit 필수' }),
        { status: 400, headers: CORS }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY 미설정' }),
        { status: 500, headers: CORS }
      );
    }

    const prompt = buildPrompt({ grade, subject, unit, units, mode, count });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const t = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini 오류 (${geminiRes.status}): ${t}` }),
        { status: 502, headers: CORS }
      );
    }

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(JSON.stringify({ error: 'Gemini 빈 응답' }), { status: 502, headers: CORS });
    }

    let questions;
    try {
      questions = JSON.parse(cleanJson(rawText));
    } catch {
      return new Response(
        JSON.stringify({ error: 'AI 응답 파싱 실패', raw: rawText }),
        { status: 502, headers: CORS }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: '빈 문제 배열' }), { status: 502, headers: CORS });
    }

    return new Response(
      JSON.stringify({ questions, mode, count: questions.length }),
      { headers: CORS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || '서버 오류' }),
      { status: 500, headers: CORS }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
