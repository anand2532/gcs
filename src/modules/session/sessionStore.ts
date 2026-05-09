import {create} from 'zustand';

import * as secureCredentials from './secureCredentials';
import {log} from '../../core/logger/Logger';
import {storage} from '../persistence/storage';

import type {SessionMode} from './types';

const META_KEY = 'gcs.session.meta.v1';

interface SessionMeta {
  readonly v: 1;
  readonly mode: SessionMode;
  readonly userId?: string;
}

interface SessionState {
  readonly hydrated: boolean;
  readonly mode: SessionMode;
  readonly accessToken: string | null;
  readonly userId: string | null;
  hydrate: () => Promise<void>;
  enterLocalDemo: () => Promise<void>;
  setAuthenticatedSession: (
    accessToken: string,
    opts?: {readonly refreshToken?: string; readonly userId?: string},
  ) => Promise<void>;
  clearAccessToken: () => void;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  hydrated: false,
  mode: 'local_demo',
  accessToken: null,
  userId: null,

  hydrate: async () => {
    try {
      const refresh = await secureCredentials.loadRefreshToken();
      const raw = storage.getRaw(META_KEY);
      let meta: SessionMeta | undefined;
      if (raw) {
        try {
          meta = JSON.parse(raw) as SessionMeta;
        } catch {
          meta = undefined;
        }
      }
      const mode: SessionMode =
        refresh || meta?.mode === 'authenticated'
          ? 'authenticated'
          : 'local_demo';
      set({
        hydrated: true,
        mode,
        userId: meta?.userId ?? null,
        accessToken: null,
      });
    } catch (err) {
      log.store.warn('session.hydrate failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      set({
        hydrated: true,
        mode: 'local_demo',
        accessToken: null,
        userId: null,
      });
    }
  },

  enterLocalDemo: async () => {
    await secureCredentials.clearRefreshToken();
    storage.remove(META_KEY);
    set({mode: 'local_demo', accessToken: null, userId: null});
  },

  setAuthenticatedSession: async (accessToken, opts) => {
    if (opts?.refreshToken) {
      await secureCredentials.saveRefreshToken(opts.refreshToken);
    }
    const meta: SessionMeta = {
      v: 1,
      mode: 'authenticated',
      userId: opts?.userId,
    };
    storage.setRaw(META_KEY, JSON.stringify(meta));
    set({
      mode: 'authenticated',
      accessToken,
      userId: opts?.userId ?? null,
    });
  },

  clearAccessToken: () => {
    set({accessToken: null});
  },

  signOut: async () => {
    await get().enterLocalDemo();
  },
}));
