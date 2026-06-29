import {
  fetchProcedureCatalog,
  type ProcedureCatalogEntry,
  type ProcedureType,
} from '@/shared/procedures/procedureCatalogApi';

export type { ProcedureCatalogEntry, ProcedureType };

export interface ProcedureCatalogState {
  entries: ProcedureCatalogEntry[];
  typeLabels: Record<ProcedureType, string>;
}

/** Procedure catalog is static reference data; refresh at most every 30 minutes. */
export const PROCEDURE_CATALOG_CACHE_MS = 30 * 60 * 1000;

interface CachedProcedureCatalog {
  catalog: ProcedureCatalogState;
  cachedAt: number;
}

let cachedCatalog: CachedProcedureCatalog | null = null;
let inflightCatalog: Promise<ProcedureCatalogState> | null = null;

function isProcedureCatalogCacheFresh(entry: CachedProcedureCatalog | null): entry is CachedProcedureCatalog {
  if (!entry) {
    return false;
  }
  return Date.now() - entry.cachedAt < PROCEDURE_CATALOG_CACHE_MS;
}

export function getCachedProcedureCatalog(): ProcedureCatalogState | null {
  if (!isProcedureCatalogCacheFresh(cachedCatalog)) {
    return null;
  }
  return cachedCatalog.catalog;
}

export async function loadProcedureCatalog(
  token: string,
  activeActor: string,
): Promise<ProcedureCatalogState> {
  const fresh = getCachedProcedureCatalog();
  if (fresh) {
    return fresh;
  }
  if (!inflightCatalog) {
    inflightCatalog = fetchProcedureCatalog(token, activeActor)
      .then((response) => {
        const catalog: ProcedureCatalogState = {
          entries: response.items,
          typeLabels: response.procedureTypeLabels,
        };
        cachedCatalog = {
          catalog,
          cachedAt: Date.now(),
        };
        return catalog;
      })
      .finally(() => {
        inflightCatalog = null;
      });
  }
  return inflightCatalog;
}

export function procedureById(
  entries: ProcedureCatalogEntry[],
  id: string,
): ProcedureCatalogEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

/** Resolve a stored surgery label to a catalog entry when opening the edit form. */
export function procedureIdForSurgeryName(
  entries: ProcedureCatalogEntry[],
  surgery: string,
): string | null {
  const normalized = surgery.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = entries.find((entry) => entry.name.toLowerCase() === normalized);
  if (exact) {
    return exact.id;
  }

  const searchMatches = searchProcedureCatalog(entries, surgery);
  if (searchMatches.length === 1) {
    return searchMatches[0].id;
  }

  const substringMatches = entries.filter((entry) => {
    const name = entry.name.toLowerCase();
    return normalized.includes(name) || name.includes(normalized);
  });
  if (substringMatches.length === 1) {
    return substringMatches[0].id;
  }

  return null;
}

export function searchProcedureCatalog(
  entries: ProcedureCatalogEntry[],
  query: string,
  typeLabels: Partial<Record<ProcedureType, string>> = {},
): ProcedureCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return entries;
  }
  return entries.filter((entry) => {
    const haystack = [
      entry.name,
      entry.specialty,
      entry.emrRef,
      typeLabels[entry.procedureType] ?? entry.procedureType,
      entry.procedureType,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function groupProceduresBySpecialty(
  entries: ProcedureCatalogEntry[],
): { specialty: string; procedures: ProcedureCatalogEntry[] }[] {
  const bySpecialty = new Map<string, ProcedureCatalogEntry[]>();
  for (const entry of entries) {
    bySpecialty.set(entry.specialty, [...(bySpecialty.get(entry.specialty) ?? []), entry]);
  }
  return [...bySpecialty.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([specialty, procedures]) => ({
      specialty,
      procedures: procedures.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
