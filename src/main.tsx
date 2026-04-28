import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { verifyUpdatesSchema } from "./lib/schemaCheck";

// Fire-and-forget: warn in console if the `updates` table is missing
// any column the app expects to query.
verifyUpdatesSchema();

createRoot(document.getElementById("root")!).render(<App />);
