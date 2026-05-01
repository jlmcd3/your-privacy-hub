import { ErrorBoundary } from "react-error-boundary";
import type { ReactNode } from "react";

function RopaFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <p className="font-semibold text-foreground text-lg mb-2">
        Something went wrong. Your progress is saved.
      </p>
      <p className="text-sm text-muted-foreground mb-6">{error.message}</p>
      <div className="flex gap-3">
        <a href="/ropa" className="text-sm font-medium underline text-muted-foreground">
          Return to RoPA
        </a>
        <button
          onClick={resetErrorBoundary}
          className="text-sm font-semibold text-primary-foreground bg-primary px-4 py-2 rounded-lg"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function RopaErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary FallbackComponent={RopaFallback}>{children}</ErrorBoundary>;
}
