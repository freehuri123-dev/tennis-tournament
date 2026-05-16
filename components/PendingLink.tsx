"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type PendingLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  showPending?: boolean;
};

export function PendingLink({ href, children, className, showPending = true }: PendingLinkProps) {
  const [pending, setPending] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!showPending) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (href === `${window.location.pathname}${window.location.search}`) return;
    setPending(true);
  }

  return (
    <>
      {pending ? <LoadingOverlay label="이동 중..." /> : null}
      <Link className={className} href={href} onClick={handleClick}>
        {children}
      </Link>
    </>
  );
}
