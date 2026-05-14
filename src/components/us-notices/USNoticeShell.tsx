import { useEffect, type ReactNode } from "react";
import { RopaErrorBoundary } from "@/components/ropa/RopaErrorBoundary";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import {
  getUSNoticeSteps,
  type USNoticeFlowStep,
} from "@/components/us-notices/usNoticeFlowSteps";

interface USNoticeShellProps {
  title: string;
  heading: string;
  step?: USNoticeFlowStep;
  sessionId?: string;
  children?: ReactNode;
}

export function USNoticeShell({
  title,
  heading,
  step,
  sessionId,
  children,
}: USNoticeShellProps) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  const breadcrumb = step ? getUSNoticeSteps(step, sessionId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <RopaErrorBoundary>
          {breadcrumb && (
            <RopaBreadcrumb
              steps={breadcrumb.steps}
              currentIndex={breadcrumb.currentIndex}
            />
          )}
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-6">
            {heading}
          </h1>
          {children ?? (
            <p className="text-muted-foreground text-sm">
              This page is part of the US Notice Builder. Implementation in progress.
            </p>
          )}
        </RopaErrorBoundary>
      </main>
    </div>
  );
}

