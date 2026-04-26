import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL || "https://tvksbtrelpzhbyeutzgp.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs",
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        env.VITE_SUPABASE_PROJECT_ID || "tvksbtrelpzhbyeutzgp",
      ),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
