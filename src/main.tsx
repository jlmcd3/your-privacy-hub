import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { verifyUpdatesSchema } from "./lib/schemaCheck";
import { captureUtmFromLocation } from "./lib/trackEvent";

// Fire-and-forget: warn in console if the `updates` table is missing
// any column the app expects to query.
verifyUpdatesSchema();

// Courier-A: first-touch UTM capture into sessionStorage.
captureUtmFromLocation();

createRoot(document.getElementById("root")!).render(<App />);
