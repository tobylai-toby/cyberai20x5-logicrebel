import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for assets
  root: 'src', // Set the root directory to src
  publicDir: '../public', // Point to the public directory in project root
  build: {
    outDir: '../dist', // Output to dist directory in project root
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    emptyOutDir: true
  },
});