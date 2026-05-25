import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WorkspaceSidebar from "@/components/dashboard/WorkspaceSidebar";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  className?: string;
}

/**
 * App shell for subscriber workspace pages.
 * Desktop: top Navbar + left sidebar (220px) + main content.
 * Mobile: top Navbar + horizontal DashboardSubnav pills + full-width main.
 */
export default function WorkspaceLayout({
  children,
  showFooter = true,
  className = "bg-brand-cloud",
}: WorkspaceLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      <Navbar />
      {/* Mobile subnav — hidden on md+ */}
      <div className="md:hidden">
        <DashboardSubnav />
      </div>
      <div className="flex-1 flex w-full">
        <WorkspaceSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      {showFooter && <Footer />}
    </div>
  );
}
