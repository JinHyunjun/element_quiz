import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, extractJson, normalizeQuestions, onRequestPost, validateInput } from "../functions/api/generate.js";

test("validates the allowed grade and question range", () => {
  assert.deepEqual(validateInput({ grade: 3, subject: "과학", topic: "동물의 생활", count: 6 }).value, {
    grade: 3, subject: "과학", topic: "동물의 생활", count: 6
  });
  assert.match(validateInput({ grade: 0, subject: "과학", topic: "동물", count: 6 }).error, /1~6/);
  assert.match(validateInput({ grade: 3, subject: "과학", topic: "동물", count: 20 }).error, /3~10/);
});

test("extracts a JSON array from a fenced response", () => {
  assert.equal(extractJson("```json\n[{\"type\":\"ox\"}]\n```"), "[{\"type\":\"ox\"}]");
});

test("keeps only well-formed classroom questions", () => {
  const result = normalizeQuestions([
    { type: "multiple", question: "알맞은 것은?", options: ["가", "나", "다", "라"], answer: 1, explanation: "나입니다." },
    { type: "multiple", question: "정답 범위 오류", options: ["가", "나", "다", "라"], answer: 7 },
    { type: "ox", question: "질문하는 것도 참여이다.", answer: true, explanation: "맞아요." },
    { type: "talk", question: "짝에게 설명하세요.", answer: "핵심을 말하면 성공", explanation: "서로 들어요." }
  ], 10);
  assert.equal(result.length, 3);
  assert.equal(result[0].answer, 1);
  assert.equal(result[1].answer, true);
  assert.equal(result[2].type, "talk");
});

test("prompt includes pedagogy constraints without student data", () => {
  const prompt = buildPrompt({ grade: 5, subject: "수학", topic: "분수의 덧셈", count: 6 });
  assert.match(prompt, /5학년 수학/);
  assert.match(prompt, /말로 설명/);
  assert.doesNotMatch(prompt, /학생 이름|명단/);
});

test("returns a safe fallback signal when the AI secret is absent", async () => {
  const request = new Request("https://example.com/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grade: 4, subject: "사회", topic: "지도의 기본 요소", count: 4 })
  });
  const response = await onRequestPost({ request, env: {} });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, "AI_NOT_CONFIGURED");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
