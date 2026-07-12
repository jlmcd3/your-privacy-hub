// Mount-once inside <BrowserRouter> to fire a page_view on every route change.
// Uses track-geo so country/region come from the server-side headers, never
// from a client-side IP call.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { firePageView } from "@/lib/pageView";

export default function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    firePageView(location.pathname);
  }, [location.pathname]);
  return null;
}
