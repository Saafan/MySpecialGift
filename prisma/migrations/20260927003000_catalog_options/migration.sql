-- Catalog options: shop order, size/colour extras, and the selection frozen onto a design.
ALTER TABLE "categories" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "products" ADD COLUMN "options" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "products" ALTER COLUMN "currency" SET DEFAULT 'EGP';

ALTER TABLE "designs" ADD COLUMN "selection" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "order_items" ADD COLUMN "optionsLabel" TEXT NOT NULL DEFAULT '';
