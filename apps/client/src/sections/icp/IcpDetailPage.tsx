"use client";

import React, { useState } from "react";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Loader2, Sparkles, Search, ArrowLeft, Play, ExternalLink, Mail, Phone, Globe, MapPin } from "lucide-react";
import Link from "next/link";
import TaskStatusBadge from "@/sections/tasks/components/TaskStatusBadge/TaskStatusBadge";

interface EnrichedData {
  industries?: string[];
  companyTypes?: string[];
  keywords?: string[];
  targetSize?: string;
  targetRevenue?: string;
  signals?: string[];
  negativeSignals?: string[];
  summary?: string;
}

interface SearchQuery {
  query: string;
  source: string;
}

export default function IcpDetailPage({ id }: { id: string }) {
  const { data: icp, isLoading, refetch } = trpc.icp.get.useQuery({ id });
  const { data: scores } = trpc.icp.getScores.useQuery({ icpId: id, limit: 200 });

  const [location, setLocation] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [generatingQueries, setGeneratingQueries] = useState(false);
  const [aiProvider, setAiProvider] = useState<"claude" | "gemini">("gemini");

  const utils = trpc.useUtils();

  const enrichMutation = trpc.icp.enrich.useMutation({
    onSuccess: () => {
      setEnriching(true);
      const interval = setInterval(async () => {
        const updated = await refetch();
        if (updated.data?.enrichedData) {
          setEnriching(false);
          clearInterval(interval);
        }
      }, 5000);
      setTimeout(() => { setEnriching(false); clearInterval(interval); }, 180000);
    },
  });
  const generateQueriesMutation = trpc.icp.generateQueries.useMutation({
    onSuccess: () => {
      setGeneratingQueries(true);
      setLocation("");
      const interval = setInterval(async () => {
        const updated = await refetch();
        if (updated.data?.searchQueries) {
          setGeneratingQueries(false);
          clearInterval(interval);
        }
      }, 5000);
      setTimeout(() => { setGeneratingQueries(false); clearInterval(interval); }, 180000);
    },
  });
  const createTaskMutation = trpc.scraper.createTask.useMutation({
    onSuccess: () => {
      utils.icp.get.invalidate({ id });
    },
  });
  const scoreTaskMutation = trpc.icp.scoreTaskCompanies.useMutation({
    onSuccess: () => {
      utils.icp.getScores.invalidate({ icpId: id });
    },
  });

  if (isLoading || !icp) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const enrichedData: EnrichedData | null = icp.enrichedData
    ? JSON.parse(icp.enrichedData)
    : null;
  const searchQueries: { queries: SearchQuery[] } | null = icp.searchQueries
    ? JSON.parse(icp.searchQueries)
    : null;

  const handleCreateTask = (query: SearchQuery) => {
    const scraperType =
      query.source === "FirmyCz"
        ? "FirmyCzScraper"
        : query.source === "ZlateStranky"
          ? "ZlateStrankyScraper"
          : "GoogleMapsScraper";

    createTaskMutation.mutate({
      scraperType,
      scraperConfig: { headless: true },
      searchQuery: query.query,
      icpProfileId: id,
    });
  };

  const handleCreateMultiTask = (query: SearchQuery) => {
    createTaskMutation.mutate({
      scraperType: "MultiScraper",
      scraperConfig: { headless: true },
      searchQuery: query.query,
      icpProfileId: id,
    });
  };

  const tasks = icp.scraperTasks || [];
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED" || t.status === "PROCESSED");

  const getTaskForQuery = (query: string) => {
    return tasks.find((t) => t.searchQuery === query);
  };

  const aboveThreshold = scores?.filter((s) => s.score >= icp.scoreThreshold) || [];
  const belowThreshold = scores?.filter((s) => s.score < icp.scoreThreshold) || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Link
        href="/icp"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Zpět na ICP profily
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{icp.name}</h1>
        <p className="text-gray-600 mt-2">{icp.description}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
          <span>Práh: {icp.scoreThreshold}%</span>
          <span>{icp._count.companyScores} ohodnocených firem</span>
          {aboveThreshold.length > 0 && (
            <Link
              href={`/?icpProfileId=${id}`}
              className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Zobrazit v tabulce kontaktů
            </Link>
          )}
        </div>
      </div>

      {/* AI Provider selector */}
      <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Provider:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setAiProvider("gemini")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              aiProvider === "gemini"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border hover:bg-gray-100 dark:hover:bg-gray-600"
            }`}
          >
            Gemini (API key)
          </button>
          <button
            onClick={() => setAiProvider("claude")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              aiProvider === "claude"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border hover:bg-gray-100 dark:hover:bg-gray-600"
            }`}
          >
            Claude (subscription)
          </button>
        </div>
      </div>

      {/* Step 1: Enrich */}
      <section className="mb-6 p-4 border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">1. AI Enrichment</h2>
        {enriching && !enrichedData && (
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>AI analyzuje váš ICP profil, počkejte prosím... (může trvat až minutu)</span>
            </div>
            <div className="grid grid-cols-2 gap-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="bg-gray-200 dark:bg-gray-600 rounded w-24 h-4" />
                  <div className="flex gap-1">
                    <div className="bg-gray-200 dark:bg-gray-600 rounded w-16 h-5" />
                    <div className="bg-gray-200 dark:bg-gray-600 rounded w-20 h-5" />
                    <div className="bg-gray-200 dark:bg-gray-600 rounded w-14 h-5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {enrichedData ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 p-2 rounded">
              {enrichedData.summary}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {enrichedData.industries && enrichedData.industries.length > 0 && (
                <div>
                  <span className="font-medium">Odvětví:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {enrichedData.industries.map((i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded text-xs">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {enrichedData.companyTypes && enrichedData.companyTypes.length > 0 && (
                <div>
                  <span className="font-medium">Typy firem:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {enrichedData.companyTypes.map((t) => (
                      <span key={t} className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {enrichedData.keywords && enrichedData.keywords.length > 0 && (
                <div>
                  <span className="font-medium">Klíčová slova:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {enrichedData.keywords.map((k) => (
                      <span key={k} className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {enrichedData.signals && enrichedData.signals.length > 0 && (
                <div>
                  <span className="font-medium">Pozitivní signály:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {enrichedData.signals.map((s) => (
                      <span key={s} className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => enrichMutation.mutate({ id, provider: aiProvider })}
              disabled={enrichMutation.isLoading || enriching}
            >
              {enrichMutation.isLoading || enriching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {enriching ? 'AI analyzuje...' : 'Znovu obohatit'}
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              AI rozšíří váš popis do detailních kritérií, klíčových slov a signálů.
            </p>
            <Button
              onClick={() => enrichMutation.mutate({ id, provider: aiProvider })}
              disabled={enrichMutation.isLoading || enriching}
            >
              {enrichMutation.isLoading || enriching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  AI analyzuje... (může trvat až minutu)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Obohatit pomocí AI
                </>
              )}
            </Button>
          </div>
        )}
      </section>

      {/* Step 2: Generate Search Queries */}
      <section className="mb-6 p-4 border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">2. Vyhledávací dotazy</h2>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Lokace (např. Praha, Brno...)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="max-w-xs"
          />
          <Button
            onClick={() =>
              generateQueriesMutation.mutate({
                id,
                location: location || undefined,
                provider: aiProvider,
              })
            }
            disabled={generateQueriesMutation.isLoading || generatingQueries || !enrichedData}
            variant="outline"
          >
            {generateQueriesMutation.isLoading || generatingQueries ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {generatingQueries ? "AI generuje dotazy..." : "Generovat dotazy"}
          </Button>
        </div>

        {!enrichedData && (
          <p className="text-sm text-amber-600">
            Nejprve obohaťte ICP profil pomocí AI (krok 1).
          </p>
        )}

        {generatingQueries && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>AI generuje vyhledávací dotazy, počkejte prosím... (může trvat až minutu)</span>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-600 rounded w-20 h-5" />
                <div className="bg-gray-200 dark:bg-gray-600 rounded flex-1 h-5" />
              </div>
            ))}
          </div>
        )}

        {searchQueries && searchQueries.queries.length > 0 && (
          <div className="space-y-2">
            {searchQueries.queries.map((q, i) => {
              const linkedTask = getTaskForQuery(q.query);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-mono shrink-0">
                      {q.source}
                    </span>
                    <span className="truncate">{q.query}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {linkedTask ? (
                      <Link
                        href={`/scraper/${linkedTask.id}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        <TaskStatusBadge status={linkedTask.status} />
                      </Link>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateTask(q)}
                          disabled={createTaskMutation.isLoading}
                          title={`Spustit jako ${q.source}`}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateMultiTask(q)}
                          disabled={createTaskMutation.isLoading}
                          title="Spustit přes MultiScraper"
                        >
                          Multi
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tasks.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <h3 className="text-sm font-medium mb-2 text-gray-500">
              Tasky ({tasks.length})
            </h3>
            <div className="space-y-1">
              {tasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/scraper/${t.id}`}
                  className="flex items-center justify-between p-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TaskStatusBadge status={t.status} />
                    <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {t.scraperType}
                    </span>
                    <span className="truncate max-w-xs">
                      {t.searchQuery || "—"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString("cs-CZ")}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Step 3: Scored Companies - Contact Table */}
      <section className="p-4 border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            3. Ohodnocené firmy
            {scores && scores.length > 0 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({aboveThreshold.length} nad prahem / {scores.length} celkem)
              </span>
            )}
          </h2>
          {aboveThreshold.length > 0 && (
            <Link
              href={`/?icpProfileId=${id}`}
              className="text-sm text-blue-500 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Otevřít v hlavní tabulce
            </Link>
          )}
        </div>

        {!scores || scores.length === 0 ? (
          <div className="space-y-3">
            {completedTasks.length > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                  Máte {completedTasks.length} dokončen{completedTasks.length === 1 ? 'ý' : completedTasks.length < 5 ? 'é' : 'ých'} task{completedTasks.length === 1 ? '' : completedTasks.length < 5 ? 'y' : 'ů'}, ale firmy ještě nebyly ohodnoceny.
                </p>
                <div className="flex flex-wrap gap-2">
                  {completedTasks.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      onClick={() => scoreTaskMutation.mutate({ taskId: t.id, provider: aiProvider })}
                      disabled={scoreTaskMutation.isLoading}
                    >
                      {scoreTaskMutation.isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      Ohodnotit: {t.searchQuery || t.scraperType}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Zatím nebyly žádné firmy ohodnoceny. Spusťte scraper s tímto ICP profilem.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                  <th className="py-2 px-2 w-12">Skóre</th>
                  <th className="py-2 px-2">Firma</th>
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2">Telefon</th>
                  <th className="py-2 px-2">Web</th>
                  <th className="py-2 px-2">Adresa</th>
                  <th className="py-2 px-2">Kategorie</th>
                </tr>
              </thead>
              <tbody>
                {aboveThreshold.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={7} className="py-2 px-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                        Nad prahem ({icp.scoreThreshold}%+)
                      </td>
                    </tr>
                    {aboveThreshold.map((s) => (
                      <CompanyRow key={s.id} score={s} threshold={icp.scoreThreshold} />
                    ))}
                  </>
                )}
                {belowThreshold.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={7} className="py-2 px-2 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800">
                        Pod prahem
                      </td>
                    </tr>
                    {belowThreshold.map((s) => (
                      <CompanyRow key={s.id} score={s} threshold={icp.scoreThreshold} />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CompanyRow({ score: s, threshold }: {
  score: {
    id: string;
    score: number;
    reasoning: string | null;
    company: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      website: string | null;
      address: string;
      link: string;
      categories?: { id: number; name: string }[];
    };
  };
  threshold: number;
}) {
  const c = s.company;
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="py-2 px-2">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold ${
            s.score >= threshold
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : s.score >= 40
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          }`}
          title={s.reasoning || undefined}
        >
          {s.score}
        </span>
      </td>
      <td className="py-2 px-2 font-medium">
        <a
          href={c.link}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 transition-colors"
          title={s.reasoning || undefined}
        >
          {c.name}
        </a>
      </td>
      <td className="py-2 px-2">
        {c.email ? (
          <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <span className="max-w-[160px] truncate inline-block">{c.email}</span>
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-2 px-2">
        {c.phone ? (
          <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-blue-600">
            <Phone className="h-3 w-3" />
            {c.phone}
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-2 px-2">
        {c.website ? (
          <a
            href={c.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <Globe className="h-3 w-3" />
            <span className="max-w-[120px] truncate inline-block">
              {c.website.replace(/^https?:\/\/(www\.)?/, '')}
            </span>
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-2 px-2">
        {c.address ? (
          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 max-w-[180px] truncate" title={c.address}>
            <MapPin className="h-3 w-3 shrink-0" />
            {c.address}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-2 px-2">
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {c.categories?.map((cat) => (
            <span key={cat.id} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs">
              {cat.name}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}
