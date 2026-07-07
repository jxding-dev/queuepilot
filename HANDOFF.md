# QueuePilot — 작업 인수인계 (Handoff)

> 다른 컴퓨터에서 이어서 작업하기 위한 문서입니다. 이 파일 + 저장소만 있으면
> 빠짐없이 이어서 진행할 수 있도록 정리했습니다.
> (작성 기준일: **2026-07-05**, 마지막 갱신: **2026-07-07** — v2 전체 완료 반영)

QueuePilot은 브라우저에서 도는 **CSV → API 배치 러너**입니다. React + Vite +
TypeScript, 백엔드 없음, UI는 한국어(기술 용어는 영어 유지).

- 저장소: https://github.com/jxding-dev/queuepilot
- 라이브(GitHub Pages): **https://jxding-dev.github.io/queuepilot/**
- 기본 브랜치: `main` (푸시하면 GitHub Actions가 자동 배포)

---

## 1. 지금 상태 한눈에

- **v1**: 완료 + 배포됨 (Phase 1~6).
- **v2**: 8단계 **전부 완료** (P1~P8). 계획된 다음 phase 없음.
- 추가로 판매 준비 보안 수정 완료 (2026-07-07): 결과 CSV 수식 주입 방어,
  URL 토큰 percent-encoding (`fix(security)` 커밋).
- 마지막으로 `npm run build`(= `tsc --noEmit && vite build`)와 `npm test` **모두 통과**
  (테스트 48개 green).

V2 진행표(원본은 `V2-PROMPTS.md`의 Progress Tracker):

| 단계 | 내용 | 상태 |
|---|---|---|
| V2-P1 | "결과" 죽은 스텝 병합 (4→3 스텝) | ✅ 2026-07-05 |
| V2-P2 | `errorKind` + 429 자동 일시정지 + 조기 CORS 패널 | ✅ 2026-07-05 |
| V2-P3 | 요청 템플릿 localStorage 저장 | ✅ 2026-07-05 |
| V2-P4 | 전체 실행 시 테스트 성공 행 건너뛰기 | ✅ 2026-07-05 |
| V2-P5 | 응답 값 추출 (`qp_extracted`) | ✅ 2026-07-06 |
| V2-P6 | 데모 모드 ("샘플 데이터로 체험하기") | ✅ 2026-07-06 |
| V2-P7 | 영어 UI 토글 | ✅ 2026-07-06 |
| V2-P8 | Vercel 마이그레이션 준비 (`QP_BASE` env 기반) | ✅ 2026-07-06 |

---

## 2. 집 컴퓨터 셋업

필요: **Node.js 18+** (권장 20+), git.

```bash
git clone https://github.com/jxding-dev/queuepilot.git
cd queuepilot
npm install
```

주요 스크립트(`package.json`):

```bash
npm run dev        # 개발 서버 (기본 http://localhost:5173)
npm run build      # tsc --noEmit + vite 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
npm test           # 단위 테스트 (Vitest)
npm run typecheck  # 타입 체크만
```

> 참고: 이 저장소는 npm이 설치 스크립트를 막는 환경에서 만들어져서, 한 번
> `npm approve-scripts esbuild` 가 필요할 수 있습니다(빌드가 esbuild 바이너리를
> 못 찾으면 실행). 일반 환경이면 무시하세요.

---

## 3. 로컬 목(mock) 서버 — 검증용 (중요)

각 phase의 검증 체크리스트는 **실제 네트워크 대신 로컬 목 서버**로 확인합니다
(절대 실제 외부 API로 테스트하지 않음). 이 파일은 `scratch/`에 있고 **저장소에는
올라가지 않으므로**(로컬 전용), 아래 내용을 그대로 `scratch/echo-server.mjs`로
저장해서 쓰세요.

실행: `node scratch/echo-server.mjs` → `http://localhost:8787`

라우트: `/status/404` `/status/500` `/status/429`(상태코드 반환),
`/slow`(35초 뒤 응답 → 30초 타임아웃 유발), 그 외는 요청을 그대로 echo(JSON).
콘솔에 요청 로그를 찍어 "몇 번 전송됐는지" 검증에 씁니다. CORS는 permissive.

