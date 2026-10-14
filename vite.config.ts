import path from 'node:path';
import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // three.js 単体で約550kBあるため
        chunkSizeWarningLimit: 600,
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        { name: 'three', test: /node_modules[\\/]three[\\/]/ },
                        { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
                    ],
                },
            },
        },
    },
    server: {
        port: 3000,
    },
    test: {
        include: ['src/**/*.test.ts'],
    },
    lint: {
        ignorePatterns: ['dist/**', 'src/components/ui/**'],
        options: {
            typeAware: true,
            typeCheck: true,
        },
    },
    fmt: {
        tabWidth: 4,
        singleQuote: true,
        printWidth: 120,
        ignorePatterns: ['dist/**', 'src/components/ui/**', 'docs/**', 'public/**', '.claude/**', '*.md', 'bun.lock'],
        overrides: [
            {
                files: ['**/*.json', '**/*.html', '**/*.css'],
                options: { tabWidth: 2 },
            },
        ],
    },
});
