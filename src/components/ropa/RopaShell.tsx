import { useEffect, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RopaErrorBoundary } from "@/components/ropa/RopaErrorBoundary";

interface RopaShellProps {
  title: string;
  heading: string;
  children?: ReactNode;
  description?: string;
  chip?: string;
}

export function RopaShell({ title, heading, children, description, chip }: RopaShellProps) {
  useEffect(() => {
    document.title = title;
  }, [title]);

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
          {!description && (
            <h1 className="font-serif text-foreground mb-6">
              {heading}
            </h1>
          )}
          {children ?? (
            <p className="text-muted-foreground text-sm">
              This page is part of the RoPA Builder. Implementation in progress.
            </p>
          )}
        </RopaErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
