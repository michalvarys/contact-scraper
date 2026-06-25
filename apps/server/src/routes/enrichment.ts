import { Router, Request, Response } from 'express';
import {
  enrichCompany,
  enrichCompaniesBatch,
  validateClaudeCli,
  type EnrichmentConfig,
} from '@contact-scraper/scrapers/src/services/EnrichmentService';

const router = Router();

/**
 * Disable socket timeouts on enrichment requests. Claude CLI calls can run
 * 30–60s+ each (and a batch streams for minutes), which would otherwise trip
 * Node's default request/socket timeouts and close the connection mid-flight.
 */
router.use((req, res, next) => {
  req.setTimeout(0);
  res.setTimeout(0);
  next();
});

/** Validates and normalises an EnrichmentConfig coming from the request body. */
function parseConfig(body: any): { config: EnrichmentConfig } | { error: string } {
  const outputColumns = Array.isArray(body?.outputColumns) ? body.outputColumns : [];
  const hasCustomPrompt = typeof body?.customPrompt === 'string' && body.customPrompt.trim();

  if (outputColumns.length === 0) {
    return { error: 'Musíte definovat alespoň jeden výstupní sloupec (outputColumns).' };
  }

  const cleanedColumns = outputColumns
    .filter((c: any) => c && typeof c.key === 'string' && c.key.trim())
    .map((c: any) => ({
      key: String(c.key).trim(),
      label: c.label ? String(c.label) : undefined,
      description: c.description ? String(c.description) : undefined,
    }));

  if (cleanedColumns.length === 0) {
    return { error: 'Výstupní sloupce musí mít platný "key".' };
  }

  return {
    config: {
      outputColumns: cleanedColumns,
      enrichmentDescription: body?.enrichmentDescription
        ? String(body.enrichmentDescription)
        : undefined,
      customPrompt: hasCustomPrompt ? String(body.customPrompt) : undefined,
      modelId: body?.modelId ? String(body.modelId) : undefined,
      useWebSearch: body?.useWebSearch !== false,
    },
  };
}

/**
 * POST /api/enrichment/validate
 * Checks the local Claude Code CLI is installed and authenticated (subscription).
 */
router.post('/validate', async (_req: Request, res: Response) => {
  try {
    const result = await validateClaudeCli();
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, valid: false, error: error.message });
  }
});

/**
 * POST /api/enrichment/test
 * Enriches a single company (used to test config on a few rows before a batch).
 * Body: { companyId, outputColumns, enrichmentDescription?, customPrompt?, modelId?, useWebSearch? }
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const companyId = req.body?.companyId;
    if (!companyId || typeof companyId !== 'string') {
      res.status(400).json({ success: false, error: 'Chybí companyId' });
      return;
    }
    const parsed = parseConfig(req.body);
    if ('error' in parsed) {
      res.status(400).json({ success: false, error: parsed.error });
      return;
    }
    const result = await enrichCompany(companyId, parsed.config);
    res.json({ success: result.success, data: result });
  } catch (error: any) {
    console.error('Enrichment test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/enrichment/batch
 * Enriches many companies, streaming progress via Server-Sent Events.
 * Body: { companyIds: string[], outputColumns, ...config, concurrency? }
 *
 * Emits events:
 *   - { type: 'progress', current, total, succeeded, failed, lastResult }
 *   - { type: 'done', results }
 *   - { type: 'error', error }
 */
router.post('/batch', async (req: Request, res: Response) => {
  const companyIds = Array.isArray(req.body?.companyIds) ? req.body.companyIds : [];
  if (companyIds.length === 0) {
    res.status(400).json({ success: false, error: 'Chybí companyIds' });
    return;
  }

  const parsed = parseConfig(req.body);
  if ('error' in parsed) {
    res.status(400).json({ success: false, error: parsed.error });
    return;
  }

  const concurrency =
    typeof req.body?.concurrency === 'number' ? req.body.concurrency : undefined;

  // Set up SSE stream.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  let clientGone = false;
  req.on('close', () => {
    clientGone = true;
  });

  try {
    const results = await enrichCompaniesBatch(companyIds, parsed.config, {
      concurrency,
      onProgress: (progress, lastResult) => {
        if (clientGone) return;
        send({ type: 'progress', ...progress, lastResult });
      },
    });
    if (!clientGone) {
      send({ type: 'done', results });
    }
  } catch (error: any) {
    console.error('Enrichment batch failed:', error);
    if (!clientGone) {
      send({ type: 'error', error: error.message });
    }
  } finally {
    res.end();
  }
});

export default router;
