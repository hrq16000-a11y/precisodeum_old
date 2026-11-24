// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { visualizer } from "rollup-plugin-visualizer";
import { execSync } from "node:child_process";

// Lista local de commits embutida no build para a tela /admin/github-sync.
// Fora de um checkout Git o build segue normalmente com lista vazia.
function readLocalCommits(): Array<{ sha: string; message: string; date: string }> {
  try {
    const out = execSync("git log -40 --format=%H%x1f%s%x1f%cI", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    });
    return out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha = "", message = "", date = ""] = line.split("\x1f");
        return { sha, message: message.slice(0, 160), date };
      })
      .filter((c) => /^[0-9a-f]{40}$/.test(c.sha));
  } catch {
    return [];
  }
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      __BUILD_TIMESTAMP__: JSON.stringify(Date.now()),
      __GIT_LOCAL_COMMITS__: JSON.stringify(readLocalCommits()),
    },
    plugins: [
      // Bundle report opt-in: ANALYZE=1 bun run build → /tmp/bundle-stats.html
      process.env.ANALYZE === "1" &&
        visualizer({
          filename: "/tmp/bundle-stats.html",
          template: "treemap",
          gzipSize: true,
          brotliSize: false,
        }),
    ].filter(Boolean),
    build: {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1500,
    },
  },
});
