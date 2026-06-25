import { useState, useCallback, useRef } from 'react';

export interface EnrichmentOutputColumn {
  key: string;
  label?: string;
  description?: string;
}

export interface EnrichmentConfig {
  outputColumns: EnrichmentOutputColumn[];
  enrichmentDescription?: string;
  customPrompt?: string;
  modelId?: string;
  useWebSearch?: boolean;
}

export interface EnrichmentRowResult {
  companyId: string;
  success: boolean;
  data?: Record<string, string>;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface EnrichmentProgress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
}

/**
 * Base URL for enrichment requests. We call the backend DIRECTLY rather than
 * through Next.js dev rewrites: the rewrite proxy kills long-lived connections
 * (Claude CLI calls run 30–60s+), producing `socket hang up` / ECONNRESET. The
 * backend has permissive CORS, so a direct cross-origin call works. Falls back
 * to the relative path (proxy) only if the env var is unset.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Reads a fetch Response as JSON, but tolerates non-JSON error bodies (e.g. an
 * Express "Internal Server Error" string or an HTML 502 from a proxy) so the
 * caller gets a readable message instead of a JSON.parse crash.
 */
async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text?.slice(0, 200) || `Server error (${res.status})`);
  }
}

/**
 * Drives lead enrichment via the server's Claude Code subscription CLI.
 * `runBatch` streams Server-Sent Events from /api/enrichment/batch so the UI can
 * show live progress and apply each row result as it lands.
 */
export function useEnrichment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** Confirms the local Claude CLI is installed and logged in (subscription). */
  const validate = useCallback(async (): Promise<{ valid: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE}/api/enrichment/validate`, { method: 'POST' });
    const data = await readJsonSafe(res);
    return { valid: data.valid === true, error: data.error };
  }, []);

  /** Enriches a single company (used for the "test 5 rows" flow). */
  const testOne = useCallback(
    async (companyId: string, config: EnrichmentConfig): Promise<EnrichmentRowResult> => {
      const res = await fetch(`${API_BASE}/api/enrichment/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, ...config }),
      });
      const json = await readJsonSafe(res);
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Test enrichment selhal');
      }
      return json.data as EnrichmentRowResult;
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /**
   * Runs a streaming batch. onRowDone fires per company so callers can apply
   * optimistic table updates. Returns all results when the stream completes.
   */
  const runBatch = useCallback(
    async (
      companyIds: string[],
      config: EnrichmentConfig,
      opts: {
        concurrency?: number;
        onRowDone?: (result: EnrichmentRowResult) => void;
      } = {},
    ): Promise<EnrichmentRowResult[]> => {
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: companyIds.length, succeeded: 0, failed: 0 });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/api/enrichment/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyIds, ...config, concurrency: opts.concurrency }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Server error (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResults: EnrichmentRowResult[] = [];

        // Parse the SSE stream: events are separated by a blank line, each
        // carrying a single `data: <json>` line.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sepIndex: number;
          while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);

            const dataLine = rawEvent
              .split('\n')
              .find((l) => l.startsWith('data:'));
            if (!dataLine) continue;

            const payload = JSON.parse(dataLine.slice(5).trim());

            if (payload.type === 'progress') {
              setProgress({
                current: payload.current,
                total: payload.total,
                succeeded: payload.succeeded,
                failed: payload.failed,
              });
              if (payload.lastResult) {
                opts.onRowDone?.(payload.lastResult as EnrichmentRowResult);
              }
            } else if (payload.type === 'done') {
              finalResults = (payload.results as EnrichmentRowResult[]) || [];
            } else if (payload.type === 'error') {
              throw new Error(payload.error || 'Enrichment selhal');
            }
          }
        }

        return finalResults;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setError('Enrichment byl zrušen');
          return [];
        }
        const message = err?.message || 'Enrichment selhal';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [],
  );

  return { loading, error, progress, validate, testOne, runBatch, cancel };
}
