"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type ConfirmActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  confirmMessage: string;
  pendingLabel?: string;
};

type PendingButtonProps = {
  children: ReactNode;
  className: string;
  pendingLabel?: string;
  type?: "submit" | "button";
};

export function ConfirmActionForm({ action, children, className, confirmMessage, pendingLabel }: ConfirmActionFormProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
      <FormPendingOverlay label={pendingLabel} />
    </form>
  );
}

export function PendingButton({ children, className, pendingLabel = "처리 중...", type = "submit" }: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button aria-busy={pending} className={`${className} pending-button`} disabled={pending} type={type}>
      <span className="pending-button-content">{pending ? pendingLabel : children}</span>
      {pending ? <span className="button-progress" aria-hidden="true" /> : null}
    </button>
  );
}

export function FormProgress() {
  const { pending } = useFormStatus();
  return pending ? <span className="form-progress" aria-hidden="true" /> : null;
}

export function FormPendingOverlay({ label = "처리 중..." }: { label?: string }) {
  const { pending } = useFormStatus();
  return pending ? <LoadingOverlay label={label} /> : null;
}