```js
// scratch/echo-server.mjs — 테스트 전용. 앱 번들/deps 아님.
import http from 'node:http';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const server = http.createServer((req, res) => {
  console.log(new Date().toISOString(), req.method, req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  const status = req.url.match(/^\/status\/(\d{3})/);
  if (status) {
    res.writeHead(Number(status[1]), CORS);
    return res.end(`status ${status[1]}`);
  }

  if (req.url.startsWith('/slow')) {
    setTimeout(() => {
      res.writeHead(200, CORS);
      res.end('slow done');
    }, 35_000);
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
  });
});

server.listen(8787, () => console.log('echo server on http://localhost:8787'));
```

브라우저에서 검증할 때는 앱에서 URL 템플릿을 `http://localhost:8787{{경로컬럼}}`
식으로 두고 실행하면 됩니다.

---

## 4. 다음에 할 일 — 실행 프로토콜

작업은 **한 번에 한 phase씩** 진행합니다. 순서:

1. `CLAUDE.md`를 먼저 읽고 그대로 따른다.
2. `V2-PROMPTS.md`의 Progress Tracker에서 **첫 번째 미완료(`[ ]`) phase**를 찾는다
   (현재 미완료 phase 없음 — v2 완료. 새 작업은 새 phase 계획부터).
3. 그 phase의 "Read before editing" 파일을 모두 읽는다.
4. **그 phase만** 정확히 구현한다. 뒤 phase 내용 미리 하지 않기, 스코프 확장 금지,
   무관한 리팩터링 금지. 의존성 주의(P7은 P2 필요 — 이미 충족).
5. 검증 체크리스트를 **실제로 실행**한다(목 서버 사용). 안 돌린 검증을 통과했다고
   말하지 않기.
6. 끝나면 `V2-PROMPTS.md`에서 해당 phase를 `[x]` + 날짜로 표시하고,
   `Done. / Changed: / Checked: / Notes:` 형식으로 보고 후 **정지**. 다음 phase로
   자동 진행하지 않기. 사용자가 명시적으로 요청하기 전엔 커밋/푸시하지 않기.

### 집에서 다음 에이전트에게 그대로 붙여넣을 프롬프트

```
You are a careful senior frontend engineer working on QueuePilot, a browser-based
CSV-to-API batch runner (React + Vite + TypeScript, Korean UI, no backend).

Read in order: 1) CLAUDE.md  2) V2-PROMPTS.md (phase plan + Progress Tracker)
3) the "Read before editing" files of the target phase.

Find the FIRST unchecked phase in V2-PROMPTS.md's Progress Tracker, announce it,
and execute ONLY that phase exactly as written — no later-phase work, no scope
creep, no unrelated refactors. Respect dependency notes. Run the phase's
verification checklist for real, using a local mock server (scratch/echo-server.mjs)
for network checks — never real third-party APIs. When done, mark the phase [x]
with today's date in V2-PROMPTS.md, report as Done./Changed:/Checked:/Notes:, and
STOP. Do not commit or push. UI copy is Korean (strings live in
src/constants/copy.ts); code/comments/identifiers stay English.
```

V2-P5~P8의 **정확한 지시와 검증 체크리스트는 `V2-PROMPTS.md`에 그대로 있습니다.**
(요약: P5=응답 JSON에서 dot-path로 값 추출 → `qp_extracted` 컬럼, 새 파일
`src/engine/extract.ts` + 테스트; P6=가짜 데이터/가짜 API 데모 모드; P7=한/영 UI
토글(엔진의 에러 문자열을 주입식으로 분리); P8=`base` 경로를 env로 만들어 Vercel
루트 배포 대비.)

---

## 5. 저장소에 **없는**(로컬 전용) 파일 — 챙길 것

`.gitignore` 정책상 아래는 GitHub에 올라가지 않습니다. 집에서 필요하면 이렇게:

- `scratch/echo-server.mjs` — **§3에 전문 포함**. 그대로 저장해서 사용.
- `AGENTS.md`, `BLUEPRINT.md`, `PROJECT.md` — v1 배경 문서/템플릿. **V2 진행에는
  불필요**. (원본이 필요하면 이 컴퓨터에서 따로 복사. 없어도 P5~P8 진행 가능.)
- `.claude/`, `dist/`, `node_modules/` — 로컬 산출물/설정. 자동 생성됨.

공개(저장소에 있음): `README.md`, `HANDOFF.md`(이 파일), `V2-PROMPTS.md`,
`CLAUDE.md`, 그리고 `src/**` 전체 · 빌드 설정 · `.github/workflows/deploy.yml`.

---

## 6. 아키텍처 / 알아둘 것 (institutional knowledge)

