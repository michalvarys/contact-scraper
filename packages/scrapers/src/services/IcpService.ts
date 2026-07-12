import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { prisma } from '@contact-scraper/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AiProvider = 'claude' | 'gemini';

const CLI_TIMEOUT_MS = 120_000;
const SCORE_CONCURRENCY = 3;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function resolveClaudeBin(): string {
  const local = join(homedir(), '.local', 'bin', 'claude');
  if (existsSync(local)) return local;
  return 'claude';
}

interface AiResult {
  text: string;
}

function runClaudeCli(
  prompt: string,
  modelId?: string,
  useWebSearch = false,
): Promise<AiResult> {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'json'];
    if (useWebSearch) {
      args.push('--allowedTools', 'WebSearch', '--permission-mode', 'bypassPermissions');
    }
    if (modelId) {
      args.push('--model', modelId);
    }

    console.log(`[ICP] Running claude CLI with model=${modelId || 'default'}...`);

    execFile(
      resolveClaudeBin(),
      args,
      { maxBuffer: 10 * 1024 * 1024, timeout: CLI_TIMEOUT_MS, cwd: homedir() },
      (error, stdout, stderr) => {
        // Try to parse stdout first — claude CLI may write warnings to stderr
        // but still produce valid JSON output on stdout
        if (stdout?.trim()) {
          try {
            const parsed = JSON.parse(stdout);
            if (parsed.is_error) {
              return reject(new Error(parsed.result || 'Claude CLI vrátilo chybu'));
            }
            console.log(`[ICP] Claude CLI success: ${parsed.duration_ms}ms, cost: $${parsed.total_cost_usd?.toFixed(4)}`);
            return resolve({ text: parsed.result ?? '' });
          } catch {
            // stdout is not valid JSON — fall through to error handling
          }
        }

        if (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return reject(new Error('Claude CLI nenalezeno. Spusťte `claude login`.'));
          }
          const detail = stderr?.trim() || error.message;
          console.error('[ICP] Claude CLI error:', detail);
          return reject(new Error(detail || 'Claude CLI selhalo'));
        }

        console.error('[ICP] Failed to parse CLI output:', stdout?.slice(0, 200));
        reject(new Error('Nepodařilo se zpracovat výstup Claude CLI'));
      },
    );
  });
}

async function runGeminiAi(prompt: string, modelId?: string): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY není nastavený. Přidejte ho do .env souboru.');
  }

  const model = modelId || DEFAULT_GEMINI_MODEL;
  console.log(`[ICP] Running Gemini AI with model=${model}...`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({ model });
  const result = await generativeModel.generateContent(prompt);
  const text = result.response.text();

  console.log(`[ICP] Gemini AI success, response length: ${text.length}`);
  return { text };
}

async function runAi(
  prompt: string,
  provider: AiProvider = 'claude',
  modelId?: string,
  useWebSearch = false,
): Promise<AiResult> {
  if (provider === 'gemini') {
    return runGeminiAi(prompt, modelId);
  }
  return runClaudeCli(prompt, modelId || 'sonnet', useWebSearch);
}

function extractJSON(text: string): Record<string, any> {
  const cleaned = text.replace(/^```json\s*|```\s*$/gs, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('V odpovědi nebyl nalezen JSON objekt');
  }
  return JSON.parse(jsonMatch[0]);
}

export interface EnrichedIcpData {
  industries: string[];
  companyTypes: string[];
  keywords: string[];
  targetSize: string;
  targetRevenue: string;
  signals: string[];
  negativeSignals: string[];
  summary: string;
}

export interface IcpSearchQueries {
  queries: Array<{
    query: string;
    source: string;
  }>;
}

export interface IcpScoreResult {
  companyId: string;
  score: number;
  reasoning: string;
  success: boolean;
  error?: string;
}

export interface IcpScoreBatchProgress {
  current: number;
  total: number;
  scored: number;
  skipped: number;
  failed: number;
}

/**
 * Enriches an ICP description using AI. Takes a brief user description and
 * returns detailed criteria, keywords, industries, and search queries.
 */
