import "server-only";
import { randomUUID } from "crypto";
import { env } from "@/server/env";

/**
 * Payment abstraction.
 *
 * V1 rendered a card form, claimed "Your payment info is encrypted and secure",
 * captured the number into React state and threw it away — a false statement
 * to the user and a facade order flow. V2 never renders a card form at all:
 * payment goes through this provider interface.
 *
 * The built-in provider is an honest, clearly-labelled test mode. A Stripe
 * adapter slots in here (Stripe Checkout redirect — card data never touches
 * this server) once STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY are configured;
 * until an adapter ships, setting those keys fails loudly rather than
 * silently pretending.
 */

export interface ChargeRequest {
  orderId: string;
  amountCents: number;
  currency: string;
  description: string;
}

export type ChargeResult =
  | { ok: true; reference: string; testMode: boolean }
  | { ok: false; error: string };

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  readonly testMode: boolean;
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock";
  readonly displayName = "Test payment (no real charge)";
  readonly testMode = true;

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (request.amountCents <= 0) {
      return { ok: false, error: "Order total must be positive" };
    }
    return { ok: true, reference: `test_${randomUUID()}`, testMode: true };
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (env.STRIPE_SECRET_KEY || env.STRIPE_PUBLISHABLE_KEY) {
    // No silent fallback: a configured-but-missing integration is a
    // deployment mistake, not something to paper over (V1's whole checkout
    // was exactly that kind of quiet pretending).
    throw new Error(
      "Stripe keys are set but the Stripe adapter is not installed in this build. " +
        "Remove the keys to use the built-in test provider.",
    );
  }
  return new MockPaymentProvider();
}
