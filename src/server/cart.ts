import "server-only";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";

/** Total item quantity in the signed-in user's cart (0 for guests). */
export async function getCartCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const result = await db.cartItem.aggregate({
    where: { cart: { userId: user.id } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function getCartWithItems(userId: string) {
  return db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: { include: { category: true } },
          design: { select: { id: true, name: true, thumbnailUrl: true, selection: true } },
        },
      },
    },
  });
}
