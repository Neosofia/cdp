import { useEffect, useState } from 'react';

import { DEFAULT_PROCEDURE_TYPE_LABELS } from '@/shared/procedures/procedureCatalogApi';
import {
  getCachedProcedureCatalog,
  loadProcedureCatalog,
  type ProcedureCatalogEntry,
  type ProcedureCatalogState,
  type ProcedureType,
} from '@/shared/procedures/procedureCatalog';
import { toUserFacingError } from '@/shared/core/userFacingError';

const EMPTY_CATALOG: ProcedureCatalogState = {
  entries: [],
  typeLabels: DEFAULT_PROCEDURE_TYPE_LABELS,
};

export function useProcedureCatalog(token: string, activeActor: string) {
  const initialCatalog = getCachedProcedureCatalog() ?? EMPTY_CATALOG;
  const [catalog, setCatalog] = useState<ProcedureCatalogState>(initialCatalog);
  const [loading, setLoading] = useState(() => getCachedProcedureCatalog() === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const freshCatalog = getCachedProcedureCatalog();
    if (freshCatalog) {
      setCatalog(freshCatalog);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadProcedureCatalog(token, activeActor)
      .then((loaded) => {
        if (!cancelled) {
          setCatalog(loaded);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(toUserFacingError(loadError, 'Failed to load procedure catalog'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeActor]);

  return {
    entries: catalog.entries,
    typeLabels: catalog.typeLabels,
    loading,
    error,
  } satisfies {
    entries: ProcedureCatalogEntry[];
    typeLabels: Record<ProcedureType, string>;
    loading: boolean;
    error: string | null;
  };
}
