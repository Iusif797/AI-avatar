"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#121212]/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        aria-describedby="confirm-dialog-description"
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-[#121212]/10 bg-white p-5 shadow-[0_28px_80px_rgba(18,18,18,0.25)]"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-black text-[#121212]" id="confirm-dialog-title">
          {title}
        </h2>
        <p
          className="mt-2 text-sm font-semibold leading-relaxed text-[#121212]/65"
          id="confirm-dialog-description"
        >
          {description}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            autoFocus
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md bg-[#121212] px-4 text-sm font-black text-white transition active:scale-[0.98] hover:bg-coral"
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-[#121212]/15 bg-white px-4 text-sm font-bold text-[#121212] transition active:scale-[0.98] hover:border-[#121212]/30"
            type="button"
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
