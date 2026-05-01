import { useEffect, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RopaErrorBoundary } from "@/components/ropa/RopaErrorBoundary";

interface RopaShellProps {
  title: string;
  heading: string;
  children?: ReactNode;
}

export function RopaShell({ title, heading, children }: RopaShellProps) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <RopaErrorBoundary>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-6">
            {heading}
          </h1>
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
