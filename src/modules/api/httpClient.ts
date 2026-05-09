import {ApiHttpError, type ApiErrorBody} from './types';
import {API_BASE_URL} from '../../core/constants/backend';
import {useSessionStore} from '../session/sessionStore';


function joinUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return p;
  }
  return `${base}${p}`;
}

/**
 * Authenticated fetch using in-memory access token from the session store.
 * Configure `API_BASE_URL` before calling relative paths.
 */
export async function fetchWithAuth(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = useSessionStore.getState().accessToken;
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const url = joinUrl(path);
  return fetch(url, {...init, headers});
}

export async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = text ? (JSON.parse(text) as ApiErrorBody) : undefined;
    } catch {
      body = undefined;
    }
    throw new ApiHttpError(
      res.status,
      body?.message ?? `HTTP ${res.status}`,
      body,
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}
