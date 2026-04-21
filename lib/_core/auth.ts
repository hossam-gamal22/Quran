import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";

// iOS Simulator / unsigned builds lack keychain-access-groups entitlement.
// Detect these errors so we can silence them instead of logging as ERROR.
const isEntitlementError = (err: unknown): boolean => {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /entitlement isn'?t present|Keychain access failed|getValueWithKeyAsync|getRegistrationInfoAsync/i.test(msg);
};

const logAuthError = (label: string, err: unknown) => {
  if (isEntitlementError(err)) {
    // Expected on simulator / unsigned builds — noop.
    return;
  }
  console.warn(label, err);
};

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    // Web platform uses cookie-based auth, no manual token management needed
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token retrieval");
      return null;
    }

    // Use SecureStore for native
    console.log("[Auth] Getting session token...");
    const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    console.log(
      "[Auth] Session token retrieved from SecureStore:",
      token ? `present (${token.substring(0, 20)}...)` : "missing",
    );
    return token;
  } catch (error) {
    logAuthError("[Auth] Failed to get session token:", error);
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    // Web platform uses cookie-based auth, no manual token management needed
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token storage");
      return;
    }

    // Use SecureStore for native
    console.log("[Auth] Setting session token...", token.substring(0, 20) + "...");
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    console.log("[Auth] Session token stored in SecureStore successfully");
  } catch (error) {
    logAuthError("[Auth] Failed to set session token:", error);
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    // Web platform uses cookie-based auth, logout is handled by server clearing cookie
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token removal");
      return;
    }

    // Use SecureStore for native
    console.log("[Auth] Removing session token...");
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    console.log("[Auth] Session token removed from SecureStore successfully");
  } catch (error) {
    logAuthError("[Auth] Failed to remove session token:", error);
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    console.log("[Auth] Getting user info...");

    let info: string | null = null;
    if (Platform.OS === "web") {
      // Use localStorage for web
      info = window.localStorage.getItem(USER_INFO_KEY);
    } else {
      // Use SecureStore for native
      info = await SecureStore.getItemAsync(USER_INFO_KEY);
    }

    if (!info) {
      console.log("[Auth] No user info found");
      return null;
    }
    const user = JSON.parse(info);
    console.log("[Auth] User info retrieved:", user);
    return user;
  } catch (error) {
    logAuthError("[Auth] Failed to get user info:", error);
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    console.log("[Auth] Setting user info...", user);

    if (Platform.OS === "web") {
      // Use localStorage for web
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      console.log("[Auth] User info stored in localStorage successfully");
      return;
    }

    // Use SecureStore for native
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    console.log("[Auth] User info stored in SecureStore successfully");
  } catch (error) {
    logAuthError("[Auth] Failed to set user info:", error);
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      // Use localStorage for web
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }

    // Use SecureStore for native
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    logAuthError("[Auth] Failed to clear user info:", error);
  }
}
