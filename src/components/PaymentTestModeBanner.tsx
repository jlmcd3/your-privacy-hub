import { isDevHost } from "@/lib/env";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  if (!isDevHost()) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] w-full bg-accent text-accent-foreground border-b border-border px-4 py-2 text-center text-sm font-medium">
      All payments made in the preview are in test mode.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Read more
      </a>
    </div>
  );
}
