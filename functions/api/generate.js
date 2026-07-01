const MODEL = "gemini-3.1-flash-lite";
const MAX_BODY_BYTES = 12_000;

const SYSTEM_INSTRUCTION = `당신은 대한민국 초등학교 수업을 돕는 교육 콘텐츠 설계자입니다.
학생을 비교하거나 망신 주는 표현, 공포·폭력·차별·고정관념, 함정 문제를 만들지 마세요.
문장은 학년 수준에 맞게 짧고 명확하게 쓰고, 교과서 출판사에 따라 달라질 수 있는 고유 단원명은 단정하지 마세요.
정답 문제뿐 아니라 자신의 말로 설명하는 참여 미션을 섞으세요.
반드시 설명 없이 JSON 배열 하나만 출력하세요.`;

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function validateInput(value) {
  const grade = Number(value?.grade);
  const subject = cleanText(value?.subject, 30);
  const topic = cleanText(value?.topic, 100);
  const count = Number(value?.count);
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) return { error: "학년은 1~6 사이여야 합니다." };
  if (!subject) return { error: "교과를 입력해 주세요." };
  if (!topic) return { error: "수업 주제를 입력해 주세요." };
  if (!Number.isInteger(count) || count < 3 || count > 10) return { error: "문항 수는 3~10개여야 합니다." };
  return { value: { grade, subject, topic, count } };
}

export function buildPrompt({ grade, subject, topic, count }) {
  return `${grade}학년 ${subject} 수업의 주제는 ‘${topic}’입니다.
수업 중 팀이 함께 풀 수 있는 문항 ${count}개를 만드세요.

구성 원칙:
- 전체의 약 60%는 핵심 개념을 확인하는 multiple 또는 ox 문항
- 전체의 약 40%는 짝이나 팀이 함께 해결하는 talk 미션
- talk 미션은 말로 설명하기만 반복하지 말고 그림·몸짓으로 표현하기, 생활 속 예 찾기, 서로 다른 답 비교하기, 한 문장 요약하기를 고르게 사용하기
- talk 미션의 answer에는 교사가 바로 판단할 수 있는 구체적이고 너그러운 성공 기준 제시하기
- 첫 문항은 누구나 쉽게 참여할 수 있게 만들기
- 단순 암기뿐 아니라 생활 적용, 비교, 까닭 설명을 고르게 포함하기
- 4지선다의 오답도 그럴듯하되 모호하지 않게 만들기
- explanation은 초등학생이 이해할 수 있는 70자 이내의 친절한 해설

JSON 형식:
[
  {"type":"multiple","question":"질문","options":["보기1","보기2","보기3","보기4"],"answer":0,"explanation":"해설"},
  {"type":"ox","question":"진술문","answer":true,"explanation":"해설"},
  {"type":"talk","question":"함께 설명할 미션","answer":"성공 기준","explanation":"도움말"}
]
multiple의 answer는 0~3 정수, ox의 answer는 true 또는 false입니다.`;
}

export function extractJson(text) {
  const cleaned = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

export function normalizeQuestions(items, limit) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit).map((item) => {
    const type = ["multiple", "ox", "talk"].includes(item?.type) ? item.type : null;
    const question = cleanText(item?.question, 240);
    const explanation = cleanText(item?.explanation, 300);
    if (!type || !question) return null;

    if (type === "multiple") {
      const options = Array.isArray(item.options) ? item.options.slice(0, 4).map((option) => cleanText(option, 100)) : [];
      const answer = Number(item.answer);
      if (options.length !== 4 || options.some((option) => !option) || !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
      return { type, question, options, answer, explanation };
    }

    if (type === "ox") {
      const answer = item.answer === true || item.answer === "true" ? true : item.answer === false || item.answer === "false" ? false : null;
      return answer === null ? null : { type, question, answer, explanation };
    }

    const answer = cleanText(item.answer, 180);
    if (!answer) return null;
    return { type, question, answer, explanation };
  }).filter(Boolean);
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function callGemini(apiKey, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini API error", response.status, detail.slice(0, 500));
      throw new Error(`AI 서비스 응답 오류 (${response.status})`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestPost({ request, env }) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "요청 내용이 너무 큽니다." }, 413);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ error: "JSON 형식으로 요청해 주세요." }, 415);
  }

  try {
    const input = validateInput(await request.json());
    if (input.error) return json({ error: input.error }, 400);
    if (!env.GEMINI_API_KEY) return json({ error: "AI 설정이 없어 참여 미션으로 전환합니다.", code: "AI_NOT_CONFIGURED" }, 503);

    const data = await callGemini(env.GEMINI_API_KEY, buildPrompt(input.value));
    const rawText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!rawText) throw new Error("AI가 사용할 수 있는 내용을 반환하지 않았습니다.");

    let parsed;
    try { parsed = JSON.parse(extractJson(rawText)); }
    catch { throw new Error("AI 응답을 문항으로 변환하지 못했습니다."); }
    const questions = normalizeQuestions(parsed, input.value.count);
    if (questions.length < Math.min(3, input.value.count)) throw new Error("검증을 통과한 문항이 부족합니다.");
    return json({ questions, source: "gemini", model: MODEL });
  } catch (error) {
    console.error("Question generation failed", error);
    const message = error?.name === "AbortError" ? "AI 응답 시간이 너무 길어 참여 미션으로 전환합니다." : "AI 문제를 만들지 못해 참여 미션으로 전환합니다.";
    return json({ error: message, code: "GENERATION_FAILED" }, 502);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "Allow": "POST, OPTIONS" } });
}
