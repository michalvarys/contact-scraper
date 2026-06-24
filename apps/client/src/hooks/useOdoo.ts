import { useState, useCallback } from 'react';

interface MailingList {
  id: number;
  name: string;
  contact_count: number;
  contact_count_email: number;
  active: boolean;
}

interface OdooResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const BATCH_SIZE = 10;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function useOdoo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const rawApiCall = useCallback(
    async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
      const response = await fetch(`/api/odoo${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const text = await response.text();
      let data: OdooResponse<T>;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || `Server error (${response.status})`);
      }

      if (!data.success) {
        throw new Error(data.error || data.message || 'Operation failed');
      }

      return data.data as T;
    },
    [],
  );

  const apiCall = useCallback(
    async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        return await rawApiCall<T>(endpoint, options);
      } catch (err: any) {
        const errorMessage = err.message || 'An error occurred';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [rawApiCall],
  );

  const syncCompany = useCallback(
    async (companyId: string): Promise<number> => {
      const data = await apiCall<{ odooMailingContactId: number }>(`/companies/${companyId}/sync`, {
        method: 'POST',
      });
      return data.odooMailingContactId;
    },
    [apiCall],
  );

  const updateCompany = useCallback(
    async (companyId: string): Promise<boolean> => {
      const data = await apiCall<{ updated: boolean }>(`/companies/${companyId}/update`, {
        method: 'PUT',
      });
      return data.updated;
    },
    [apiCall],
  );

  const checkSyncStatus = useCallback(
    async (companyId: string) => {
      return await apiCall<{ companyId: string; isSynced: boolean; odooMailingContactId: number | null }>(
        `/companies/${companyId}/status`,
      );
    },
    [apiCall],
  );

  const addToMailingList = useCallback(
    async (companyId: string, mailingListId: number): Promise<{ subscriptionId: number }> => {
      return await apiCall(`/companies/${companyId}/add-to-list`, {
        method: 'POST',
        body: JSON.stringify({ mailingListId }),
      });
    },
    [apiCall],
  );

  const getMailingLists = useCallback(
    async (activeOnly = true): Promise<MailingList[]> => {
      return await apiCall(`/mailing-lists?activeOnly=${activeOnly}`);
    },
    [apiCall],
  );

  const syncBulk = useCallback(
    async (companyIds: string[]) => {
      const chunks = chunkArray(companyIds, BATCH_SIZE);
      const allMailingContactIds: number[] = [];
      let processed = 0;
      let batchErrors = 0;

      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: companyIds.length });

      try {
        for (const chunk of chunks) {
          try {
            const result = await rawApiCall<{ syncedCount: number; mailingContactIds: number[] }>('/companies/sync-bulk', {
              method: 'POST',
              body: JSON.stringify({ companyIds: chunk }),
            });
            allMailingContactIds.push(...result.mailingContactIds);
          } catch (err) {
            console.error('Batch sync error:', err);
            batchErrors++;
          }
          processed += chunk.length;
          setProgress({ current: processed, total: companyIds.length });
        }

        if (batchErrors > 0 && allMailingContactIds.length === 0) {
          throw new Error('Synchronizace selhala pro všechny záznamy');
        }
        if (batchErrors > 0) {
          setError(`${batchErrors} dávek selhalo, ${allMailingContactIds.length} kontaktů synchronizováno`);
        }

        return { syncedCount: allMailingContactIds.length, mailingContactIds: allMailingContactIds };
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [rawApiCall],
  );

  const updateBulk = useCallback(
    async (companyIds: string[]) => {
      const chunks = chunkArray(companyIds, BATCH_SIZE);
      let totalUpdated = 0;
      const allErrors: string[] = [];
      let processed = 0;

      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: companyIds.length });

      try {
        for (const chunk of chunks) {
          try {
            const result = await rawApiCall<{ updatedCount: number; totalRequested: number; errors?: string[] }>(
              '/companies/update-bulk',
              {
                method: 'PUT',
                body: JSON.stringify({ companyIds: chunk }),
              },
            );
            totalUpdated += result.updatedCount;
            if (result.errors) allErrors.push(...result.errors);
          } catch (err: any) {
            console.error('Batch update error:', err);
            allErrors.push(err.message || 'Batch failed');
          }
          processed += chunk.length;
          setProgress({ current: processed, total: companyIds.length });
        }

        return {
          updatedCount: totalUpdated,
          totalRequested: companyIds.length,
          errors: allErrors.length > 0 ? allErrors : undefined,
        };
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [rawApiCall],
  );

  const addToMailingListBulk = useCallback(
    async (companyIds: string[], mailingListId: number) => {
      const chunks = chunkArray(companyIds, BATCH_SIZE);
      const allSubscriptionIds: number[] = [];
      let processed = 0;
      let batchErrors = 0;

      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: companyIds.length });

      try {
        for (const chunk of chunks) {
          try {
            const result = await rawApiCall<{ addedCount: number; subscriptionIds: number[] }>(
              '/companies/add-to-list-bulk',
              {
                method: 'POST',
                body: JSON.stringify({ companyIds: chunk, mailingListId }),
              },
            );
            allSubscriptionIds.push(...result.subscriptionIds);
          } catch (err) {
            console.error('Batch add-to-list error:', err);
            batchErrors++;
          }
          processed += chunk.length;
          setProgress({ current: processed, total: companyIds.length });
        }

        if (batchErrors > 0 && allSubscriptionIds.length === 0) {
          throw new Error('Přidání do seznamu selhalo pro všechny záznamy');
        }
        if (batchErrors > 0) {
          setError(`${batchErrors} dávek selhalo, ${allSubscriptionIds.length} kontaktů přidáno`);
        }

        return { addedCount: allSubscriptionIds.length, subscriptionIds: allSubscriptionIds };
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [rawApiCall],
  );

  const createListWithCompanies = useCallback(
    async (name: string, companyIds: string[]) => {
      setLoading(true);
      setError(null);

      try {
        const listResult = await rawApiCall<MailingList>('/companies/create-list-with-companies', {
          method: 'POST',
          body: JSON.stringify({ name, companyIds: [] }),
        });

        setLoading(false);
        if (companyIds.length > 0) {
          await addToMailingListBulk(companyIds, listResult.id);
        }

        return listResult;
      } catch (err: any) {
        const errorMessage = err.message || 'An error occurred';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [rawApiCall, addToMailingListBulk],
  );

  return {
    loading,
    error,
    progress,
    syncCompany,
    updateCompany,
    checkSyncStatus,
    addToMailingList,
    getMailingLists,
    syncBulk,
    updateBulk,
    addToMailingListBulk,
    createListWithCompanies,
  };
}
