import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-cream text-ink-soft" },
  PAID: { label: "Paid", className: "bg-pine-100 text-pine-700" },
  PROCESSING: { label: "Printing", className: "bg-marigold-100 text-ink" },
  SHIPPED: { label: "Shipped", className: "bg-ember-100 text-ember-700" },
  DELIVERED: { label: "Delivered", className: "bg-pine-100 text-pine-700" },
  CANCELLED: { label: "Payment failed", className: "bg-danger-100 text-danger-700" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}
