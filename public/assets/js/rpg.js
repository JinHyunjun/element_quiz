/** 퀴즈 경험에 필요한 표시 규칙과 AI 실패 시 사용할 참여 미션입니다. */
const QuizKit = {
  typeLabels: { multiple: "골라 보기", ox: "O · X", talk: "함께 말하기" },
  optionLabels: ["①", "②", "③", "④"],
  teamNames: ["새싹 팀", "파도 팀", "햇살 팀", "별빛 팀"],

  fallbackQuestions({ topic, count }) {
    const safeTopic = topic || "오늘 배운 내용";
    const templates = [
      {
        type: "talk",
        question: `‘${safeTopic}’에서 가장 기억에 남는 낱말 하나를 짝에게 설명해 보세요.`,
        answer: "핵심 낱말과 그 뜻을 자신의 말로 설명하면 성공!",
        explanation: "친구의 설명에서 새롭게 알게 된 점도 한 가지 찾아보세요."
      },
      {
        type: "ox",
        question: "잘 모르는 부분을 질문하는 것도 수업에 참여하는 방법이다.",
        answer: true,
        explanation: "맞아요. 좋은 질문은 모두의 이해를 돕는 소중한 참여예요."
      },
      {
        type: "talk",
        question: `‘${safeTopic}’을 처음 배우는 친구에게 20초 안에 소개해 보세요.`,
        answer: "주제와 관련된 핵심 생각이 한 가지 들어가면 성공!",
        explanation: "짧게 설명할수록 무엇이 핵심인지 더 잘 드러나요."
      },
      {
        type: "multiple",
        question: "새로운 내용을 오래 기억하는 데 가장 도움이 되는 행동은 무엇일까요?",
        options: ["그냥 보기", "내 말로 설명하기", "답만 외우기", "모른 척하기"],
        answer: 1,
        explanation: "배운 내용을 자신의 말로 설명하면 이해한 부분과 헷갈리는 부분이 보여요."
      },
      {
        type: "talk",
        question: `‘${safeTopic}’과 우리 생활이 연결되는 예를 팀에서 하나 찾아보세요.`,
        answer: "주제와 생활을 자연스럽게 연결한 예라면 모두 성공!",
        explanation: "배운 것을 생활과 연결하면 지식이 더 선명해져요."
      },
      {
        type: "ox",
        question: "친구와 답이 다를 때는 이유를 물어보며 비교해 볼 수 있다.",
        answer: true,
        explanation: "서로 다른 생각의 이유를 듣는 과정에서 더 깊이 배울 수 있어요."
      },
      {
        type: "talk",
        question: `오늘 ‘${safeTopic}’에서 아직 궁금한 점을 질문으로 만들어 보세요.`,
        answer: "주제와 관련된 궁금증을 질문 문장으로 말하면 성공!",
        explanation: "궁금증은 다음 배움을 여는 출발점이에요."
      },
      {
        type: "multiple",
        question: "팀 친구가 발표할 때 가장 좋은 참여 모습은 무엇일까요?",
        options: ["끝까지 듣기", "먼저 말하기", "딴짓하기", "답만 재촉하기"],
        answer: 0,
        explanation: "잘 듣는 것도 발표만큼 중요한 참여예요."
      },
      {
        type: "talk",
        question: `‘${safeTopic}’을 그림이나 몸짓 하나로 표현하고 팀이 맞혀 보세요.`,
        answer: "주제와 연결되는 표현을 하고 팀이 까닭을 말하면 성공!",
        explanation: "말·그림·몸짓처럼 다양한 방식으로 생각을 표현할 수 있어요."
      },
      {
        type: "talk",
        question: `오늘 배운 ‘${safeTopic}’을 한 문장으로 정리해 보세요.`,
        answer: "오늘 배운 핵심 생각이 들어간 문장이면 성공!",
        explanation: "마지막 한 문장이 오늘의 기억을 단단하게 묶어 줘요."
      }
    ];
    return templates.slice(0, Math.max(1, Math.min(Number(count) || 6, templates.length)));
  }
};
