import { CAPABILITIES_API } from '@/lib/apiBases';
import type { EntitlementsMap } from '@/lib/appTypes';

export async function fetchRoleEntitlements(
  token: string,
  role: string,
): Promise<EntitlementsMap | null> {
  const res = await fetch(`${CAPABILITIES_API}/api/v1/capabilities/ui`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': role,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`capabilities/ui failed for role ${role}: HTTP ${res.status}`, detail);
    return null;
  }
  return res.json();
}

export function prefetchEntitlementsInBackground(
  token: string,
  roles: string[],
  onRoleReady: (role: string, data: EntitlementsMap) => void,
): void {
  for (const role of roles) {
    void fetchRoleEntitlements(token, role).then((data) => {
      if (data !== null) {
        onRoleReady(role, data);
      }
    });
  }
}
