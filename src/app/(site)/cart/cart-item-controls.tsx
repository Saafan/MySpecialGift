"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeCartItem, setCartItemQuantity } from "@/server/cart/actions";

export function CartItemControls({
  itemId,
  quantity,
  name,
}: {
  itemId: string;
  quantity: number;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setQuantity = (next: number) => {
    startTransition(async () => {
      const result = await setCartItemQuantity(itemId, next);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await removeCartItem(itemId);
      if (!result.ok) toast.error(result.error);
      else toast.success(`"${name}" removed from cart.`);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center rounded-md border border-line-strong"
        role="group"
        aria-label={`Quantity for ${name}`}
      >
        <button
          onClick={() => setQuantity(quantity - 1)}
          disabled={pending}
          aria-label={`Decrease quantity of ${name}`}
          className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink-soft hover:bg-cream hover:text-ink disabled:opacity-50"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span aria-live="polite" className="min-w-8 text-center text-sm font-bold text-ink">
          {quantity}
        </span>
        <button
          onClick={() => setQuantity(quantity + 1)}
          disabled={pending || quantity >= 99}
          aria-label={`Increase quantity of ${name}`}
          className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink-soft hover:bg-cream hover:text-ink disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        onClick={remove}
        disabled={pending}
        aria-label={`Remove ${name} from cart`}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-danger-100/60 hover:text-danger-600 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
