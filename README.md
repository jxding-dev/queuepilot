# QueuePilot

> CSV 한 줄 = API 요청 하나. 브라우저에서 돌아가는 CSV→API 배치 러너입니다.

QueuePilot은 CSV 파일을 API 요청 묶음으로 바꿔 실행합니다. CSV를 업로드하고,
`{{컬럼}}` 토큰으로 요청 하나를 설계한 뒤, 행마다 요청을 보냅니다 — 동시 실행 제한,
지연, 재시도, 행별 상태, 병합된 결과 CSV까지. **모든 작업은 브라우저 안에서** 처리되며,
CSV와 API 키는 어떤 서버로도 전송되지 않습니다.

한 줄 요약: **"CSV를 올리고 → 컬럼을 API 요청에 매핑하고 → 안전하게 실행하고 → 결과를 내려받는다."**

## 왜 만들었나

"이 스프레드시트의 각 행마다 API를 한 번씩 호출해줘"는 흔한 작업이지만 마땅한 도구가 없습니다.

- **스크립트 작성** — 대부분의 운영/마케팅/관리 담당자는 못 하거나, 유지보수하고 싶어 하지 않습니다.
- **Postman** — Collection Runner로 가능하지만 개발자 도구에 묻혀 있고, 행별 실패 파악이 약하며, 병합 결과 파일이 없습니다.
- **Zapier/n8n** — 강력하지만 일회성 백필을 위해 워크플로를 짜고 태스크당 비용을 내야 합니다.

QueuePilot은 **CSV 자체가 주인공**인 네 번째 답입니다. "그냥 안전한 반복문"에 집중합니다.

## 주요 기능

- **CSV 업로드** — 드래그앤드롭 + 파일 선택, 헤더 정규화(중복/빈 헤더 자동 처리), 미리보기
- **요청 설계** — GET/POST/PUT/PATCH/DELETE, URL·Header·Body 템플릿, 컬럼 칩 클릭으로 `{{토큰}}` 삽입, 1번 행 기준 실시간 미리보기
- **속도 프리셋** — 안전(1/1000ms) · 균형(3/500ms) · 빠름(5/200ms)
- **안전한 실행** — 5행 샘플 테스트 후에만 전체 실행 오픈, 일시정지/재개/중지
- **행별 결과** — 상태(대기/성공/실패) + 사람이 읽을 수 있는 실패 사유, 진행률·예상 시간, 필터·페이지네이션
- **실패 행만 재시도** — 성공한 행은 다시 보내지 않음
- **결과 내보내기** — 원본 컬럼 + `qp_status`, `qp_http_status`, `qp_error`, `qp_response`, `qp_attempts` (UTF-8 BOM, Excel 호환)
- **한국어 UI** — 기술 용어(CSV·API·URL·Header·Body·JSON·HTTP 메서드)는 영어 유지

## 기술 스택

- **React 18 + TypeScript + Vite**
- **상태 관리:** Zustand (단일 스토어)
- **CSV 파싱/생성:** PapaParse
- 백엔드 없음. 런타임 의존성 약 4개.

핵심 설계: `src/engine/`는 **React import이 전혀 없는 순수 TypeScript** — 큐 러너·템플릿·에러 매핑을 독립적으로 단위 테스트할 수 있습니다.

## 시작하기

요구사항: **Node.js 18+**

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 타입 체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm test         # 단위 테스트 (Vitest)
npm run typecheck# 타입 체크만
```

## 사용 흐름

상단 스텝퍼를 따라 4단계로 진행합니다.

```
1. CSV 업로드   →   2. 요청 설정   →   3. 실행   →   4. 결과
   드롭·미리보기      메서드/URL/         샘플 5행       상태·재시도
   헤더 확인          Header/Body         전체 실행       CSV 내보내기
                      {{컬럼}} 삽입        일시정지/중지
