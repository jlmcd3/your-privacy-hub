import { useEffect, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RopaErrorBoundary } from "@/components/ropa/RopaErrorBoundary";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { NoticeAccessGate } from "@/components/notices/NoticeAccessGate";
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
  description?: string;
  chip?: string;
}

export function EUNoticeShell({
  title,
  heading,
  step,
  sessionId,
  children,
  description,
  chip,
}: EUNoticeShellProps) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  const breadcrumb = step ? getEUNoticeSteps(step, sessionId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      {description ? (
        <header className="bg-slate-900 text-white py-12">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            {chip && (
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
                {chip}
              </span>
            )}
            <h1 className="font-serif mb-3">{heading}</h1>
            <p className="text-slate-300 text-lg max-w-3xl">{description}</p>
          </div>
        </header>
      ) : null}
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <RopaErrorBoundary>
          <NoticeAccessGate toolName="EU & Global Privacy Notice Builder">
            {breadcrumb && (
              <RopaBreadcrumb
                steps={breadcrumb.steps}
                currentIndex={breadcrumb.currentIndex}
              />
            )}
            {!description && (
              <h1 className="font-serif text-foreground mb-6">
                {heading}
              </h1>
            )}
            {children ?? (
              <p className="text-muted-foreground text-sm">
                This page is part of the EU &amp; Global Notice Builder.
              </p>
            )}
          </NoticeAccessGate>
        </RopaErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
