import { useEffect, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RopaErrorBoundary } from "@/components/ropa/RopaErrorBoundary";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import {
  getEUNoticeSteps,
  type EUNoticeFlowStep,
} from "@/components/eu-notices/euNoticeFlowSteps";

interface EUNoticeShellProps {
  title: string;
  heading: string;
  step?: EUNoticeFlowStep;
  sessionId?: string;
  children?: ReactNode;
}

export function EUNoticeShell({
  title,
  heading,
  step,
  sessionId,
  children,
}: EUNoticeShellProps) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  const breadcrumb = step ? getEUNoticeSteps(step, sessionId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
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
              This page is part of the EU &amp; Global Notice Builder.
            </p>
          )}
        </RopaErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
