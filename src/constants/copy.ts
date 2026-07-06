// Centralized Korean UI copy. Code stays English; only user-visible strings live
// here. Single-locale by design — no i18n, no language switcher. Technical terms
// (CSV, API, URL, Header, Body, JSON, HTTP methods) are kept in English on purpose.

import type { HttpMethod } from '../types';

// Display labels for the stepper. The store's STEPS array stays in English and is
// used only as logic keys; these are what the user actually sees.
export const STEP_LABELS = ['CSV 업로드', '요청 설정', '실행 · 결과'] as const;

export const copy = {
  app: {
    tagline: 'CSV를 업로드하면 각 행이 하나의 API 요청이 됩니다.',
  },

  privacy: {
    message:
      'QueuePilot는 모든 작업을 브라우저 안에서 처리합니다. CSV와 API 키는 저희 서버로 전송되지 않습니다.',
    dismiss: '확인',
  },

  upload: {
    title: 'CSV 파일 업로드',
    dropAriaLabel: 'CSV 파일 업로드',
    dropTitle: 'CSV 파일을 여기에 놓으세요',
    dropHintPrefix: '또는 ',
    dropHintLink: '파일 선택',
    dropHintSuffix: '. 각 행이 하나의 API 요청이 됩니다. 파일은 브라우저 안에만 있습니다.',
    reading: '파일을 읽는 중…',
    notCsv: (name: string) =>
      `"${name}"은(는) CSV 파일이 아닙니다. .csv 파일을 선택하세요 (Excel: 파일 → 다른 이름으로 저장 → CSV UTF-8).`,
    uploadDifferent: '다른 파일 업로드',
    continue: '다음',
    stats: (rows: number, cols: number, warnings: number) => {
      const base = `${rows.toLocaleString()}개 행 · ${cols}개 컬럼`;
      return warnings > 0 ? `${base} · 경고 ${warnings}개` : base;
    },
    warningsTitle: (n: number) => `경고 ${n}개 — 행은 그대로 유지되었습니다. 확인해 주세요:`,
    previewMore: (shown: number, total: number) =>
      `전체 ${total.toLocaleString()}개 행 중 처음 ${shown}개를 표시합니다.`,
  },

  build: {
    title: '요청 설정',
    methodLabel: '메서드',
    urlLabel: 'URL 템플릿',
    urlPlaceholder: 'https://api.example.com/users/{{id}}',
    headersLabel: 'Header',
    headerKeyPlaceholder: '이름 (예: Authorization)',
    headerValuePlaceholder: '값',
    addHeader: 'Header 추가',
    removeHeader: '삭제',
    bodyLabel: 'Body',
    bodyPlaceholder: '{\n  "email": "{{email}}"\n}',
    bodyHiddenNote: (method: HttpMethod) =>
      `${method} 요청에는 보통 Body가 없어 입력란을 숨겼습니다.`,
    variablePickerTitle: '컬럼값 삽입',
    variablePickerHint: '입력란을 클릭한 뒤 컬럼을 누르면 커서 위치에 {{컬럼}}이 삽입됩니다.',
    extract: {
      label: '응답에서 값 추출 (선택)',
      placeholder: 'data.coupon_code',
      hint: '응답 JSON에서 이 경로의 값을 결과 CSV의 qp_extracted 컬럼에 담습니다.',
    },
    continue: '다음: 실행',
    gateReason: 'URL을 입력하고, 존재하지 않는 컬럼 표시를 모두 해결하면 다음 단계로 넘어갈 수 있습니다.',
    lockedNote: '실행 중에는 요청 설정을 수정할 수 없습니다. 실행을 마치거나 중지한 뒤에 변경하세요.',
    persist: {
      note: '요청 설정은 이 브라우저에 자동 저장됩니다. CSV 데이터는 저장되지 않습니다.',
      saveAuthHeaders: '인증 관련 Header 값도 저장 (공용 PC에서는 권장하지 않음)',
      reset: '설정 초기화',
      resetConfirm: {
        title: '설정을 초기화할까요?',
        message: '저장된 요청 설정을 지우고 기본값으로 되돌립니다.',
        confirm: '초기화',
        cancel: '취소',
      },
    },
  },

  preview: {
    title: '요청 미리보기',
    basedOnRow1: '첫 번째 행 기준',
    noRows: '데이터 행이 없어 미리보기를 표시할 수 없습니다.',
    unresolvedTitle: '존재하지 않는 컬럼입니다:',
    invalidUrl: 'URL 형식이 올바르지 않습니다',
    invalidJson: 'Body가 올바른 JSON 형식이 아닐 수 있습니다',
    headersLabel: 'Header',
    bodyLabel: 'Body',
  },

  run: {
    title: '실행',
    presetLabel: '전송 속도',
    presets: {
      safe: { name: '안전', detail: '동시 1개 · 1000ms 간격' },
      balanced: { name: '균형', detail: '동시 3개 · 500ms 간격' },
      fast: { name: '빠름', detail: '동시 5개 · 200ms 간격' },
    },
    sampleButton: '처음 5개 행으로 테스트',
    fullButton: (n: number) => `전체 ${n.toLocaleString()}개 행 전송`,
    fullDisabledTooltip: '먼저 5개 행 테스트를 실행하면 전체 전송이 열립니다.',
    reRunNote: '전체 실행은 테스트한 5개 행도 다시 전송합니다.',
    skipSampled: {
      label: '테스트에서 성공한 행은 건너뛰기',
      noteChecked: (n: number) => `테스트에서 성공한 ${n.toLocaleString()}개 행은 건너뜁니다.`,
    },
    stopButton: '중지',
    pauseButton: '일시정지',
    resumeButton: '재개',
    noRunYet: '아직 실행하지 않았습니다. 위에서 테스트를 시작하세요.',

    // Safety warnings before running
    fastWarning:
      '빠름은 한 번에 5개 요청을 보냅니다. 일부 API는 이 때문에 차단하거나 429로 응답할 수 있습니다. 확실하지 않으면 안전을 사용하세요.',
    deleteWarning: (n: number) =>
      `${n.toLocaleString()}개 행에 DELETE 요청을 보내려고 합니다. 대부분 되돌릴 수 없습니다. 5개 행 테스트도 실제 데이터를 삭제합니다.`,

    // Auto-pause banner after repeated 429 responses
    autoPause429:
      'API가 요청 속도를 낮춰 달라고 응답해(429) 자동으로 일시정지했습니다. 속도를 낮춘 뒤 재개하세요. 실패한 행은 마지막에 재시도할 수 있습니다.',

    // CORS explainer (shown when enough completed rows all failed the network/CORS way)
    cors: {
      title: '브라우저가 요청을 차단했습니다 (CORS)',
      body: '테스트한 모든 행이 같은 이유로 실패했습니다. 브라우저는 보안 규칙(CORS) 때문에 다른 서버로 보내는 요청을 막을 수 있습니다. 설정이 잘못된 것이 아니라 브라우저의 보안 정책입니다.',
      hint: '이 API가 브라우저(CORS) 요청을 허용하는지 확인하거나, CORS를 허용하는 엔드포인트 또는 프록시를 사용해야 할 수 있습니다.',
      stopHint: '실행을 중지하고 원인을 먼저 확인하는 것을 권장합니다.',
    },

    statusLabel: {
      pending: '대기',
      running: '실행 중',
      success: '성공',
      failed: '실패',
    } as Record<string, string>,

    // Progress + phase labels (Phase 4)
    runningLabel: '실행 중…',
    pausingLabel: '일시정지하는 중… 진행 중인 요청이 끝나기를 기다립니다.',
    pausedLabel: (n: number) =>
      `${n.toLocaleString()}번째 행에서 일시정지했습니다. 재개하기 전까지 아무 것도 전송되지 않습니다.`,
    stoppingLabel: '중지하는 중…',
    doneLabel: '완료',
    progress: (done: number, total: number) =>
      `${done.toLocaleString()} / ${total.toLocaleString()}`,
    announce: (pct: number) => `${pct}% 완료`,
    eta: (text: string) => `약 ${text} 남음`,
    etaMinutes: (m: number) => `${m}분`,
    etaSeconds: (s: number) => `${s}초`,

    // Stop confirmation
    stopConfirm: {
      title: '실행을 중지할까요?',
      message: (n: number) =>
        `아직 ${n.toLocaleString()}개 행이 전송되지 않았습니다. 완료된 행의 결과는 이후 단계에서 다운로드할 수 있습니다.`,
      confirm: '중지',
      cancel: '계속 진행',
    },

    // Retry failed rows
    retryButton: (n: number) => `실패한 ${n.toLocaleString()}개 행 재시도`,
    retrySubtext: '성공한 행은 다시 전송되지 않습니다.',
    retryConfirm: {
      title: '재시도할까요?',
      message: (n: number) => `실패한 ${n.toLocaleString()}개 행을 다시 전송합니다.`,
      dupWarning:
        '이 중 일부는 이미 서버에 도달했을 수 있습니다. 재시도하면 중복이 생길 수 있습니다.',
      confirm: '재시도',
      cancel: '취소',
    },

    // Export
    exportTitle: '결과 내보내기',
    exportAll: '결과 다운로드 (.csv)',
    exportFailed: '실패한 행만 다운로드 (.csv)',

    // Result table
    filterAll: '전체',
    filterFailed: '실패',
    colStatus: '상태',
    colError: '메시지',
    tableEmpty: '표시할 행이 없습니다.',
    noFailedRows: '실패한 행이 없습니다 🎉',
    pageOf: (current: number, total: number) => `${current} / ${total} 페이지`,
    prevPage: '이전',
    nextPage: '다음',
    // Human-readable failure messages. Technical tokens (codes, CORS, 30초) kept as-is.
    errors: {
      clientError: (status: number, statusText: string) =>
        `서버가 이 행을 거부했습니다 (${status}${statusText ? ` — ${statusText}` : ''})`,
      tooManyRequests: 'API가 요청 속도를 낮춰 달라고 응답했습니다 (429)',
      serverError: (status: number) =>
        `서버 내부 오류가 발생했습니다 (${status}) — 대개 일시적입니다`,
      timeout: '30초 동안 응답이 없습니다 — 요청이 서버에 도달했을 수도 있습니다',
      network:
        '요청이 서버에 도달하기 전에 차단되었습니다 (주로 CORS) 또는 서버가 응답하지 않았습니다',
      aborted: '응답이 도착하기 전에 중지되었습니다 — 서버에 도달했을 수도, 아닐 수도 있습니다',
      unexpectedStatus: (status: number) => `예상치 못한 응답입니다 (${status})`,
      unexpected: '요청이 예기치 않게 실패했습니다',
    },
  },
};
