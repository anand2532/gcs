import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.gcs.auth.refresh';

/**
 * Refresh tokens — stored in Keychain / Keystore only (never MMKV).
 */
export async function saveRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('refresh', token, {service: SERVICE});
}

export async function loadRefreshToken(): Promise<string | undefined> {
  const entry = await Keychain.getGenericPassword({service: SERVICE});
  if (!entry) {
    return undefined;
  }
  return entry.password;
}

export async function clearRefreshToken(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
}
