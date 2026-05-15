export function LoadingOverlay({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div className="global-loading-overlay" role="status" aria-live="polite">
      <div className="global-loading-box">
        <span className="global-loading-bar" aria-hidden="true" />
        <strong>{label}</strong>
      </div>
    </div>
  );
}
