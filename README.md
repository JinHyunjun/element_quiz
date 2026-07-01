# 모두의 탐험대

초등학생의 수업 참여를 돕는 교사용 퀴즈 도구입니다. 출석 확인, 자동 팀 편성, 참여 횟수가 적은 학생을 우선하는 발표자 추천, 도전 중심 보상, 수업 종료 리포트를 하나의 흐름으로 연결합니다.

## 이번 개편의 핵심

- 깨진 한국어 인코딩과 잘못 닫힌 화면 요소를 전면 교체했습니다.
- 오답 체력 차감과 공개 순위 대신 `도전 +1`, `정답 +2`의 긍정 보상을 사용합니다.
- 학생별 출석과 참여 횟수를 기록하고, 참여가 적은 학생에게 발표 기회를 우선 제안합니다.
- 객관식·O/X뿐 아니라 짝·팀 말하기 미션을 섞습니다.
- AI 연결이 없거나 실패해도 검증된 참여 미션으로 바로 수업을 진행합니다.
- 학생 이름은 브라우저 안에서만 처리하며 AI API에는 학년·교과·수업 주제만 전송합니다.
- 수업 종료 후 학생별 기록을 CSV로 저장할 수 있습니다.

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
copy .env.example .dev.vars
npm run dev
```

`.dev.vars`의 `GEMINI_API_KEY`에 Google AI Studio 키를 넣으면 AI 문항을 생성합니다. 키가 없어도 참여 미션 모드로 전체 흐름을 사용할 수 있습니다.

검증 명령:

```bash
npm run check
```

## Cloudflare Pages 배포

### GitHub 연결 방식

Cloudflare 대시보드에서 Workers & Pages → Create → Pages → Connect to Git으로 `JinHyunjun/element_quiz`를 연결합니다.

- Build command: 비워 두기
- Build output directory: `public`
- Root directory: `/`

프로덕션 환경 변수에는 `GEMINI_API_KEY`를 암호화된 secret으로 등록합니다. `wrangler.jsonc`를 배포 설정의 기준으로 사용하므로 대시보드 설정과 일치하는지 확인하세요.

### CLI 방식

```bash
npx wrangler login
npx wrangler pages secret put GEMINI_API_KEY --project-name=element-quiz
npm run deploy
```

## 현재 동기화 범위

교사용 화면과 학생용 화면은 같은 브라우저 프로필의 탭·창 사이에서 실시간 동기화됩니다. 학생 화면은 교사용 화면의 `학생 화면 열기` 버튼으로 여는 구성이 가장 안정적입니다. 서로 다른 기기까지 같은 수업에 접속시키려면 다음 단계에서 Cloudflare Durable Objects 기반 수업 코드를 추가할 수 있습니다.

## 파일 구조

- `public/index.html`: 교사용 준비·진행·리포트 화면
- `public/display.html`: 프로젝터용 학생 화면
- `public/assets/js/state.js`: 같은 브라우저 창 사이 상태 동기화
- `functions/api/generate.js`: Gemini 문항 생성과 서버 검증
- `public/_headers`: 보안 및 캐시 헤더
- `public/_routes.json`: API 요청만 Pages Functions로 전달