export async function enrichIcpProfile(
  icpId: string,
  modelId?: string,
  provider: AiProvider = 'claude',
): Promise<EnrichedIcpData> {
  const icp = await prisma.icpProfile.findUnique({ where: { id: icpId } });
  if (!icp) throw new Error('ICP profil nenalezen');

  const prompt = `Jsi expert na definování Ideal Customer Profiles (ICP) pro B2B lead generation.

Uživatel popsal svůj ICP takto:
"${icp.description}"

Na základě tohoto popisu vytvoř detailní ICP profil. Vrať POUZE validní JSON v tomto formátu:
{
  "industries": ["odvětví 1", "odvětví 2"],
  "companyTypes": ["typ firmy 1", "typ firmy 2"],
  "keywords": ["klíčové slovo pro vyhledávání 1", "klíčové slovo 2"],
  "targetSize": "popis velikosti cílové firmy",
  "targetRevenue": "popis obratu cílové firmy",
  "signals": ["pozitivní signál 1 (indikátor že firma je dobrý lead)", "signál 2"],
  "negativeSignals": ["negativní signál 1 (indikátor že firma NENÍ dobrý lead)", "signál 2"],
  "summary": "Stručné shrnutí ICP profilu v 2-3 větách"
}

Buď konkrétní a praktický. Keywords by měly být vhodné pro vyhledávání na Google Maps, Firmy.cz atd. Žádný další text mimo JSON.`;

  const { text } = await runAi(prompt, provider, modelId, true);
  const enrichedData = extractJSON(text) as EnrichedIcpData;

  await prisma.icpProfile.update({
    where: { id: icpId },
    data: { enrichedData: JSON.stringify(enrichedData) },
  });

  return enrichedData;
}

/**
 * Generates search queries for scrapers based on the enriched ICP data.
 * Optionally takes a location to scope the queries.
 */
export async function generateSearchQueries(
  icpId: string,
  location?: string,
  modelId?: string,
  provider: AiProvider = 'claude',
): Promise<IcpSearchQueries> {
  const icp = await prisma.icpProfile.findUnique({ where: { id: icpId } });
  if (!icp) throw new Error('ICP profil nenalezen');

  const enrichedData = icp.enrichedData ? JSON.parse(icp.enrichedData) as EnrichedIcpData : null;

  const locationPart = location ? `\nLokace pro vyhledávání: "${location}"` : '';

  const prompt = `Na základě tohoto ICP profilu vygeneruj vyhledávací dotazy pro scrapery.

ICP název: "${icp.name}"
ICP popis: "${icp.description}"
${enrichedData ? `Detailní kritéria: ${JSON.stringify(enrichedData)}` : ''}${locationPart}

Vygeneruj 5-10 vyhledávacích dotazů optimalizovaných pro tyto zdroje:
- GoogleMaps (Google Maps search)
- FirmyCz (firmy.cz hledání)
- ZlateStranky (zlatestranky.cz)

Vrať POUZE validní JSON:
{
  "queries": [
    {"query": "dotaz pro vyhledání", "source": "GoogleMaps"},
    {"query": "dotaz pro vyhledání", "source": "FirmyCz"}
  ]
}

Dotazy by měly být v češtině a přizpůsobené cílovému profilu. Žádný další text.`;

  const { text } = await runAi(prompt, provider, modelId, false);
  const searchQueries = extractJSON(text) as IcpSearchQueries;

  await prisma.icpProfile.update({
    where: { id: icpId },
    data: { searchQueries: JSON.stringify(searchQueries) },
  });

  return searchQueries;
}

/**
 * Scores a single company against an ICP profile using AI.
 */
export async function scoreCompany(
  companyId: string,
  icpId: string,
  modelId?: string,
  provider: AiProvider = 'claude',
): Promise<IcpScoreResult> {
  const [company, icp] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: { categories: true, metadata: true },
    }),
    prisma.icpProfile.findUnique({ where: { id: icpId } }),
  ]);

  if (!company) return { companyId, score: 0, reasoning: 'Firma nenalezena', success: false };
  if (!icp) return { companyId, score: 0, reasoning: 'ICP nenalezen', success: false };

  const enrichedData = icp.enrichedData ? JSON.parse(icp.enrichedData) as EnrichedIcpData : null;

  let metadataInfo = '';
  if (company.metadata?.data) {
    try {
      const md = JSON.parse(company.metadata.data);
      if (md.enrichment) {
        metadataInfo = `\nDoplňující data: ${JSON.stringify(md.enrichment)}`;
      }
    } catch { /* ignore */ }
  }

  const prompt = `Ohodnoť tuto firmu na stupnici 0-100 podle shody s ICP profilem.

ICP: "${icp.name}"
Popis: "${icp.description}"
${enrichedData ? `Detailní kritéria: ${JSON.stringify(enrichedData)}` : ''}

Firma:
- Název: ${company.name}
- Adresa: ${company.address}
- Email: ${company.email || 'N/A'}
- Telefon: ${company.phone || 'N/A'}
- Web: ${company.website || 'N/A'}
- Kategorie: ${company.categories.map((c) => c.name).join(', ') || 'N/A'}${metadataInfo}

Vrať POUZE validní JSON:
{
  "score": 75,
  "reasoning": "Krátké zdůvodnění skóre (1-2 věty)"
}

Skóre 0 = vůbec neodpovídá, 100 = perfektní shoda. Buď přísný a realistický. Žádný další text.`;

  try {
    const { text } = await runAi(prompt, provider, modelId, false);
    const result = extractJSON(text);
    const score = Math.max(0, Math.min(100, parseInt(result.score, 10) || 0));
    const reasoning = result.reasoning || '';

    await prisma.icpCompanyScore.upsert({
      where: { companyId_icpId: { companyId, icpId } },
      create: { companyId, icpId, score, reasoning },
      update: { score, reasoning, scoredAt: new Date() },
    });

    return { companyId, score, reasoning, success: true };
  } catch (err: any) {
    return {
      companyId,
      score: 0,
      reasoning: '',
      success: false,
      error: err.message || 'Scoring selhalo',
    };
  }
}

