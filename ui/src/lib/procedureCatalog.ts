export type ProcedureType = 'general-surgery' | 'orthopedic' | 'cardiac' | 'other';

export interface ProcedureCatalogEntry {
  id: string;
  name: string;
  procedureType: ProcedureType;
  emrRef: string;
  specialty: string;
}

export const PROCEDURE_TYPE_LABELS: Record<ProcedureType, string> = {
  'general-surgery': 'General surgery',
  orthopedic: 'Orthopedic',
  cardiac: 'Cardiac',
  other: 'Other',
};

/** Post-discharge procedures commonly enrolled for remote monitoring. */
export const PROCEDURE_CATALOG: ProcedureCatalogEntry[] = [
  {
    id: 'lap-chole',
    name: 'Laparoscopic cholecystectomy',
    procedureType: 'general-surgery',
    emrRef: 'PROC-GS-47562',
    specialty: 'General surgery',
  },
  {
    id: 'lap-appendectomy',
    name: 'Laparoscopic appendectomy',
    procedureType: 'general-surgery',
    emrRef: 'PROC-GS-44970',
    specialty: 'General surgery',
  },
  {
    id: 'inguinal-hernia-lap',
    name: 'Inguinal hernia repair, laparoscopic',
    procedureType: 'general-surgery',
    emrRef: 'PROC-GS-49650',
    specialty: 'General surgery',
  },
  {
    id: 'umbilical-hernia',
    name: 'Umbilical hernia repair',
    procedureType: 'general-surgery',
    emrRef: 'PROC-GS-49585',
    specialty: 'General surgery',
  },
  {
    id: 'colectomy-partial',
    name: 'Partial colectomy, laparoscopic',
    procedureType: 'general-surgery',
    emrRef: 'PROC-GS-44205',
    specialty: 'General surgery',
  },
  {
    id: 'nissen-fundoplication',
    name: 'Laparoscopic Nissen fundoplication',
    procedureType: 'general-surgery',
    emrRef: 'PROC-GS-43280',
    specialty: 'General surgery',
  },
  {
    id: 'tkr',
    name: 'Total knee arthroplasty',
    procedureType: 'orthopedic',
    emrRef: 'PROC-OR-27447',
    specialty: 'Orthopedics',
  },
  {
    id: 'thr',
    name: 'Total hip arthroplasty',
    procedureType: 'orthopedic',
    emrRef: 'PROC-OR-27130',
    specialty: 'Orthopedics',
  },
  {
    id: 'acl-reconstruction',
    name: 'ACL reconstruction, arthroscopic',
    procedureType: 'orthopedic',
    emrRef: 'PROC-OR-29888',
    specialty: 'Orthopedics',
  },
  {
    id: 'rotator-cuff',
    name: 'Rotator cuff repair, arthroscopic',
    procedureType: 'orthopedic',
    emrRef: 'PROC-OR-29827',
    specialty: 'Orthopedics',
  },
  {
    id: 'lumbar-microdiscectomy',
    name: 'Lumbar microdiscectomy',
    procedureType: 'orthopedic',
    emrRef: 'PROC-OR-63030',
    specialty: 'Orthopedics',
  },
  {
    id: 'orif-ankle',
    name: 'Open reduction internal fixation, ankle fracture',
    procedureType: 'orthopedic',
    emrRef: 'PROC-OR-27814',
    specialty: 'Orthopedics',
  },
  {
    id: 'cabg',
    name: 'Coronary artery bypass graft (CABG)',
    procedureType: 'cardiac',
    emrRef: 'PROC-CV-33533',
    specialty: 'Cardiac',
  },
  {
    id: 'pci-stent',
    name: 'Percutaneous coronary intervention with stent',
    procedureType: 'cardiac',
    emrRef: 'PROC-CV-92928',
    specialty: 'Cardiac',
  },
  {
    id: 'tavr',
    name: 'Transcatheter aortic valve replacement (TAVR)',
    procedureType: 'cardiac',
    emrRef: 'PROC-CV-33361',
    specialty: 'Cardiac',
  },
  {
    id: 'pacemaker',
    name: 'Dual-chamber pacemaker implant',
    procedureType: 'cardiac',
    emrRef: 'PROC-CV-33208',
    specialty: 'Cardiac',
  },
  {
    id: 'c-section',
    name: 'Cesarean delivery',
    procedureType: 'other',
    emrRef: 'PROC-OB-59514',
    specialty: 'Obstetrics',
  },
  {
    id: 'lap-hysterectomy',
    name: 'Laparoscopic hysterectomy',
    procedureType: 'other',
    emrRef: 'PROC-GY-58571',
    specialty: 'Gynecology',
  },
  {
    id: 'turp',
    name: 'Transurethral resection of prostate (TURP)',
    procedureType: 'other',
    emrRef: 'PROC-UR-52601',
    specialty: 'Urology',
  },
  {
    id: 'thyroidectomy',
    name: 'Total thyroidectomy',
    procedureType: 'other',
    emrRef: 'PROC-EN-60240',
    specialty: 'Endocrine surgery',
  },
];

const catalogById = new Map(PROCEDURE_CATALOG.map((entry) => [entry.id, entry]));

export function procedureById(id: string): ProcedureCatalogEntry | undefined {
  return catalogById.get(id);
}

/** Resolve a stored surgery label to a catalog entry when opening the edit form. */
export function procedureIdForSurgeryName(surgery: string): string | null {
  const normalized = surgery.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = PROCEDURE_CATALOG.find((entry) => entry.name.toLowerCase() === normalized);
  if (exact) {
    return exact.id;
  }

  const searchMatches = searchProcedureCatalog(surgery);
  if (searchMatches.length === 1) {
    return searchMatches[0].id;
  }

  const substringMatches = PROCEDURE_CATALOG.filter((entry) => {
    const name = entry.name.toLowerCase();
    return normalized.includes(name) || name.includes(normalized);
  });
  if (substringMatches.length === 1) {
    return substringMatches[0].id;
  }

  return null;
}

export function searchProcedureCatalog(query: string): ProcedureCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return PROCEDURE_CATALOG;
  }
  return PROCEDURE_CATALOG.filter((entry) => {
    const haystack = [
      entry.name,
      entry.specialty,
      entry.emrRef,
      PROCEDURE_TYPE_LABELS[entry.procedureType],
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
