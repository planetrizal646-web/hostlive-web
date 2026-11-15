"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";

/** Tombol submit yang menampilkan status pending dari form induknya */
export function SubmitButton({
  className = "btn btn-primary",
  pendingLabel = "Menyimpan…",
  children,
  name,
  value,
  form,
  disabled,
}: {
  className?: string;
  pendingLabel?: string;
  children: React.ReactNode;
  name?: string;
  value?: string;
  form?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      name={name}
      value={value}
      form={form}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Tombol berbahaya yang minta konfirmasi lewat dialog native sebelum submit */
export function ConfirmButton({
  className = "btn btn-sm btn-ghost",
  confirmLabel = "Ya, lanjutkan",
  title,
  message,
  children,
}: {
  className?: string;
  confirmLabel?: string;
  title: string;
  message: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog ref={ref} className="picker confirm" aria-labelledby={id}>
        <div className="picker-head">
          <h2 id={id}>{title}</h2>
        </div>
        <div className="picker-body">
          <p className="small">{message}</p>
        </div>
        <div className="picker-foot">
          <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
            Batal
          </button>
          <SubmitButton className="btn btn-danger" pendingLabel="Memproses…">
            {confirmLabel}
          </SubmitButton>
        </div>
      </dialog>
    </>
  );
}