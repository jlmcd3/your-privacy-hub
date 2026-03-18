import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const from = location.pathname + location.search;
    // Send to LOGIN (not signup) — existing users going to /account shouldn't
    // be shown a registration form
    return <Navigate to={`/login?redirect=${encodeURIComponent(from)}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
