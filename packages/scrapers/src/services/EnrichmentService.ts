import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { prisma } from '@contact-scraper/db';

/**
 * Lead enrichment powered by the locally installed Claude Code CLI subscription
 * (`claude -p`). No API key is used — auth comes from the machine's `claude login`.
 *
 * Modelled on the Altclay enrichment flow: the user defines output columns and an
 * optional custom prompt, and each company row is enriched independently with
 * concurrency control and retry. Results are written back to the Company record
 * (known contact fields) and to CompanyMetadata.data (JSON) for everything else.
 */

export interface EnrichmentOutputColumn {
  /** Machine key written to the result JSON (e.g. "ico", "linkedin"). */
  key: string;
  /** Human label shown in the UI (optional, defaults to key). */
  label?: string;
  /** Short description of what to find, fed into the prompt. */
  description?: string;
}

export interface EnrichmentConfig {
  /** Output fields the model must return. */
  outputColumns: EnrichmentOutputColumn[];
  /** High-level description of the enrichment task. */
  enrichmentDescription?: string;
  /**
   * Optional custom prompt template. Supports placeholders {name}, {address},
   * {email}, {phone}, {website}, {categories}. When provided it fully replaces
   * the generated prompt.
   */
  customPrompt?: string;
  /** Claude model id (e.g. "claude-haiku-4-5", "sonnet", "opus"). Optional. */
  modelId?: string;
  /** Whether the model should use web search (default true). */
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

const KNOWN_COMPANY_FIELDS = new Set(['email', 'phone', 'website', 'name', 'address']);
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 2;
const CLI_TIMEOUT_MS = 120_000;

/**
 * Resolves the Claude Code CLI binary. Prefers PATH ("claude"), falling back to
 * the common local install location so it works even when the server's PATH is
 * minimal (e.g. spawned outside an interactive shell).
 */
function resolveClaudeBin(): string {
  const local = join(homedir(), '.local', 'bin', 'claude');
  if (existsSync(local)) return local;
  return 'claude';
}

interface ClaudeCliRun {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Runs the Claude Code CLI in headless mode (`claude -p`) using the machine's
 * logged-in subscription. Local-only — not for serverless deployments.
 *
 * When web search is enabled we must both allow the WebSearch tool and bypass
 * the interactive permission prompt — in headless mode Claude otherwise refuses
 * the search ("The search needs permission") and answers from memory only.
 */
function runClaudeCli(
  prompt: string,
  modelId?: string,
  useWebSearch = true,
): Promise<ClaudeCliRun> {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'json'];
    if (useWebSearch) {
      args.push('--allowedTools', 'WebSearch', '--permission-mode', 'bypassPermissions');
    }
    if (modelId) {
      args.push('--model', modelId);
    }
    execFile(
      resolveClaudeBin(),
      args,
      { maxBuffer: 10 * 1024 * 1024, timeout: CLI_TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr?.trim() || error.message;
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return reject(
              new Error(
                'Claude CLI nenalezeno. Nainstalujte Claude Code a spusťte `claude login` (subscription).',
              ),
            );
          }
          return reject(new Error(detail || 'Claude CLI selhalo'));
        }
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.is_error) {
            return reject(new Error(parsed.result || 'Claude CLI vrátilo chybu'));
          }
          resolve({
            text: parsed.result ?? '',
            inputTokens: parsed.usage?.input_tokens ?? 0,
            outputTokens: parsed.usage?.output_tokens ?? 0,
          });
        } catch {
          reject(new Error('Nepodařilo se zpracovat výstup Claude CLI'));
        }
      },
    );
  });
}

/** Extracts the first JSON object from a model response and coerces values to strings. */
function extractJSON(text: string): Record<string, string> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('V odpovědi nebyl nalezen JSON objekt');
  }
  const parsed = JSON.parse(jsonMatch[0]);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    result[key] = String(value ?? 'N/A');
  }
  return result;
}

type CompanyRowData = Record<string, string>;

/** Flattens a Company (with categories) into the placeholder map used by prompts. */
function companyToRowData(company: {
  name: string;
  address: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  categories?: { name: string }[];
}): CompanyRowData {
  return {
    name: company.name ?? '',
    address: company.address ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    website: company.website ?? '',
    categories: (company.categories ?? []).map((c) => c.name).join(', '),
  };
}

const INPUT_PLACEHOLDERS = ['name', 'address', 'email', 'phone', 'website', 'categories'];

