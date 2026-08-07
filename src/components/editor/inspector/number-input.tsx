"use client";

import { useEffect, useId, useState } from "react";

export interface NumberInputProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

/**
 * The inspector's numeric field — the control at the heart of V1's BUG-P01.
 *
 * Behaviour:
 * - Keeps a local string while focused, so canvas-driven updates never clobber
 *   the user's typing mid-edit.
 * - Syncs from the canvas when NOT focused (drag updates flow in live).
 * - Commits on blur and Enter — not on every keystroke. V1 committed per
 *   keystroke, so typing "100" applied X=1, then X=10, then X=100.
 */
export function NumberInput({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  suffix,
}: NumberInputProps) {
  const id = useId();
  const [text, setText] = useState<string>(String(Math.round(value)));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(Math.round(value)));
  }, [value, focused]);

  const commit = () => {
    const parsed = Number.parseFloat(text);
    if (Number.isNaN(parsed)) {
      // Never coerce an empty/invalid field to 0 (V1 snapped objects to the
      // origin when a field was cleared). Just restore the current value.
      setText(String(Math.round(value)));
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setText(String(Math.round(next)));
    if (Math.round(next) !== Math.round(value)) onCommit(next);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-semibold text-ink-soft">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-8 w-full rounded-sm border border-line-strong bg-surface px-2 text-xs text-ink focus:border-ember-500"
      />
    </div>
  );
}
