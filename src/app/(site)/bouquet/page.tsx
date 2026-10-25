import type { Metadata } from "next";
import { SHARE_PARAM, decodeBouquet } from "@/lib/bouquet/config";
import { listBouquetArt } from "@/lib/bouquet/satin-assets";
import { BouquetCustomizer } from "@/components/bouquet/bouquet-customizer";

export const metadata: Metadata = {
  title: "Bouquet builder",
  description:
    "Build a paper flower bouquet: choose 5, 10 or 15 stems, pick the wrapping paper, and swap blooms live.",
};

export default async function BouquetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shared = params[SHARE_PARAM];

  // A shared link is decoded on the server so the first paint is already the
  // right bouquet; anything malformed quietly falls back to the house mix.
  const initialConfig = decodeBouquet(typeof shared === "string" ? shared : null);

  return <BouquetCustomizer initialConfig={initialConfig} art={listBouquetArt()} />;
}
