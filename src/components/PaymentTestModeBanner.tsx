const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;

  const isLovablePreview =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("lovable.app") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (!isLovablePreview) return null;

  return (
    <div className="w-full bg-accent text-accent-foreground border-b border-border px-4 py-2 text-center text-sm font-medium">
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
