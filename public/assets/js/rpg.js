/* ═══════════════════════════════════════
   RPG — 초등 교실 퀴즈 RPG 데이터 & 상수
════════════════════════════════════════ */
const RPG = {
  // ── Team ──
  TEAM_MAX_HP: 100,

  // ── Monster HP ──
  REGULAR_HP:    60,
  BOSS_HP:      100,
  FINAL_BOSS_HP: 200,

  // ── Rewards & Penalties ──
  CORRECT_DAMAGE: 20,   // player → monster
  CORRECT_GOLD:   10,
  BOSS_DAMAGE:    35,
  BOSS_GOLD:      25,
  FINAL_DAMAGE:   40,
  FINAL_GOLD:     30,

  WRONG_DAMAGE:      15, // monster → team
  BOSS_WRONG_DAMAGE: 25,
  FINAL_WRONG_DAMAGE:30,

  CHECKPOINT_HEAL: 25,

  // ── Skill unlock thresholds (total correct) ──
  SKILL_THRESHOLDS: { shield: 3, hint: 7, double: 12 },

  SKILLS: {
    shield: { name: '철벽 방어',   emoji: '🛡️', desc: '다음 오답 → 피해 무효' },
    hint:   { name: '마법의 힌트', emoji: '✨', desc: '오답 선지 1개 제거' },
    double: { name: '황금 배율',   emoji: '💰', desc: '다음 정답 골드 2배' },
  },

  // ── Monsters by subject ──
  MONSTERS: {
    _default: {
      pool: [
        { name: '슬라임',   emoji: '🟢', color: '#4ADE80' },
        { name: '고블린',   emoji: '👺', color: '#FB923C' },
        { name: '스켈레톤', emoji: '💀', color: '#CBD5E1' },
        { name: '오크',     emoji: '👹', color: '#A3E635' },
        { name: '트롤',     emoji: '🧌', color: '#34D399' },
      ],
      boss:  { name: '드래곤',  emoji: '🐉', color: '#F87171' },
      final: { name: '마왕',   emoji: '😈', color: '#C084FC' },
    },
    '국어': {
      pool: [
        { name: '글자 슬라임',   emoji: '📝', color: '#60A5FA' },
        { name: '맞춤법 고블린', emoji: '🖊️', color: '#34D399' },
        { name: '이야기 오크',   emoji: '📖', color: '#F59E0B' },
        { name: '시 마법사',     emoji: '🎭', color: '#A78BFA' },
        { name: '받아쓰기 박쥐', emoji: '🦇', color: '#F472B6' },
      ],
      boss:  { name: '문학의 드래곤', emoji: '🐉', color: '#818CF8' },
      final: { name: '언어의 마왕',   emoji: '📚', color: '#C084FC' },
    },
    '수학': {
      pool: [
        { name: '숫자 슬라임', emoji: '🔢', color: '#34D399' },
        { name: '덧셈 고블린', emoji: '➕', color: '#60A5FA' },
        { name: '곱셈 트롤',   emoji: '✖️', color: '#FB923C' },
        { name: '도형 마법사', emoji: '📐', color: '#A78BFA' },
        { name: '분수 오크',   emoji: '🍕', color: '#F59E0B' },
      ],
      boss:  { name: '계산의 골렘',  emoji: '⚙️', color: '#94A3B8' },
      final: { name: '수학의 지배자', emoji: '🔱', color: '#FBBF24' },
    },
    '과학': {
      pool: [
        { name: '플랑크톤 슬라임', emoji: '🦠', color: '#4ADE80' },
        { name: '화산 고블린',     emoji: '🌋', color: '#F87171' },
        { name: '번개 트롤',       emoji: '⚡', color: '#FDE68A' },
        { name: '얼음 오크',       emoji: '❄️', color: '#BAE6FD' },
        { name: '독 박쥐',         emoji: '🦇', color: '#A3E635' },
      ],
      boss:  { name: '원소의 드래곤',  emoji: '🔬', color: '#22D3EE' },
      final: { name: '자연의 지배자', emoji: '🌍', color: '#10B981' },
    },
    '사회': {
      pool: [
        { name: '지도 슬라임',   emoji: '🗺️', color: '#60A5FA' },
        { name: '역사 유령',     emoji: '👻', color: '#D1D5DB' },
        { name: '법률 오크',     emoji: '⚖️', color: '#F59E0B' },
        { name: '경제 고블린',   emoji: '💹', color: '#34D399' },
        { name: '문화 마법사',   emoji: '🏛️', color: '#C084FC' },
      ],
      boss:  { name: '시간의 수호자', emoji: '⏳', color: '#F59E0B' },
      final: { name: '역사의 제왕',   emoji: '👑', color: '#EF4444' },
    },
    '영어': {
      pool: [
        { name: 'ABC 슬라임',   emoji: '🔤', color: '#60A5FA' },
        { name: '단어 고블린',  emoji: '💬', color: '#34D399' },
        { name: '문법 트롤',    emoji: '📋', color: '#F59E0B' },
        { name: '발음 박쥐',    emoji: '🦜', color: '#F472B6' },
        { name: '문장 마법사',  emoji: '✉️', color: '#A78BFA' },
      ],
      boss:  { name: '영어의 드래곤',  emoji: '🐲', color: '#3B82F6' },
      final: { name: 'English Master', emoji: '🌐', color: '#06B6D4' },
    },
    '도덕': {
      pool: [
        { name: '거짓말 슬라임', emoji: '🤥', color: '#F87171' },
        { name: '게으름 고블린', emoji: '😴', color: '#94A3B8' },
        { name: '욕심 오크',     emoji: '😈', color: '#F59E0B' },
        { name: '두려움 박쥐',   emoji: '😱', color: '#A78BFA' },
        { name: '불만 마법사',   emoji: '😤', color: '#FB923C' },
      ],
      boss:  { name: '혼돈의 드래곤', emoji: '💔', color: '#EF4444' },
      final: { name: '악의 마왕',     emoji: '☠️', color: '#7C3AED' },
    },
  },

  // ── Get monster data ──
  getMonster(subject, slotIdx, isBoss, isFinalBoss) {
    const lib = this.MONSTERS[subject] || this.MONSTERS['_default'];
    if (isFinalBoss) {
      const d = lib.final || this.MONSTERS['_default'].final;
      return { ...d, hp: this.FINAL_BOSS_HP, maxHp: this.FINAL_BOSS_HP };
    }
    if (isBoss) {
      const d = lib.boss || this.MONSTERS['_default'].boss;
      return { ...d, hp: this.BOSS_HP, maxHp: this.BOSS_HP };
    }
    const pool = lib.pool || this.MONSTERS['_default'].pool;
    const d = pool[slotIdx % pool.length];
    return { ...d, hp: this.REGULAR_HP, maxHp: this.REGULAR_HP };
  },

  // ── Calc reward when correct ──
  calcReward(isBoss, isFinalBoss, doubleActive) {
    let damage = isFinalBoss ? this.FINAL_DAMAGE : (isBoss ? this.BOSS_DAMAGE : this.CORRECT_DAMAGE);
    let gold   = isFinalBoss ? this.FINAL_GOLD   : (isBoss ? this.BOSS_GOLD   : this.CORRECT_GOLD);
    if (doubleActive) gold *= 2;
    return { damage, gold };
  },

  // ── Calc penalty when wrong ──
  calcPenalty(isBoss, isFinalBoss, shieldActive) {
    if (shieldActive) return { damage: 0, blocked: true };
    const damage = isFinalBoss ? this.FINAL_WRONG_DAMAGE : (isBoss ? this.BOSS_WRONG_DAMAGE : this.WRONG_DAMAGE);
    return { damage, blocked: false };
  },
};
