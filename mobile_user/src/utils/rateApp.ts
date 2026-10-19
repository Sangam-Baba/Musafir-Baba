import { Linking, Platform } from 'react-native';

// "Rate us on Play Store": opens this app's Play Store page (where users rate
// and review). The Play Store app is tried first; the website is the fallback.
export const PLAY_STORE_PACKAGE = 'com.musafirbaba.mbgo';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

// Only shown where it makes sense (no App Store listing yet).
export const canRateOnPlayStore = Platform.OS === 'android' || Platform.OS === 'web';

export async function openPlayStoreForRating(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(`market://details?id=${PLAY_STORE_PACKAGE}`);
      return;
    } catch {
      // No Play Store app (e.g. some emulators): use the website.
    }
  }
  await Linking.openURL(PLAY_STORE_URL);
}
