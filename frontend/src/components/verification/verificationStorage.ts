export interface ManualChecklist {
  mapPlausible: boolean;
  pickupDropoffCorrect: boolean;
  restStopsSensible: boolean;
  eldMatchesSidebar: boolean;
}

export const DEFAULT_CHECKLIST: ManualChecklist = {
  mapPlausible: false,
  pickupDropoffCorrect: false,
  restStopsSensible: false,
  eldMatchesSidebar: false,
};

export function checklistStorageKey(slug: string): string {
  return `hos-verify-checklist-${slug}`;
}

export function loadChecklist(slug: string): ManualChecklist {
  try {
    const raw = localStorage.getItem(checklistStorageKey(slug));
    if (!raw) return { ...DEFAULT_CHECKLIST };
    return { ...DEFAULT_CHECKLIST, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CHECKLIST };
  }
}

export function saveChecklist(slug: string, checklist: ManualChecklist): void {
  localStorage.setItem(checklistStorageKey(slug), JSON.stringify(checklist));
}
