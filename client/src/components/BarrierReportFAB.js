import { useCallback } from "react";

export default function BarrierReportFAB({ onReportBarrier }) {
  const handleReportBarrier = useCallback(() => {
    onReportBarrier && onReportBarrier();
  }, [onReportBarrier]);
  return (
    <button
      onClick={handleReportBarrier}
      className={`fab-button fab-report z-[9999]`}
      aria-label={"Report accessibility barrier"}
      title={"Report Barrier"}
      type="button"
    >
      <div className="fab-content">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-6 h-6"
          aria-hidden="true"
        >
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="fab-label">{"Report\nBarrier"}</span>
      </div>
    </button>
  );
}
