import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-slate text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    const from = location.pathname;
    return (
      <Navigate
        to={`/signup?redirect=${encodeURIComponent(from)}`}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
