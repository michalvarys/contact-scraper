import React, { useState, useCallback } from 'react';
import { Button } from '@/components/atoms/Button';
import { Loader2, Sparkles, Plus, Trash2, X, FlaskConical } from 'lucide-react';
import type { Company } from '@contact-scraper/api/routers';
import { useFilters } from '@/hooks/useFilters';
import { trpc } from '@/trpc/trpc';
import {
  useEnrichment,
  type EnrichmentConfig,
  type EnrichmentOutputColumn,
} from '@/hooks/useEnrichment';

interface EnrichmentBulkActionsProps {
  selectedCompanyIds: string[];
  selectedCompanies: Company[];
  isAllSelected?: boolean;
  /** Apply a single row's enriched data to the table optimistically. */
  onRowEnriched?: (companyId: string, data: Record<string, string>) => void;
  onComplete?: () => void;
}

/** Claude models available via the local subscription CLI. */
const MODEL_OPTIONS = [
  { id: 'haiku', label: 'Claude Haiku (rychlý, levný)' },
  { id: 'sonnet', label: 'Claude Sonnet (vyvážený)' },
  { id: 'opus', label: 'Claude Opus (nejpřesnější)' },
];

const DEFAULT_COLUMNS: EnrichmentOutputColumn[] = [
  { key: 'email', label: 'Email', description: 'firemní kontaktní email' },
  { key: 'phone', label: 'Telefon', description: 'firemní telefonní číslo' },
];

