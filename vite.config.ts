import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { ServerResponse } from 'node:http';
import path from 'path';
import odyseeVideosHandler from './api/odysee-videos.js';
import odyseeViewCountsHandler from './api/odysee-view-counts.js';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

function odyseeDevApi(): Plugin {
  return {
    name: 'odysee-dev-api',
    configureServer(server) {
      registerDevApiRoute(server, '/api/odysee-videos', odyseeVideosHandler, 'Could not fetch Odysee videos');
      registerDevApiRoute(server, '/api/odysee-view-counts', odyseeViewCountsHandler, 'Could not fetch Odysee view counts');
    },
  };
}

function registerDevApiRoute(
  server: ViteDevServer,
  route: string,
  handler: (request: { method?: string; query: Record<string, string> }, response: ReturnType<typeof createDevApiResponse>) => Promise<void>,
  fallbackMessage: string,
) {
  server.middlewares.use(route, async (request, response, next) => {
    if (request.method !== 'GET') {
      next();
      return;
    }

    const requestUrl = new URL(request.url || '/', 'http://localhost');
    const apiRequest = {
      method: request.method,
      query: Object.fromEntries(requestUrl.searchParams.entries()),
    };
    const apiResponse = createDevApiResponse(response);

    try {
      await handler(apiRequest, apiResponse);
    } catch {
      if (!response.headersSent) {
        response.statusCode = 502;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ error: fallbackMessage }));
      }
    }
  });
}

function createDevApiResponse(response: ServerResponse) {
  return {
    setHeader(name: string, value: string) {
      response.setHeader(name, value);
    },
    status(code: number) {
      response.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(payload));
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), odyseeDevApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
