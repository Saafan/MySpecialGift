"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * A form field with the label association, error wiring and hint text built in.
 * V1's bare Input forced every caller to hand-roll labels and errors — the result
 * was 16 unassociated labels and zero aria-described errors across the app.
 * Here it is impossible to render an unlabelled or silently-erroring field.
 */
export function Input({
  label,
  error,
  hint,
  id: idProp,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-md border bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-faint",
          "border-line-strong transition-colors focus:border-ember-500",
          error && "border-danger-500",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
