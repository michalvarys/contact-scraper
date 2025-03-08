import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from './routers';

type OpenApiDocument = Awaited<ReturnType<typeof generateOpenApiDocument>>;
//@ts-ignore
export const openApiDocument: OpenApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Contact Scraper API',
  version: '1.0.0',
  baseUrl: 'http://localhost:3000/trpc',
});
