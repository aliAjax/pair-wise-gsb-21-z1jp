import type { ReactNode } from "react";
import type { RecordStatus } from "../data/types";
import { STATUS_LABEL } from "../rules/evaluation";

export function StatusBadge({ status }: { status: RecordStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function BlockerPill({ count }: { count: number }) {
  if (count === 0) return <span className="pill pill-ok">无阻断</span>;
  return <span className="pill pill-danger">{count} 项阻断</span>;
}

export function ExpiryTag({ valid, label }: { valid: boolean; label: string }) {
  return (
    <span
      className="pill"
      style={{ background: valid ? "#dcfce7" : "#fee2e2", color: valid ? "#166534" : "#991b1b" }}
      title="有效期"
    >
      {label}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function FieldError({ children }: { children: ReactNode }) {
  return children ? <p className="field-error">{children}</p> : null;
}
