import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5175,
        open: true,
        proxy: {
            '/api': {
                target: process.env.VITE_PROXY_TARGET || 'http://localhost:5010',
                changeOrigin: true,
            },
        },
    },
});