```

각 단계는 완료되어야 다음으로 넘어갈 수 있습니다(예: URL 미입력·미해결 토큰이 있으면 실행 단계가 잠깁니다).

## 프로젝트 구조

```
src/
├─ App.tsx              # 스텝퍼 셸 + 문서 제목/개인정보 배너
├─ components/          # Upload / Build / Run / Results UI
├─ engine/              # (React 무관) 큐 러너·템플릿·에러 매핑
│  ├─ queueRunner.ts    #   공유 커서 프로미스 풀 + 일시정지 게이트/중지 + 요청 실행기
│  ├─ templating.ts     #   {{토큰}} 추출/치환(JSON 이스케이프)
│  └─ errors.ts         #   응답/오류 → 사람이 읽는 메시지
├─ lib/                 # csv 파싱/결과 CSV 생성, 속도 프리셋
├─ state/store.ts       # Zustand 스토어 (csv / config / run / ui)
├─ constants/copy.ts    # 화면 문구(한국어) 모음
└─ types.ts             # 도메인 타입
```

## 테스트

```bash
npm test
```

- `engine/templating.test.ts` — 토큰 추출/치환, JSON 이스케이프
- `engine/queueRunner.test.ts` — 동시성 상한, 각 행 정확히 1회 처리, 중지/일시정지 게이트
- `lib/csv.test.ts` — 결과 CSV 컬럼 순서, `qp_` 충돌 처리, 콤마/따옴표/줄바꿈 이스케이프

실제 네트워크 동작(성공/4xx/5xx/타임아웃/CORS)은 로컬 목(mock) HTTP 서버로 확인할 수 있습니다.

## 개인정보 / 보안

- CSV는 브라우저(FileReader)에서 읽고, 요청은 사용자가 지정한 대상 API로만 전송됩니다.
- 결과와 API 키는 탭 메모리에만 존재하며, 별도 서버로 전송되지 않습니다.
- localStorage 사용 범위: (1) 첫 방문 안내 배너의 "닫기" 상태, (2) 요청 설정(메서드/URL/Header/Body + 전송 속도)의 자동 저장. **CSV 데이터와 실행 결과는 절대 저장하지 않습니다.**
- 인증 관련 Header 값(`Authorization`, `api-key`, `token`, `secret`, `password`, `bearer` 등)은 기본적으로 저장에서 제외됩니다. 필요 시 요청 설정 화면에서 명시적으로 "인증 관련 Header 값도 저장"을 선택할 수 있습니다(공용 PC에서는 권장하지 않음).
- URL 템플릿의 `{{토큰}}` 값은 percent-encoding 처리되어 셀 값이 URL을 깨뜨리거나 쿼리 파라미터를 주입할 수 없습니다. 예외: URL 템플릿 전체가 토큰 하나(`{{url}}`)면 셀 값을 URL 그대로 사용합니다.
- 결과 CSV의 `qp_error`/`qp_response`/`qp_extracted` 셀이 `=` `@` `+` `-`로 시작하면 `'`를 붙여 Excel/Sheets 수식 실행(수식 주입)을 차단합니다(순수 숫자는 제외, 원본 컬럼은 그대로 유지).
- "설정 초기화"로 저장된 설정을 언제든 삭제할 수 있습니다.

## 알려진 한계

- **CORS** — 브라우저 전용이므로, CORS를 허용하지 않는 API는 요청이 차단됩니다. 이 경우 샘플 실행에서 즉시 안내 패널로 표시됩니다. 아래는 대표 API 10곳 실측 결과입니다.
- 결과 표는 가상 스크롤 대신 페이지네이션(50행/페이지)을 사용합니다.
- 유효성 검사 규칙, 클라우드 프록시(CORS 차단 API 지원)는 다음 버전 후보입니다.

### CORS 호환성 실측 (2026-07-07)

브라우저에서 GET + `Authorization` 헤더(preflight 유발)로 직접 호출해 확인한 결과입니다.
읽을 수 있는 HTTP 응답(401 포함)이 오면 호환, 브라우저가 요청 자체를 차단하면 비호환입니다.

| API | 브라우저 직접 호출 | 비고 |
|---|---|---|
| GitHub | ✅ | |
| Airtable | ✅ | |
| Google Sheets | ✅ | |
| Stripe | ✅ | |
| OpenAI | ✅ | |
| Kakao | ✅ | |
| Telegram Bot | ✅ | 토큰이 URL 경로에 들어가는 방식이라 사용 가능 (`Authorization` 헤더는 차단) |
| Slack | ⚠️ | 단순 요청만 허용 — `Authorization` 헤더가 preflight에서 차단됨 |
| Notion | ❌ | CORS 차단 — 프록시 필요 |
| SendGrid | ❌ | CORS 차단 — 프록시 필요 |

측정은 단일 오리진(localhost) 기준이며, 각 API의 CORS 정책이 바뀌면 결과도 달라질 수 있습니다.
- **도메인/오리진 변경 시** localStorage는 오리진 단위로 저장되므로, 배포 주소가 바뀌면
  저장된 설정·안내 배너 상태가 "초기화된 것처럼" 보입니다. 오리진 간 이전(마이그레이션)은
  불가능합니다.

## 배포

베이스 경로는 환경변수 `QP_BASE`로 결정됩니다. 설정하지 않으면 루트(`/`)가 기본값이며,
GitHub Pages 배포 워크플로만 `QP_BASE=/queuepilot/`를 지정합니다. 덕분에 **같은 코드**가
Pages(서브경로)와 Vercel(루트) 양쪽에서 동작합니다.

### GitHub Pages (현재)

`main`에 push하면 `.github/workflows/deploy.yml`가 빌드 후 Pages로 자동 배포합니다
(Settings → Pages → Source = **GitHub Actions**). 워크플로의 빌드 단계가 `QP_BASE`를
지정하므로 자산 경로는 `/queuepilot/assets/...`가 됩니다.

### Vercel

`vercel.json`은 필요 없습니다(단일 페이지, 클라이언트 라우팅 없음). Vercel 대시보드에서:

- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- 환경변수: 없음 — `QP_BASE`를 설정하지 않으면 루트(`/`)로 배포됩니다.

커스텀 도메인은 Vercel 프로젝트의 **Settings → Domains**에서 연결합니다.

### 로컬에서 검증

```bash
# 루트 배포(Vercel와 동일) — 자산 경로가 /assets/... 인지 확인
npm run build && npm run preview

# Pages 배포 시뮬레이션(PowerShell) — dist/index.html 자산 경로가
# /queuepilot/assets/... 로 시작하는지 확인
$env:QP_BASE='/queuepilot/'; npm run build
```

## 라이선스

독점(proprietary) 라이선스입니다. 소스는 투명성을 위해 공개되어 있지만, 사전 서면 허가
없이 복제·수정·재배포·판매할 수 없습니다. 호스팅된 앱의 사용(개인/상업)은 허용됩니다.
자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