export const EnrichmentBulkActions: React.FC<EnrichmentBulkActionsProps> = ({
  selectedCompanyIds,
  selectedCompanies,
  isAllSelected = false,
  onRowEnriched,
  onComplete,
}) => {
  const { loading, error, progress, validate, testOne, runBatch, cancel } = useEnrichment();

  const { filters } = useFilters();
  const { data: allIds, isFetching: isAllIdsFetching } = trpc.company.getAllIds.useQuery(filters, {
    enabled: isAllSelected,
    keepPreviousData: false,
  });

  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<EnrichmentOutputColumn[]>(DEFAULT_COLUMNS);
  const [description, setDescription] = useState('Najdi a doplň chybějící údaje o této firmě.');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [modelId, setModelId] = useState('haiku');
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string> | null>(null);
  const [testing, setTesting] = useState(false);

  const getEffectiveIds = useCallback((): string[] => {
    if (isAllSelected && allIds && !isAllIdsFetching) {
      return allIds;
    }
    return selectedCompanyIds;
  }, [isAllSelected, allIds, isAllIdsFetching, selectedCompanyIds]);

  const allIdsReady = isAllSelected && allIds && !isAllIdsFetching;
  const effectiveCount = allIdsReady ? allIds.length : selectedCompanyIds.length;

  const buildConfig = useCallback((): EnrichmentConfig => {
    const cleaned = columns
      .map((c) => ({ ...c, key: c.key.trim() }))
      .filter((c) => c.key);
    return {
      outputColumns: cleaned,
      enrichmentDescription: description,
      customPrompt: useCustomPrompt && customPrompt.trim() ? customPrompt : undefined,
      modelId,
      useWebSearch,
    };
  }, [columns, description, useCustomPrompt, customPrompt, modelId, useWebSearch]);

  const updateColumn = (i: number, patch: Partial<EnrichmentOutputColumn>) => {
    setColumns((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };
  const addColumn = () => setColumns((prev) => [...prev, { key: '', label: '', description: '' }]);
  const removeColumn = (i: number) => setColumns((prev) => prev.filter((_, idx) => idx !== i));

  const handleTest = async () => {
    const ids = getEffectiveIds();
    if (ids.length === 0) return;
    const config = buildConfig();
    if (config.outputColumns.length === 0) {
      setNotice('⚠️ Přidejte alespoň jeden výstupní sloupec.');
      return;
    }
    setTesting(true);
    setNotice(null);
    setTestResult(null);
    try {
      // Validate CLI is logged in before spending a real call.
      const v = await validate();
      if (!v.valid) {
        setNotice(`⚠️ ${v.error || 'Claude CLI není přihlášené. Spusťte `claude login`.'}`);
        return;
      }
      const result = await testOne(ids[0], config);
      if (result.success && result.data) {
        setTestResult(result.data);
        onRowEnriched?.(result.companyId, result.data);
        setNotice(`✓ Test proběhl na firmě „${selectedCompanies[0]?.name ?? ids[0]}".`);
      } else {
        setNotice(`⚠️ Test selhal: ${result.error || 'neznámá chyba'}`);
      }
    } catch (err: any) {
      setNotice(`⚠️ ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleRunBatch = async () => {
    const ids = getEffectiveIds();
    if (ids.length === 0) return;
    const config = buildConfig();
    if (config.outputColumns.length === 0) {
      setNotice('⚠️ Přidejte alespoň jeden výstupní sloupec.');
      return;
    }
    setNotice(null);
    try {
      const results = await runBatch(ids, config, {
        onRowDone: (r) => {
          if (r.success && r.data) onRowEnriched?.(r.companyId, r.data);
        },
      });
      const ok = results.filter((r) => r.success).length;
      const fail = results.length - ok;
      setNotice(
        fail > 0
          ? `✓ Obohaceno ${ok}/${results.length} firem (${fail} chyb).`
          : `✓ Obohaceno ${ok} firem.`,
      );
      setOpen(false);
      onComplete?.();
    } catch (err: any) {
      setNotice(`⚠️ ${err.message}`);
    }
  };

  if (selectedCompanyIds.length === 0) {
    return null;
  }

  const progressPct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <>
      <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-violet-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Enrichment ({effectiveCount} vybráno)
          </h3>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Obohatit přes Claude
          </Button>
        </div>

        {notice && !open && (
          <div className="mt-3 p-3 bg-white border border-violet-200 text-violet-900 rounded-md text-sm">
            {notice}
          </div>
        )}

        {loading && progress && !open && (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-violet-800 mb-1">
              <span>
                Obohacuji... ({progress.succeeded} ✓ / {progress.failed} ✗)
              </span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-violet-200 rounded-full h-2">
              <div
                className="bg-violet-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancel}
              className="mt-2"
            >
              Zrušit
            </Button>
          </div>
        )}
      </div>

      {/* Config dialog */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                Konfigurace AI enrichmentu
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Zavřít"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-sm text-gray-600">
                Používá vaše lokální <strong>Claude Code předplatné</strong> (žádný API klíč).
                Obohatí {effectiveCount} vybraných firem. Doporučujeme nejdřív otestovat na jedné.
              </p>

              {/* Model + web search */}
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">Model</label>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <input
                    type="checkbox"
                    checked={useWebSearch}
                    onChange={(e) => setUseWebSearch(e.target.checked)}
                  />
                  Použít web search
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Popis úlohy</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Co má AI zjistit o firmě..."
                />
              </div>

              {/* Output columns */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Výstupní sloupce</label>
                  <Button type="button" variant="outline" size="sm" onClick={addColumn}>
                    <Plus className="h-4 w-4 mr-1" /> Přidat sloupec
                  </Button>
                </div>
                <div className="space-y-2">
                  {columns.map((col, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={col.key}
                        onChange={(e) => updateColumn(i, { key: e.target.value })}
                        placeholder="klíč (např. ico)"
                        className="w-32 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="text"
                        value={col.description ?? ''}
                        onChange={(e) => updateColumn(i, { description: e.target.value })}
                        placeholder="popis – co najít"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeColumn(i)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        aria-label="Odebrat sloupec"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Známé klíče <code>email</code>, <code>phone</code>, <code>website</code> doplní
                  pole firmy (jen pokud jsou prázdná). Ostatní se uloží do metadat.
                </p>
              </div>

              {/* Custom prompt */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1">
                  <input
                    type="checkbox"
                    checked={useCustomPrompt}
                    onChange={(e) => setUseCustomPrompt(e.target.checked)}
                  />
                  Vlastní prompt (pokročilé)
                </label>
                {useCustomPrompt && (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                    placeholder={'Placeholdery: {name} {address} {email} {phone} {website} {categories}\nVrať POUZE JSON s definovanými klíči.'}
                  />
                )}
              </div>

              {/* Test result */}
              {testResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm font-medium text-green-900 mb-1">Výsledek testu:</p>
                  <pre className="text-xs text-green-800 whitespace-pre-wrap">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Notice / error */}
              {(notice || error) && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-sm">
                  {notice || error}
                </div>
              )}

              {/* Batch progress in dialog */}
              {loading && progress && (
                <div>
                  <div className="flex justify-between text-sm text-violet-800 mb-1">
                    <span>
                      Obohacuji... ({progress.succeeded} ✓ / {progress.failed} ✗)
                    </span>
                    <span>
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-violet-200 rounded-full h-2">
                    <div
                      className="bg-violet-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end p-5 border-t bg-gray-50">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || loading}
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testuji...
                  </>
                ) : (
                  <>
                    <FlaskConical className="mr-2 h-4 w-4" /> Test na 1 firmě
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={handleRunBatch}
                disabled={loading || testing}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Obohacuji...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Obohatit {effectiveCount} firem
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnrichmentBulkActions;
