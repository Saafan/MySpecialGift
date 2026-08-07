import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * Shared shell for every shopping/browsing page. V1 declared route groups but
 * gave none of them a layout, so all eight pages re-imported the navbar and
 * footer by hand (and checkout forgot the footer entirely).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
