import type { components } from '@/shared/api/generated/care-episode.schema';
import { careEpisodeApiClient } from '@/shared/api/serviceApiClients';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

type ProcedureCatalogEntryWire = components['schemas']['ProcedureCatalogEntry'];

export type ProcedureType = ProcedureCatalogEntryWire['procedure_type'];

export interface ProcedureCatalogEntry {
  id: string;
  name: string;
  procedureType: ProcedureType;
  emrRef: string;
  specialty: string;
}

export interface ProcedureCatalogResponse {
  items: ProcedureCatalogEntry[];
  procedureTypeLabels: Record<ProcedureType, string>;
}

export const DEFAULT_PROCEDURE_TYPE_LABELS: Record<ProcedureType, string> = {
  'general-surgery': 'General surgery',
  orthopedic: 'Orthopedic',
  cardiac: 'Cardiac',
  other: 'Other',
};

function mapProcedureCatalogEntry(entry: ProcedureCatalogEntryWire): ProcedureCatalogEntry {
  return {
    id: entry.id,
    name: entry.name,
    procedureType: entry.procedure_type,
    emrRef: entry.emr_ref,
    specialty: entry.specialty,
  };
}

export async function fetchProcedureCatalog(
  token: string,
  activeActor: string,
  query?: string,
): Promise<ProcedureCatalogResponse> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/procedures', {
      params: {
        query: query?.trim() ? { q: query.trim() } : undefined,
      },
    }),
  );
  const labels = body.procedure_type_labels ?? {};
  return {
    items: (body.items ?? []).map(mapProcedureCatalogEntry),
    procedureTypeLabels: {
      ...DEFAULT_PROCEDURE_TYPE_LABELS,
      ...labels,
    },
  };
}
