import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "default" | "wide" | "narrow" | "full";

const widthMap: Record<Width, string> = {
  narrow: "max-w-[640px]",   // article / form column
  default: "max-w-[860px]",  // standard reading shell
  wide: "max-w-[1280px]",    // marketing / data tables
  full: "max-w-none",        // dashboards, maps
};

interface PageContainerProps {
  children: ReactNode;
  width?: Width;
  className?: string;
  as?: "div" | "section" | "main" | "article";
}

/**
 * Standardized page shell.
 * Padding: 16px mobile / 24px tablet / 32px desktop.
 * Default max-width 860px (reading-optimized).
 */
export const PageContainer = ({
  children,
  width = "default",
  className,
  as: Tag = "div",
}: PageContainerProps) => {
  return (
      <Tag
        className={cn(widthMap[width], "mx-auto w-full", className)}
        style={{
          // Fluid horizontal padding: 16px → 32px between 360px and 1280px viewport.
          paddingLeft: "clamp(1rem, 0.5rem + 2vw, 2rem)",
          paddingRight: "clamp(1rem, 0.5rem + 2vw, 2rem)",
        }}
      >
        {children}
      </Tag>
  );
};

export default PageContainer;
