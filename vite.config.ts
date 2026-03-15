import {defineConfig} from "vite";
import {resolve} from "path";

export default defineConfig({
    publicDir: "public",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                demo1: resolve(__dirname, "examples/demo1.html"),
                demo2: resolve(__dirname, "examples/demo2.html"),
                demo3: resolve(__dirname, "examples/demo3.html"), // <--- NEU
                main: resolve(__dirname, "index.html"),
            },
            output: {
                entryFileNames: (assetInfo) => {
                    if (assetInfo.name === 'main') {
                        return "main.js";
                    }
                    return `examples/[name]/demo.js`;
                },
                assetFileNames: "assets/[name].[ext]",
                chunkFileNames: "js/[name].js",
            },
        },
    },
});