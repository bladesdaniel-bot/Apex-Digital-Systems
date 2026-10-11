// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import path from "node:path";

// Load all env vars into process.env for server-side code (server routes and
// server functions). VITE_* client injection stays handled by the wrapper.
const serverEnv = loadEnv(process.env['NODE_ENV'] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // Pin React Email's htmlparser2 dependency to the hoisted v4.5.0 copy;
        // nested v7 copies removed ./lib/decode.js and break SSR.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
    optimizeDeps: {
      // Discover the hero's UI dependencies alongside React at startup. Late
      // discovery can leave an open preview using different React cache URLs.
      include: ["@radix-ui/react-slot", "@radix-ui/react-dialog", "lucide-react"],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
