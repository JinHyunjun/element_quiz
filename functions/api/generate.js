const SYSTEM_INSTRUCTION = `당신은 초등학교 선생님을 돕는 교육 퀴즈 생성 AI입니다.
반드시 순수 JSON 배열만 출력하세요. 마크다운 코드블록이나 설명 텍스트를 절대 포함하지 마세요.`;

const OX_PROMPT = `초등학교 {grade}학년 {subject} [{unit}] 단원의 O/X 퀴즈 {count}개를 만들어 주세요.

조건:
- {grade}학년 학생 눈높이에 맞는 쉬운 언어
- 교과서 핵심 내용 중심
- true(O) / false(X) 비율 균형 있게

출력 형식 (JSON 배열만):
[{"question":"진술문","answer":true,"explanation":"간단한 해설"}]`;

const MULTIPLE_PROMPT = `초등학교 {grade}학년 {subject} [{unit}] 단원의 4지선다 퀴즈 {count}개를 만들어 주세요.

조건:
- {grade}학년 학생 눈높이에 맞는 쉬운 언어
- 오답도 그럴듯하게 구성
- answer는 정답의 인덱스 (0~3)

출력 형식 (JSON 배열만):
[{"question":"질문","options":["①보기1","②보기2","③보기3","④보기4"],"answer":0,"explanation":"간단한 해설"}]`;

function buildPrompt(grade, subject, unit, mode, count) {
  const tmpl = mode === 'ox' ? OX_PROMPT : MULTIPLE_PROMPT;
  return tmpl
    .replace(/{grade}/g, String(grade))
    .replace(/{subject}/g, String(subject))
    .replace(/{unit}/g, String(unit))
    .replace(/{count}/g, String(count));
}

function cleanJson(text) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  try {
    const body = await request.json();
    const { grade, subject, unit, mode, count = 5 } = body;

    if (!grade || !subject || !unit || !mode) {
      return new Response(
        JSON.stringify({ error: '필수 항목이 누락되었습니다 (grade, subject, unit, mode)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const prompt = buildPrompt(grade, subject, unit, mode, count);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini API 오류 (${geminiRes.status}): ${errText}` }),
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: 'Gemini가 빈 응답을 반환했습니다' }),
        { status: 502, headers: corsHeaders }
      );
    }

    let questions;
    try {
      questions = JSON.parse(cleanJson(rawText));
    } catch {
      return new Response(
        JSON.stringify({ error: 'AI 응답 파싱 실패. 다시 시도해주세요.', raw: rawText }),
        { status: 502, headers: corsHeaders }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: '유효한 문제가 생성되지 않았습니다' }),
        { status: 502, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ questions, mode, count: questions.length }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || '알 수 없는 오류가 발생했습니다' }),
      { status: 500, headers: corsHeaders }
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
