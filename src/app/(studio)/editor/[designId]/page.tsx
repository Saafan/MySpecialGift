import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { getProductBySlug } from "@/server/catalog";
import { isProductCategory, type ProductCategory } from "@/lib/geometry";
import {
  choiceForTemplate,
  resolveUnitPriceCents,
  sanitizeSelection,
  type ProductSelection,
} from "@/lib/product-options";
import { getTemplateMeta } from "@/lib/template-meta";
import { parseDesignPayload, type DesignPayload } from "@/lib/editor/design-io";
import { EditorLoader } from "@/components/editor/editor-loader";
import { addDesignToCart } from "@/server/cart/actions";

export const metadata: Metadata = { title: "Design studio" };

interface EditorContext {
  designId: string | null;
  initialName: string;
  product: { id: string; slug: string; name: string; priceCents: number };
  selection: ProductSelection;
  category: ProductCategory;
  serverPayload: DesignPayload | null;
  templateId: string | null;
}

async function resolveNewDesign(
  productSlug: string | undefined,
  templateParam: string | undefined,
  sizeParam: string | undefined,
  choiceParam: string | undefined,
): Promise<EditorContext> {
  if (!productSlug) redirect("/products");

  const product = await getProductBySlug(productSlug);
  if (!product || !isProductCategory(product.category.slug)) notFound();
  const category = product.category.slug;

  // Only accept template ids that exist AND belong to this product's category.
  // V1's product pages emitted ids that matched nothing, silently.
  const templateMeta = templateParam ? getTemplateMeta(templateParam) : undefined;
  const templateId = templateMeta && templateMeta.category === category ? templateMeta.id : null;
  const selection = sanitizeSelection(product.options, {
    sizeId: sizeParam,
    choiceId: choiceParam ?? choiceForTemplate(templateId),
  });

  return {
    designId: null,
    initialName: `Untitled ${product.name}`,
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      priceCents: resolveUnitPriceCents(product.priceCents, product.options, selection),
    },
    selection,
    category,
    serverPayload: null,
    templateId,
  };
}

async function resolveExistingDesign(designId: string): Promise<EditorContext> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/editor/${designId}`)}`);
  }

  const design = await db.design.findUnique({
    where: { id: designId },
    include: { product: { include: { category: true } } },
  });
  // Same 404 for "doesn't exist" and "isn't yours" — no existence probing.
  if (!design || design.userId !== user.id) notFound();
  if (!isProductCategory(design.product.category.slug)) notFound();

  const selection = sanitizeSelection(design.product.options, design.selection);

  return {
    designId: design.id,
    initialName: design.name,
    product: {
      id: design.product.id,
      slug: design.product.slug,
      name: design.product.name,
      priceCents: resolveUnitPriceCents(
        design.product.priceCents,
        design.product.options,
        selection,
      ),
    },
    selection,
    category: design.product.category.slug,
    serverPayload: parseDesignPayload(design.canvasData),
    templateId: null,
  };
}

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ designId: string }>;
  searchParams: Promise<{ product?: string; template?: string; size?: string; choice?: string }>;
}) {
  const { designId } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();

  const context =
    designId === "new"
      ? await resolveNewDesign(query.product, query.template, query.size, query.choice)
      : await resolveExistingDesign(designId);

  return (
    <EditorLoader
      {...context}
      isAuthenticated={!!user}
      addToCartAction={addDesignToCart}
    />
  );
}
