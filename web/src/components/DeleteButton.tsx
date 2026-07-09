"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  label,
  confirmText,
  redirectTo,
  action,
}: {
  label: string;
  confirmText: string;
  redirectTo?: string;
  action: () => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    const result = await action();
    if (result.error) {
      window.alert(result.error);
      setBusy(false);
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="text-xs text-red-500 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
