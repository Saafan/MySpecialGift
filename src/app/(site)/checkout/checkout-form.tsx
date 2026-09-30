"use client";

import { useActionState } from "react";
import { FlaskConical } from "lucide-react";
import { placeOrder, type CheckoutFormState } from "@/server/orders/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WhatsAppHelpNote } from "@/components/layout/whatsapp-help";

/**
 * Checkout form. Notable non-features, on purpose:
 * - No card fields, ever. V1 collected card numbers into React state under an
 *   "encrypted and secure" label and then discarded them. Real payments go
 *   through a hosted provider page (Stripe seam); until then the test-mode
 *   payment is labelled exactly as what it is.
 * - Every field has a real label, autocomplete, and aria-wired errors — V1's
 *   checkout had eleven unassociated labels and no announced errors.
 */
export function CheckoutForm({ totalLabel }: { totalLabel: string }) {
  const [state, formAction, pending] = useActionState<CheckoutFormState, FormData>(
    placeOrder,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-danger-100 bg-danger-100/50 px-4 py-3 text-sm font-medium text-danger-700"
        >
          {state.error}
        </p>
      )}

      <fieldset className="rounded-lg border bg-surface p-6 shadow-lift">
        <legend className="px-2 font-display text-lg font-semibold text-ink">
          Where is it going?
        </legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Full name"
              name="fullName"
              autoComplete="name"
              required
              error={state.fieldErrors?.fullName}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address"
              name="address1"
              autoComplete="address-line1"
              required
              error={state.fieldErrors?.address1}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Apartment, suite, etc. (optional)"
              name="address2"
              autoComplete="address-line2"
              error={state.fieldErrors?.address2}
            />
          </div>
          <Input
            label="City"
            name="city"
            autoComplete="address-level2"
            required
            error={state.fieldErrors?.city}
          />
          <Input
            label="State / region"
            name="state"
            autoComplete="address-level1"
            required
            error={state.fieldErrors?.state}
          />
          <Input
            label="Postal code"
            name="zip"
            autoComplete="postal-code"
            required
            error={state.fieldErrors?.zip}
          />
          <Input
            label="Country"
            name="country"
            autoComplete="country-name"
            required
            error={state.fieldErrors?.country}
          />
        </div>
      </fieldset>

      <section
        aria-label="Payment"
        className="rounded-lg border border-marigold-300 bg-marigold-100/50 p-5"
      >
        <p className="flex items-center gap-2 font-semibold text-ink">
          <FlaskConical aria-hidden className="h-4 w-4 text-marigold-500" />
          Test mode — no real charge
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          This store runs a simulated payment: your order is recorded for real,
          but no money moves and no card is ever asked for. When live payments
          are enabled they&apos;ll happen on a secure hosted page.
        </p>
      </section>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Placing your order…" : `Place order · ${totalLabel}`}
      </Button>
      <WhatsAppHelpNote />
    </form>
  );
}
