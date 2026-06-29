import { procedureById, type ProcedureCatalogEntry } from '@/shared/procedures/procedureCatalog';

export interface ProcedureEpisodeFormValues {
  selectedProcedureId: string | null;
  procedureDate: string;
  careWindowDays: string;
}

export function defaultProcedureDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseProcedureEpisodeForm(
  catalogEntries: ProcedureCatalogEntry[],
  values: ProcedureEpisodeFormValues,
):
  | { error: string }
  | { procedureEntry: ProcedureCatalogEntry; careDays: number; procedureDate: string } {
  const procedureEntry = values.selectedProcedureId
    ? procedureById(catalogEntries, values.selectedProcedureId)
    : undefined;
  if (!procedureEntry) {
    return { error: 'Select a procedure from the catalog.' };
  }

  const careDays = Number.parseInt(values.careWindowDays, 10);
  if (!Number.isFinite(careDays) || careDays <= 0) {
    return { error: 'Care window must be a positive number of days.' };
  }

  const procedureDate = values.procedureDate.trim();
  if (!procedureDate) {
    return { error: 'Procedure date is required.' };
  }

  return { procedureEntry, careDays, procedureDate };
}
