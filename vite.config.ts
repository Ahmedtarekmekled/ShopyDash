import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core':   ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-avatar',
            '@radix-ui/react-progress',
          ],
          'lucide':       ['lucide-react'],
          'charts':       ['recharts'],
          'map':          ['leaflet', 'react-leaflet'],
          'supabase':     ['@supabase/supabase-js'],
          'query':        ['@tanstack/react-query'],
          'date-utils':   ['date-fns'],
          'utils':        ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
  },
});