/** Builds the enrichment prompt for one company. Mirrors Altclay's buildPrompt. */
export function buildPrompt(rowData: CompanyRowData, config: EnrichmentConfig): string {
  const useWebSearch = config.useWebSearch ?? true;

  if (config.customPrompt) {
    let prompt = config.customPrompt;
    for (const col of INPUT_PLACEHOLDERS) {
      prompt = prompt.replace(new RegExp(`\\{${col}\\}`, 'g'), rowData[col] || '');
    }
    return prompt;
  }

  const inputData = INPUT_PLACEHOLDERS.filter((col) => rowData[col])
    .map((col) => `"${col}":"${rowData[col]}"`)
    .join(',');

  const outputFields = config.outputColumns
    .map((f) => {
      const hint = f.description ? ` (${f.description})` : '';
      return `"${f.key}":"string${hint}"`;
    })
    .join(',');

  const description =
    config.enrichmentDescription?.trim() ||
    'Najdi a doplň chybějící údaje o této firmě.';

  const searchInstruction = useWebSearch
    ? 'Použij web search pro aktuální data.'
    : 'Použij pouze své znalosti (bez web search).';

  return `${description}

Firma: {${inputData}}

Vrať POUZE validní JSON: {${outputFields}}
${searchInstruction} Buď stručný. "N/A" pokud údaj nelze zjistit. Žádný další text.`;
}

/** Enriches a single company by id. Used by both single and batch flows. */
export async function enrichCompany(
  companyId: string,
  config: EnrichmentConfig,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<EnrichmentRowResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { categories: true, metadata: true },
  });

  if (!company) {
    return { companyId, success: false, error: 'Firma nenalezena' };
  }

  const rowData = companyToRowData(company);
  const prompt = buildPrompt(rowData, config);

  let lastError = '';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { text, inputTokens, outputTokens } = await runClaudeCli(
        prompt,
        config.modelId,
        config.useWebSearch ?? true,
      );
      const data = extractJSON(text);
      await persistEnrichment(company, data);
      return { companyId, success: true, data, inputTokens, outputTokens };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Neznámá chyba';
      // Backoff before retry (skip wait after the final attempt)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  return { companyId, success: false, error: lastError };
}

/**
 * Persists enrichment results. Known contact fields are written to the Company
 * record only when currently empty (never overwrite real scraped data); all
 * other fields are merged into CompanyMetadata.data as JSON.
 */
async function persistEnrichment(
  company: {
    id: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    metadata: { data: string | null } | null;
  },
  data: Record<string, string>,
): Promise<void> {
  const companyUpdate: Record<string, string> = {};
  const metadataExtra: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(data)) {
    const value = (rawValue ?? '').trim();
    if (!value || value.toUpperCase() === 'N/A') continue;

    if (KNOWN_COMPANY_FIELDS.has(key)) {
      // Only fill empty contact fields; don't clobber existing scraped values.
      const current = (company as Record<string, unknown>)[key];
      if (key === 'name' || key === 'address') {
        // Core identity fields are never overwritten by enrichment.
        metadataExtra[key] = value;
      } else if (!current) {
        companyUpdate[key] = value;
      } else {
        metadataExtra[key] = value;
      }
    } else {
      metadataExtra[key] = value;
    }
  }

  // Merge new extra fields into existing metadata JSON.
  let mergedData: Record<string, unknown> = {};
  if (company.metadata?.data) {
    try {
      mergedData = JSON.parse(company.metadata.data);
    } catch {
      mergedData = {};
    }
  }
  const enrichment = {
    ...((mergedData.enrichment as Record<string, unknown>) || {}),
    ...metadataExtra,
    enrichedAt: new Date().toISOString(),
  };
  mergedData.enrichment = enrichment;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      ...companyUpdate,
      metadata: {
        upsert: {
          create: { data: JSON.stringify(mergedData) },
          update: { data: JSON.stringify(mergedData) },
        },
      },
    },
  });
}

export interface BatchProgress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
}

/**
 * Enriches many companies with bounded concurrency. Calls onProgress after each
 * row so callers (e.g. an SSE/stream endpoint) can report progress.
 */
export async function enrichCompaniesBatch(
  companyIds: string[],
  config: EnrichmentConfig,
  options: {
    concurrency?: number;
    maxRetries?: number;
    onProgress?: (progress: BatchProgress, lastResult: EnrichmentRowResult) => void;
  } = {},
): Promise<EnrichmentRowResult[]> {
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const results: EnrichmentRowResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < companyIds.length) {
      const myIndex = index++;
      const id = companyIds[myIndex];
      const result = await enrichCompany(id, config, maxRetries);
      results[myIndex] = result;
      if (result.success) succeeded++;
      else failed++;
      options.onProgress?.(
        { current: results.filter(Boolean).length, total: companyIds.length, succeeded, failed },
        result,
      );
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, companyIds.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Validates that the Claude CLI is installed and authenticated. */
export async function validateClaudeCli(): Promise<{ valid: boolean; error?: string }> {
  try {
    const { text } = await runClaudeCli('Odpověz jediným slovem: ok', undefined, false);
    return { valid: text.toLowerCase().includes('ok') || text.trim().length > 0 };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Claude CLI není dostupné nebo nepřihlášené.',
    };
  }
}
