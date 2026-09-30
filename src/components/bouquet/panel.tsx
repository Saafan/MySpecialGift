import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * One numbered step of the customizer. The steps are numbered but not gated —
 * everything stays open and editable at once, which is the point of keeping
 * the whole flow on one page.
 */
export function Panel({
  step,
  title,
  hint,
  action,
  children,
  className,
}: {
  step?: number;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn("rounded-lg border bg-surface p-5 shadow-lift", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className="flex items-center gap-2.5 font-display text-lg font-semibold text-ink"
          >
            {step !== undefined && (
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ember-100 text-xs font-bold text-ember-700"
              >
                {step}
              </span>
            )}
            {title}
          </h2>
          {hint && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Shared look for the radio-backed option cards. A real `<input type="radio">`
 * sits invisibly inside each one so arrow-key navigation and screen-reader
 * grouping come from the platform rather than hand-rolled ARIA.
 */
export const optionCardClass = cn(
  "group relative flex cursor-pointer flex-col items-center rounded-md border border-line bg-paper/50 text-center transition-all duration-200",
  "hover:border-line-strong hover:bg-cream/60",
  "has-[:checked]:border-ember-500 has-[:checked]:bg-ember-50 has-[:checked]:shadow-lift",
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember-500",
);
