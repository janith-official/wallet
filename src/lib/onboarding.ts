import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { User } from '@supabase/supabase-js';

// Window within which a signup is considered "new" — show onboarding
const NEW_USER_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const key = (userId: string) => `onboarding_seen_${userId}`;

/**
 * Returns true if the user should NOT see onboarding (either already seen it,
 * or is an existing user who logged in — not a fresh signup).
 */
export async function getOnboardingSeen(user: User): Promise<boolean> {
  // Already explicitly marked as done — always skip
  const stored =
    Platform.OS === 'web'
      ? localStorage.getItem(key(user.id))
      : await SecureStore.getItemAsync(key(user.id));

  if (stored === 'true') return true;

  // Only show onboarding for accounts created very recently (fresh signup)
  const createdAt = new Date(user.created_at).getTime();
  const isNewUser = Date.now() - createdAt < NEW_USER_WINDOW_MS;

  // New user who hasn't completed onboarding → return false (should see it)
  // Existing user logging in → return true (skip it)
  return !isNewUser;
}

export async function setOnboardingSeen(userId: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key(userId), 'true');
    return;
  }
  await SecureStore.setItemAsync(key(userId), 'true');
}
