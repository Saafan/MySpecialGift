import { BRAND_NAME, WHATSAPP_DISPLAY, WHATSAPP_HREF } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.15 6.37 2.15 11.75c0 1.9.5 3.67 1.38 5.22L2 22l5.2-1.36A10.1 10.1 0 0 0 12.04 21.5C17.5 21.5 22 17.13 22 11.75 22 6.37 17.5 2 12.04 2Zm0 17.7a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.09.81.83-3-.2-.31a8.16 8.16 0 0 1-1.26-4.36c0-4.5 3.72-8.15 8.25-8.15 4.54 0 8.25 3.65 8.25 8.15 0 4.5-3.71 8.16-8.25 8.16Zm4.52-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.06-.39-2.02-1.24-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.77-1.84-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.56.12.16 1.75 2.67 4.24 3.74 1.49.64 1.88.7 2.55.59.41-.07 1.46-.6 1.67-1.17.2-.58.2-1.07.14-1.17-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

export function WhatsAppTextLink({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${BRAND_NAME} on WhatsApp at ${WHATSAPP_DISPLAY}`}
      title={`WhatsApp ${WHATSAPP_DISPLAY}`}
      className={cn(
        "inline-flex translate-y-px items-center text-[#1FAD4F] hover:text-[#169343]",
        className,
      )}
    >
      {children ?? <WhatsAppGlyph className="h-5 w-5" />}
    </a>
  );
}

export function WhatsAppHelpNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm leading-relaxed text-ink-soft", className)}>
      Stuck on anything? Message us{" "}
      <WhatsAppTextLink /> — we usually reply quickly.
    </p>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${BRAND_NAME} on WhatsApp at ${WHATSAPP_DISPLAY}`}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1FAD4F] text-white shadow-float transition-transform hover:scale-105 hover:bg-[#169343]"
    >
      <WhatsAppGlyph className="h-7 w-7" />
    </a>
  );
}

export function WhatsAppIconButton({ className }: { className?: string }) {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${BRAND_NAME} on WhatsApp at ${WHATSAPP_DISPLAY}`}
      title={`WhatsApp ${WHATSAPP_DISPLAY}`}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md text-[#1FAD4F] transition-colors hover:bg-pine-100 sm:h-9 sm:w-9",
        className,
      )}
    >
      <WhatsAppGlyph className="h-5 w-5" />
    </a>
  );
}
