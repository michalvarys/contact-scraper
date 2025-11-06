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

export function useOdoo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T = any>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/odoo${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data: OdooResponse<T> = await response.json();

      if (!data.success) {
        throw new Error(data.message || data.error || 'Operation failed');
      }

      return data.data as T;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncCompany = useCallback(async (companyId: string): Promise<number> => {
    const data = await apiCall<{ odooPartnerId: number }>(
      `/companies/${companyId}/sync`,
      { method: 'POST' }
    );
    return data.odooPartnerId;
  }, [apiCall]);

  const checkSyncStatus = useCallback(async (companyId: string) => {
    return await apiCall<{ companyId: string; isSynced: boolean; odooPartnerId: number | null }>(
      `/companies/${companyId}/status`
    );
  }, [apiCall]);

  const addToMailingList = useCallback(async (
    companyId: string,
    mailingListId: number
  ): Promise<{ subscriptionId: number }> => {
    return await apiCall(
      `/companies/${companyId}/add-to-list`,
      {
        method: 'POST',
        body: JSON.stringify({ mailingListId }),
      }
    );
  }, [apiCall]);

  const getMailingLists = useCallback(async (activeOnly = true): Promise<MailingList[]> => {
    return await apiCall(`/mailing-lists?activeOnly=${activeOnly}`);
  }, [apiCall]);

  const syncBulk = useCallback(async (companyIds: string[]) => {
    return await apiCall<{ syncedCount: number; partnerIds: number[] }>(
      '/companies/sync-bulk',
      {
        method: 'POST',
        body: JSON.stringify({ companyIds }),
      }
    );
  }, [apiCall]);

  const addToMailingListBulk = useCallback(async (
    companyIds: string[],
    mailingListId: number
  ) => {
    return await apiCall<{ addedCount: number; subscriptionIds: number[] }>(
      '/companies/add-to-list-bulk',
      {
        method: 'POST',
        body: JSON.stringify({ companyIds, mailingListId }),
      }
    );
  }, [apiCall]);

  const createListWithCompanies = useCallback(async (
    name: string,
    companyIds: string[]
  ) => {
    return await apiCall<MailingList>(
      '/companies/create-list-with-companies',
      {
        method: 'POST',
        body: JSON.stringify({ name, companyIds }),
      }
    );
  }, [apiCall]);

  return {
    loading,
    error,
    syncCompany,
    checkSyncStatus,
    addToMailingList,
    getMailingLists,
    syncBulk,
    addToMailingListBulk,
    createListWithCompanies,
  };
}
