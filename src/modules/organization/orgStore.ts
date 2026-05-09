import {create} from 'zustand';

import {syncOrganizationPolicies} from './policySync';

export interface OrgSummary {
  readonly id: string;
  readonly name: string;
}

interface OrgState {
  readonly organizations: readonly OrgSummary[];
  readonly activeOrgId: string | null;
  /** Capability strings from JWT/API — default demo allows core GCS actions. */
  readonly capabilities: readonly string[];
  setOrganizations: (orgs: readonly OrgSummary[]) => void;
  setActiveOrg: (id: string | null) => void;
}

const DEFAULT_ORGS: readonly OrgSummary[] = [
  {id: 'local', name: 'Local operator (offline-capable)'},
];

export const useOrgStore = create<OrgState>(set => ({
  organizations: DEFAULT_ORGS,
  activeOrgId: 'local',
  capabilities: ['mission.plan', 'telemetry.view', 'map.offline', 'diagnostics.view'],
  setOrganizations: orgs => set({organizations: orgs}),
  setActiveOrg: id => {
    set({activeOrgId: id});
    if (id) {
      syncOrganizationPolicies(id).catch(() => {});
    }
  },
}));

export function orgHasCapability(cap: string): boolean {
  const caps = useOrgStore.getState().capabilities;
  return caps.includes('*') || caps.includes(cap);
}
