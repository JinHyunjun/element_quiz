import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = `${readFileSync(new URL("../public/assets/js/rpg.js", import.meta.url), "utf8")}\nglobalThis.__QuizKit = QuizKit;`;
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const game = sandbox.__QuizKit;

test("selects subject-specific dungeon worlds", () => {
  assert.equal(game.getWorld("수학").name, "시간 톱니의 성");
  assert.equal(game.getWorld("과학").boss, "안개 괴수 네뷸라");
  assert.equal(game.getWorld("체육").name, "별빛 지식의 성");
});

test("moves a campaign through three dungeon zones and a final boss", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((index) => game.stageIndex(index, 6)), [0, 0, 1, 1, 2, 3]);
});

test("balances boss HP by mission and guild count", () => {
  assert.equal(game.bossMaxHp(6, 3), 270);
  assert.equal(game.bossMaxHp(4, 2), 120);
});

test("awards stronger damage for correct answers and cooperative bonuses", () => {
  assert.equal(game.damageFor(0), 0);
  assert.equal(game.damageFor(1), 6);
  assert.equal(game.damageFor(2), 14);
  assert.equal(game.attack.cooperation, 10);
});

test("unlocks classroom rewards as shared stars grow", () => {
  assert.deepEqual(Array.from(game.rewardIdsForStars(3)), []);
  assert.deepEqual(Array.from(game.rewardIdsForStars(4)), ["compass"]);
  assert.deepEqual(Array.from(game.rewardIdsForStars(12)), ["compass", "sand", "banner"]);
});
