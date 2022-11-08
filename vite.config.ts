import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // https://github.com/satya164/react-simple-code-editor/issues/86
    global: "globalThis",
  },
});
