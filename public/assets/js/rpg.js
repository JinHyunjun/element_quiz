/** 협동 던전의 세계관, 전투 규칙, 보상과 AI 실패 시 사용할 참여 미션입니다. */
const QuizKit = {
  typeLabels: { multiple: "선택의 룬", ox: "진실의 문", talk: "파티 미션" },
  optionLabels: ["①", "②", "③", "④"],
  teamNames: ["불꽃 길드", "파도 길드", "바람 길드", "별빛 길드"],
  teamRoles: ["용기의 수호자", "지혜의 탐험가", "기록의 마법사", "협동의 길잡이"],
  attack: { challenge: 6, correct: 14, cooperation: 10, courage: 6 },
  rewards: [
    { id: "compass", threshold: 4, emoji: "🧭", name: "힌트 나침반", description: "객관식 오답 두 개를 흐리게 표시" },
    { id: "sand", threshold: 8, emoji: "⌛", name: "시간의 모래", description: "작전 시간 30초 추가" },
    { id: "banner", threshold: 12, emoji: "🚩", name: "용기의 깃발", description: "첫 참여 모험가의 다음 공격 강화" }
  ],
  worlds: {
    "국어": {
      name: "잃어버린 이야기 도서관", emblem: "📚", boss: "침묵의 마왕 모르가", bossEmoji: "👁️",
      intro: "마왕이 이야기의 낱말과 문장을 훔쳐 갔어요. 네 서고를 지나 이야기의 빛을 되찾으세요.",
      stages: [
        { name: "속삭임의 서고", enemy: "낱말 먹보 미믹", emoji: "📕", story: "흩어진 낱말이 길을 막고 있습니다." },
        { name: "문장의 회랑", enemy: "쉼표 유령", emoji: "👻", story: "문장의 뜻을 뒤섞는 유령이 나타났습니다." },
        { name: "이야기의 탑", enemy: "줄거리 그리핀", emoji: "🦅", story: "핵심 생각을 지키는 수호자를 설득하세요." },
        { name: "침묵의 왕좌", enemy: "침묵의 마왕 모르가", emoji: "👁️", story: "마지막 이야기의 빛을 되찾을 시간입니다!" }
      ]
    },
    "영어": {
      name: "메아리 언어 왕국", emblem: "🗣️", boss: "침묵의 마왕 모르가", bossEmoji: "👁️",
      intro: "왕국의 말과 인사가 사라졌어요. 소리와 표현의 룬을 모아 침묵의 주문을 깨뜨리세요.",
      stages: [
        { name: "인사의 마을", enemy: "메아리 슬라임", emoji: "🟢", story: "사라진 인사말을 되찾아야 합니다." },
        { name: "표현의 숲", enemy: "단어 픽시", emoji: "🧚", story: "알맞은 표현이 숲속에 숨어 있습니다." },
        { name: "대화의 탑", enemy: "문장 가고일", emoji: "🗿", story: "말하고 듣는 힘으로 봉인을 여세요." },
        { name: "침묵의 왕좌", enemy: "침묵의 마왕 모르가", emoji: "👁️", story: "원정대의 목소리를 하나로 모으세요!" }
      ]
    },
    "수학": {
      name: "시간 톱니의 성", emblem: "⚙️", boss: "혼돈의 계산왕 크로노", bossEmoji: "🤖",
      intro: "숫자 톱니가 뒤엉켜 시간의 성이 멈췄어요. 규칙과 계산의 룬으로 성을 다시 움직이세요.",
      stages: [
        { name: "숫자의 광장", enemy: "덧셈 슬라임", emoji: "🟣", story: "숫자 조각을 알맞게 맞춰 길을 만드세요." },
        { name: "도형의 미궁", enemy: "각도 미노타우로스", emoji: "🐂", story: "도형의 미궁이 원정대를 시험합니다." },
        { name: "규칙의 기계실", enemy: "톱니 골렘", emoji: "⚙️", story: "숨은 규칙을 찾아 기계를 작동시키세요." },
        { name: "시간의 왕좌", enemy: "혼돈의 계산왕 크로노", emoji: "🤖", story: "모든 수학 룬을 연결할 마지막 전투입니다!" }
      ]
    },
    "과학": {
      name: "별빛 비밀 연구소", emblem: "🔭", boss: "안개 괴수 네뷸라", bossEmoji: "🐙",
      intro: "정체불명의 안개가 연구소를 덮었어요. 관찰과 추리의 빛으로 네뷸라의 비밀을 밝혀내세요.",
      stages: [
        { name: "관찰의 온실", enemy: "포자 버섯왕", emoji: "🍄", story: "작은 변화를 관찰해야 문이 열립니다." },
        { name: "실험의 수로", enemy: "거품 정령", emoji: "🫧", story: "실험 결과를 예상해 수로를 건너세요." },
        { name: "별빛 관측실", enemy: "수수께끼 코멧", emoji: "☄️", story: "증거를 모아 현상의 까닭을 밝혀내세요." },
        { name: "안개의 핵", enemy: "안개 괴수 네뷸라", emoji: "🐙", story: "관찰한 증거로 안개의 핵을 정화하세요!" }
      ]
    },
    "사회": {
      name: "기억을 잃은 도시 아르카", emblem: "🏛️", boss: "망각의 군주 오블리온", bossEmoji: "🐲",
      intro: "도시의 지도와 역사가 사라졌어요. 사람들의 기억을 모아 아르카를 되살리세요.",
      stages: [
        { name: "지도의 관문", enemy: "방향 도깨비", emoji: "🧭", story: "지도를 읽어 올바른 길을 찾아야 합니다." },
        { name: "시간의 시장", enemy: "기억 도둑", emoji: "🦹", story: "과거와 오늘의 단서를 비교하세요." },
        { name: "시민의 의회", enemy: "혼란의 스핑크스", emoji: "🦁", story: "서로 다른 생각을 모아 도시를 지키세요." },
        { name: "망각의 성", enemy: "망각의 군주 오블리온", emoji: "🐲", story: "도시의 모든 기억을 하나로 연결하세요!" }
      ]
    },
    "도덕": {
      name: "마음의 수호 성채", emblem: "🛡️", boss: "갈등의 그림자 디스코드", bossEmoji: "🌑",
      intro: "서로를 잇던 마음의 다리가 무너졌어요. 배려와 공정의 룬으로 성채를 지켜내세요.",
      stages: [
        { name: "경청의 다리", enemy: "말 끊는 임프", emoji: "😈", story: "친구의 생각을 끝까지 들으며 건너세요." },
        { name: "선택의 정원", enemy: "유혹의 여우", emoji: "🦊", story: "더 나은 선택과 그 까닭을 찾아보세요." },
        { name: "약속의 성문", enemy: "규칙 가고일", emoji: "🗿", story: "모두를 위한 약속으로 성문을 여세요." },
        { name: "그림자의 방", enemy: "갈등의 그림자 디스코드", emoji: "🌑", story: "서로의 마음을 모아 그림자를 밝혀내세요!" }
      ]
    },
    "_default": {
      name: "별빛 지식의 성", emblem: "🌌", boss: "망각의 마왕 녹스", bossEmoji: "🐉",
      intro: "지식의 빛을 훔쳐 간 마왕을 쫓아 네 구역의 던전을 탐험합니다.",
      stages: [
        { name: "메아리 동굴", enemy: "수수께끼 박쥐", emoji: "🦇", story: "첫 번째 지식의 문이 원정대를 기다립니다." },
        { name: "수정 숲", enemy: "수정 골렘", emoji: "💎", story: "팀의 생각을 모아 수정 길을 밝히세요." },
        { name: "구름 탑", enemy: "번개 그리핀", emoji: "🦅", story: "설명과 추리의 힘으로 탑을 오르세요." },
        { name: "망각의 왕좌", enemy: "망각의 마왕 녹스", emoji: "🐉", story: "모든 길드의 힘을 모을 마지막 전투입니다!" }
      ]
    }
  },

  getWorld(subject) {
    return this.worlds[subject] || this.worlds._default;
  },

  stageIndex(questionIndex, totalQuestions) {
    if (questionIndex >= totalQuestions - 1) return 3;
    return Math.min(2, Math.floor((questionIndex * 3) / Math.max(1, totalQuestions - 1)));
  },

  bossMaxHp(questionCount, teamCount) {
    return Math.max(80, Number(questionCount) * Number(teamCount) * 15);
  },

  damageFor(points) {
    if (Number(points) >= 2) return this.attack.correct;
    if (Number(points) >= 1) return this.attack.challenge;
    return 0;
  },

  rewardIdsForStars(stars) {
    return this.rewards.filter((reward) => Number(stars) >= reward.threshold).map((reward) => reward.id);
  },

  fallbackQuestions({ topic, count }) {
    const safeTopic = topic || "오늘 배운 내용";
    const templates = [
      { type: "talk", question: `‘${safeTopic}’에서 가장 중요한 낱말 하나를 짝에게 설명하세요.`, answer: "핵심 낱말과 뜻을 자신의 말로 설명하면 성공!", explanation: "친구의 설명에서 새롭게 알게 된 점도 찾아보세요." },
      { type: "ox", question: "잘 모르는 부분을 질문하는 것도 수업에 참여하는 방법이다.", answer: true, explanation: "좋은 질문은 원정대 모두의 이해를 도와요." },
      { type: "talk", question: `‘${safeTopic}’을 처음 배우는 친구에게 20초 안에 소개하세요.`, answer: "주제와 관련된 핵심 생각이 한 가지 들어가면 성공!", explanation: "짧게 설명할수록 핵심이 더 잘 보여요." },
      { type: "multiple", question: "새로운 지식을 오래 기억하는 데 가장 도움이 되는 행동은?", options: ["그냥 보기", "내 말로 설명하기", "답만 외우기", "모른 척하기"], answer: 1, explanation: "자신의 말로 설명하면 이해한 부분과 헷갈리는 부분이 보여요." },
      { type: "talk", question: `‘${safeTopic}’과 우리 생활이 연결되는 예를 길드에서 하나 찾으세요.`, answer: "주제와 생활을 자연스럽게 연결한 예라면 성공!", explanation: "배운 것을 생활과 연결하면 지식이 더 선명해져요." },
      { type: "ox", question: "친구와 답이 다를 때 이유를 물어보며 비교할 수 있다.", answer: true, explanation: "서로 다른 생각의 이유를 듣는 과정에서 더 깊이 배울 수 있어요." },
      { type: "talk", question: `오늘 ‘${safeTopic}’에서 아직 궁금한 점을 질문으로 만드세요.`, answer: "주제와 관련된 궁금증을 질문 문장으로 말하면 성공!", explanation: "궁금증은 다음 배움을 여는 열쇠예요." },
      { type: "multiple", question: "길드 친구가 발표할 때 가장 좋은 참여 모습은?", options: ["끝까지 듣기", "먼저 말하기", "딴짓하기", "답만 재촉하기"], answer: 0, explanation: "잘 듣는 것도 발표만큼 중요한 협동이에요." },
      { type: "talk", question: `‘${safeTopic}’을 그림이나 몸짓 하나로 표현하고 길드가 맞혀 보세요.`, answer: "주제와 연결되는 표현을 하고 길드가 까닭을 말하면 성공!", explanation: "다양한 방식으로 생각을 표현할 수 있어요." },
      { type: "talk", question: `오늘 배운 ‘${safeTopic}’을 한 문장으로 정리하세요.`, answer: "오늘 배운 핵심 생각이 들어간 문장이면 성공!", explanation: "마지막 한 문장이 오늘의 기억을 단단하게 묶어 줘요." }
    ];
    return templates.slice(0, Math.max(1, Math.min(Number(count) || 6, templates.length)));
  }
};
