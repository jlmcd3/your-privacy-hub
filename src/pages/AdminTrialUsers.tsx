import { Navigate } from "react-router-dom";

/**
 * Trials now live on the combined Trials & Subscribers screen; this route is
 * kept as a shortcut that opens it pre-filtered to people inside a trial.
 */
export default function AdminTrialUsers() {
  return <Navigate to="/admin/subscribers?status=trialing" replace />;
}
