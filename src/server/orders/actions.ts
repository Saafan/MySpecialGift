"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { quoteOrder } from "@/server/pricing";
import { formatSelection, resolveUnitPriceCents } from "@/lib/product-options";
import { getPaymentProvider } from "@/server/payments/provider";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Order placement — the flow V1 never had (its "Place Order" was a setTimeout
 * that cleared the cart and recorded nothing).
 *
 * Server-authoritative throughout: prices come from the products table at
 * placement time, never from the client (V1 accepted unitPrice in the request
 * body — SEC-03). Order items snapshot name/price/thumbnail so history remains
 * renderable whatever happens to the catalogue or the designs later.
 */

export type CheckoutFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const shippingSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  address1: z.string().trim().min(1, "Address is required"),
  address2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State or region is required"),
  zip: z.string().trim().min(1, "Postal code is required"),
  country: z.string().trim().min(1, "Country is required"),
});

export async function placeOrder(
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired — sign in and try again." };

  const parsed = shippingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: { include: { category: true } },
          design: { select: { id: true, name: true, thumbnailUrl: true, selection: true } },
        },
      },
    },
  });

  // An order must contain at least one item — V1 charged $5.99 shipping on
  // an empty order and its tests asserted that behaviour was correct.
  if (!cart || cart.items.length === 0) {
    return { error: "Your cart is empty." };
  }

  if (cart.items.some((item) => item.product.status !== "ACTIVE")) {
    return {
      error: "Some items in your cart are no longer available. Remove them and try again.",
    };
  }

  const quote = quoteOrder(
    cart.items.map((item) => ({
      unitPriceCents: resolveUnitPriceCents(
        item.product.priceCents,
        item.product.options,
        item.design.selection,
      ),
      quantity: item.quantity,
    })),
  );

  const order = await db.order.create({
    data: {
      userId: user.id,
      status: "PENDING",
      subtotalCents: quote.subtotalCents,
      taxCents: quote.taxCents,
      shippingCents: quote.shippingCents,
      totalCents: quote.totalCents,
      shippingAddress: parsed.data,
      items: {
        create: cart.items.map((item) => ({
          designId: item.design.id,
          productName: item.product.name,
          categorySlug: item.product.category.slug,
          unitPriceCents: resolveUnitPriceCents(
            item.product.priceCents,
            item.product.options,
            item.design.selection,
          ),
          quantity: item.quantity,
          thumbnailUrl: item.design.thumbnailUrl,
          optionsLabel: formatSelection(item.product.options, item.design.selection),
        })),
      },
    },
  });

  const provider = getPaymentProvider();
  const charge = await provider.charge({
    orderId: order.id,
    amountCents: quote.totalCents,
    currency: "EGP",
    description: `${BRAND_NAME} order #${order.number}`,
  });

  if (!charge.ok) {
    await db.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    // The cart is untouched — the user can retry. V1 cleared the cart no
    // matter what happened.
    return { error: `Payment failed: ${charge.error}` };
  }

  await db.$transaction([
    db.order.update({
      where: { id: order.id },
      data: { status: "PAID", paymentRef: charge.reference },
    }),
    db.design.updateMany({
      where: { id: { in: cart.items.map((i) => i.designId) } },
      data: { status: "ORDERED" },
    }),
    db.cartItem.deleteMany({ where: { cartId: cart.id } }),
  ]);

  revalidatePath("/cart");
  revalidatePath("/orders");
  redirect(`/orders/${order.id}?placed=1`);
}