- **엔진 규칙:** `src/engine/`는 **React/zustand를 import하면 안 됨** (순수 TS,
  단위 테스트 가능). 큐 러너·템플릿·에러 매핑·(예정)추출이 여기.
- `src/state/store.ts` — 단일 Zustand 스토어(csv / config / run / ui 슬라이스).
  실행 로직은 `beginRun`에 있음(sample/full/retry 모드).
- **실행 pacing은 시작 시 고정:** `runQueue`가 concurrency/delay를 실행 시작 시점에
  캡처함. 그래서 일시정지 중 preset을 바꿔도 **현재 실행의 속도는 안 바뀌고 다음
  실행부터 적용**됨(P2에서 남긴 한계). 엔진 변경은 스코프 밖.
- **`errorKind`(P2):** 실패를 문자열이 아니라 machine-readable 종류로 분류
  (`http_4xx/http_429/http_5xx/timeout/network/aborted/...`). CORS 패널과 429
  자동 일시정지는 이 kind 기반. (아직 `RetryFailedButton.tsx`는 timeout/abort
  판별에 문자열 비교를 씀 — P7에서 정리 후보.)
- **429 자동 일시정지(P2):** `beginRun`의 onResult에서 429를 카운트, 3개마다 자동
  일시정지(카운터는 매 발동마다 리셋). 일시정지 중엔 preset 편집 가능.
- **설정 저장(P3):** `src/lib/configStorage.ts` (순수 TS, 기본값은 인자로 주입해
  순환 import 회피). 스토어가 `useStore.subscribe`로 config/preset 변경을 ~300ms
  디바운스 저장. **인증성 Header 값**(`authorization|api[-_]?key|token|secret|
  password|bearer`)은 기본 제외, 옵트인 시에만 저장. CSV/결과는 절대 저장 안 함.
- **성공 행 건너뛰기(P4):** `skipSampledSuccess`(기본 on). full 실행 때 이미 성공한
  행을 재전송하지 않고 결과 유지. `runBaselineDone`로 ETA에서 사전 완료 행을 제외.
- **결과 CSV(`src/lib/csv.ts`):** 원본 컬럼 + `qp_status/qp_http_status/qp_error/
  qp_response/qp_attempts` (+ P5에서 `qp_extracted` 추가 예정). UTF-8 BOM. 원본에
  `qp_*` 컬럼이 있으면 `_2` 접미사로 충돌 회피.
- **스텝(P1):** 이제 3스텝 — `CSV 업로드 / 요청 설정 / 실행 · 결과`. 결과는 실행
  스텝(`RunControls.tsx`) 안에 있음.

### localStorage 키 (이것 외에는 쓰지 않음)

- `qp_privacy_dismissed` — 첫 방문 개인정보 배너 닫음 상태.
- `qp_config_v1` — 요청 템플릿 + preset + 인증저장여부. (CSV/결과는 저장 안 함.)
- (P7 예정: `qp_locale` — 한/영 토글.)

---

## 7. 알려진 한계 / 이월 항목

- **CORS 실측 완료 (2026-07-07):** 실제 타사 API 10곳을 브라우저에서 직접 호출해
  확인 — 8곳 사용 가능, Notion·SendGrid는 차단(프록시 필요). 결과 표는 README의
  "CORS 호환성 실측" 섹션 참고. 프록시/클라우드 러너는 차단 API 지원용 로드맵 후보.
- 일시정지 중 preset 변경은 다음 실행부터 적용(§6).
- `RetryFailedButton.tsx`의 문자열 비교(§6) — `errorKind`로 이전 후보.
- 결과 표는 가상 스크롤 없이 50행/페이지 페이지네이션.

---

## 8. Git / 배포 운영 메모

- `main`에 push하면 `.github/workflows/deploy.yml`가 빌드 후 GitHub Pages로 배포.
  (Settings → Pages → Source = **GitHub Actions**로 이미 설정됨.)
- `vite.config.ts`는 프로덕션에서 `base: '/queuepilot/'` (Pages 서브경로). **V2-P8**
  때 이걸 env(`QP_BASE`) 기반으로 바꿔 Vercel 루트 배포까지 대응 예정.
- 커밋 규칙: 요청 시에만 커밋/푸시, force-push 금지, hook/서명 우회 금지.

문제 생기면 이 파일 §4의 프로토콜대로 `V2-PROMPTS.md` 다음 미완료 phase부터
그대로 이어서 진행하면 됩니다.
