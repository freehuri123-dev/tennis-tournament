"use client";

import { RefreshCw } from "lucide-react";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <main className="error-recovery-page" role="alert">
      <section className="status-message-card error-recovery-card">
        <strong>잠시 연결이 지연되고 있습니다</strong>
        <p>데이터 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.</p>
        <button className="primary-button error-retry-button" onClick={reset} type="button">
          <RefreshCw aria-hidden="true" size={18} />
          다시 시도
        </button>
        {error.digest ? <small>오류번호: {error.digest}</small> : null}
      </section>
    </main>
  );
}