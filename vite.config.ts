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
    build: {
      rollupOptions: {
        // Lovable's build sandbox can intermittently fail in Vite/Rollup's async
        // file loader when too many module files are read in parallel. Lowering
        // Rollup's file-operation concurrency keeps builds deterministic without
        // changing application behavior.
        maxParallelFileOps: 8,
        output: {
          // Split long-lived vendor libraries from app code so the initial parse
          // is smaller and vendor chunks cache across route navigations. Routes
          // remain lazy-split via React.lazy in the app.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react-vendor";
            if (id.includes("react-router")) return "router-vendor";
            if (id.includes("@tanstack/react-query")) return "query-vendor";
            // NOTE: do NOT split react-helmet-async into its own chunk — doing so
            // triggers a runtime TDZ ("Cannot access 'T' before initialization")
            // because Rollup hoists a helper reference across the chunk boundary.
            // Leave it bundled with its consumers.
            if (id.includes("@radix-ui")) return "radix-vendor";
            if (id.includes("lucide-react")) return "icons-vendor";
            if (id.includes("sonner") || id.includes("cmdk") || id.includes("vaul")) return "ui-vendor";
          },
        },
      },
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
