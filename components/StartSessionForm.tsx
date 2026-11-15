"use client";

import { useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { HourSlot } from "@/lib/time";

export type StudioSlots = { id: number; name: string; busy: boolean; slots: HourSlot[] };

export function StartSessionForm({ studios }: { studios: StudioSlots[] }) {
  const first =
    studios.find((s) => !s.busy && s.slots.length > 0) ??
    studios.find((s) => s.slots.length > 0) ??
    studios[0];
  const [studioId, setStudioId] = useState(first ? String(first.id) : "");
  const active = studios.find((s) => String(s.id) === studioId);
  const slots = active?.slots ?? [];
  const hintId = "slot-hint";

  return (
    <form action="/api/session/start" method="post" className="stack">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="studio">Studio</label>
          <select id="studio" name="studio" required value={studioId} onChange={(e) => setStudioId(e.target.value)}>
            {studios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.busy ? " — sedang live" : s.slots.length === 0 ? " — tidak ada jam" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="slot">Jam mulai (1 jam)</label>
          <select
            id="slot"
            name="slot"
            required
            key={studioId}
            disabled={slots.length === 0}
            aria-describedby={hintId}
          >
            {slots.length === 0 ? (
              <option value="">Tidak ada jam tersedia</option>
            ) : (
              slots.map((s) => (
                <option key={s.start} value={s.start}>
                  {s.start}–{s.end}
                </option>
              ))
            )}
          </select>
          <span id={hintId} className="field-hint">
            Slot 06:00–22:00, per 1 jam. Bisa dipilih mulai 10 menit sebelum jamnya.
          </span>
        </div>
      </div>

      {active && slots.length === 0 ? (
        <p className="small muted" role="status">
          {active.busy
            ? `${active.name} sedang dipakai host lain. Pilih studio lain.`
            : `${active.name} tidak punya jam tersedia hari ini. Pilih studio lain atau coba lagi nanti.`}
        </p>
      ) : null}

      <SubmitButton
        className="btn btn-primary"
        pendingLabel="Memproses…"
        disabled={slots.length === 0}
      >
        Mulai sesi
      </SubmitButton>
    </form>
  );
}
