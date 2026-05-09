import {API_BASE_URL} from '../../core/constants/backend';
import {log} from '../../core/logger/Logger';
import {fetchWithAuth} from '../api/httpClient';

/**
 * Pull organization policy payloads from the API. When your schema stabilizes,
 * map DTOs into `geofenceEngine.setZones()` and airspace store updates here.
 */
export async function syncOrganizationPolicies(orgId: string): Promise<void> {
  if (!API_BASE_URL) {
    log.app.debug('organization.policy.sync skipped — API_BASE_URL unset');
    return;
  }
  try {
    const res = await fetchWithAuth(`/v1/organizations/${orgId}/policies`);
    if (!res.ok) {
      log.app.warn('organization.policy.sync http', {status: res.status});
      return;
    }
    const data = (await res.json()) as {readonly zones?: unknown};
    if (Array.isArray(data.zones) && data.zones.length > 0) {
      log.app.info('organization.policy.sync received', {
        orgId,
        zoneCount: data.zones.length,
      });
    }
  } catch (err) {
    log.app.warn('organization.policy.sync failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