/**
 * Scores multiple companies against an ICP in batches with concurrency control.
 * Tags matching companies (score >= threshold) with the ICP category.
 */
export async function scoreCompanies(
  companyIds: string[],
  icpId: string,
  onProgress?: (progress: IcpScoreBatchProgress) => void,
  modelId?: string,
  provider: AiProvider = 'claude',
): Promise<IcpScoreResult[]> {
  const icp = await prisma.icpProfile.findUnique({ where: { id: icpId } });
  if (!icp) throw new Error('ICP profil nenalezen');

  const threshold = icp.scoreThreshold;
  const results: IcpScoreResult[] = [];
  let current = 0;
  let scored = 0;
  let skipped = 0;
  let failed = 0;

  const categoryId = await ensureIcpCategory(icpId);

  const queue = [...companyIds];

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const id = queue.shift()!;
      const existing = await prisma.icpCompanyScore.findUnique({
        where: { companyId_icpId: { companyId: id, icpId } },
      });

      if (existing) {
        skipped++;
        current++;
        results.push({ companyId: id, score: existing.score, reasoning: existing.reasoning || '', success: true });
        onProgress?.({ current, total: companyIds.length, scored, skipped, failed });
        continue;
      }

      const result = await scoreCompany(id, icpId, modelId, provider);
      results.push(result);
      current++;

      if (result.success) {
        scored++;
        if (result.score >= threshold && categoryId) {
          await prisma.company.update({
            where: { id },
            data: { categories: { connect: { id: categoryId } } },
          });
        }
      } else {
        failed++;
      }

      onProgress?.({ current, total: companyIds.length, scored, skipped, failed });
    }
  }

  const workers = Array.from({ length: SCORE_CONCURRENCY }, () => processNext());
  await Promise.all(workers);

  return results;
}

/**
 * Ensures a category exists for the ICP profile (e.g. "ICP: SaaS Companies").
 * Creates the category if needed and links it to the ICP profile.
 */
async function ensureIcpCategory(icpId: string): Promise<number | null> {
  const icp = await prisma.icpProfile.findUnique({
    where: { id: icpId },
    include: { category: true },
  });
  if (!icp) return null;

  if (icp.categoryId && icp.category) return icp.categoryId;

  const categoryName = `ICP: ${icp.name}`;
  const category = await prisma.category.upsert({
    where: { name: categoryName },
    create: { name: categoryName },
    update: {},
  });

  await prisma.icpProfile.update({
    where: { id: icpId },
    data: { categoryId: category.id },
  });

  return category.id;
}

/**
 * Scores all companies from a completed scraper task against the task's ICP.
 * Called after a scraper task finishes when it has an associated ICP.
 */
export async function scoreTaskCompanies(
  taskId: string,
  onProgress?: (progress: IcpScoreBatchProgress) => void,
  modelId?: string,
  provider: AiProvider = 'claude',
): Promise<IcpScoreResult[]> {
  const task = await prisma.scraperTask.findUnique({
    where: { id: taskId },
    include: { scrapedLinks: true },
  });

  if (!task?.icpProfileId) return [];

  const companyIds = task.scrapedLinks
    .filter((l) => l.companyId && l.status === 'PROCESSED')
    .map((l) => l.companyId!);

  if (companyIds.length === 0) return [];

  return scoreCompanies(companyIds, task.icpProfileId, onProgress, modelId, provider);
}
