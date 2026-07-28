/**
 * AuthContext.js
 *
 * Global authentication state + Expo push token registration.
 *
 * On login:
 *   1. Sets token + user in context (synchronous — navigation happens immediately).
 *   2. In the background:
 *      a. Requests notification permission from the OS.
 *      b. Calls getExpoPushTokenAsync() to get an Expo push token
 *         (format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]).
 *      c. POSTs { device_token, platform } to /api/auth/device-token so the
 *         backend can send Expo push notifications to this device.
 *
 * Token registration is fire-and-forget:
 *   - Only runs on real physical devices (Device.isDevice).
 *   - Errors are logged, never shown to the user, never block login.
 *   - iOS: Expo push works on iOS too (Expo manages APNs), so we register
 *     on both platforms.
 */

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { API } from '../api';

// Expo project ID from app.json extra.eas.projectId
const EXPO_PROJECT_ID = '5defca78-788a-4f38-bdca-615425b8ec08';

// ─── Foreground notification display ────────────────────────────────────────
// Show banner + play sound even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ─── Permission + Expo push token ────────────────────────────────────────────

async function _requestPermissionAndGetToken() {
  // Push only works on real devices
  if (!Device.isDevice) {
    console.log('[Push] Skipping token registration — not a physical device.');
    return null;
  }

  // Request notification permission (required on Android 13+, and iOS)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[Push] Notification permission denied — push will not be delivered.');
    return null;
  }

  // Create notification channel (Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'Attendance Alerts',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#2563EB',
      sound:            'default',
    });
  }

  // Get Expo push token — used by the backend to send via Expo Push API
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    console.log('[Push] Expo push token obtained:', tokenData.data?.slice(0, 30), '...');
    return tokenData.data;   // ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
  } catch (err) {
    console.error('[Push] getExpoPushTokenAsync failed:', err.message);
    return null;
  }
}

// ─── Save token to backend ───────────────────────────────────────────────────

async function _saveTokenToBackend(expoToken, authToken) {
  if (!expoToken || !authToken) return;
  try {
    const res = await fetch(API.deviceToken, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_token: expoToken,          // ExponentPushToken[...]
        platform:     Platform.OS,        // 'android' | 'ios'
      }),
    });
    if (res.ok) {
      console.log('[Push] Expo push token saved to backend (platform=' + Platform.OS + ').');
    } else {
      const body = await res.json().catch(() => ({}));
      console.warn('[Push] Backend rejected push token:', res.status, body);
    }
  } catch (err) {
    console.error('[Push] Failed to save push token to backend:', err.message);
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token,      setToken]      = useState(null);
  const [user,       setUser]       = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Notification event listener refs for cleanup
  const notifReceivedRef = useRef(null);
  const notifResponseRef = useRef(null);

  /**
   * loginState — called by LoginScreen immediately after a successful
   * POST /api/auth/login response.
   *
   * Sets token + user synchronously (navigation is not delayed).
   * Registers Expo push token in the background (fire-and-forget).
   */
  const loginState = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);

    // Background: request permission, get Expo push token, save to backend
    _requestPermissionAndGetToken()
      .then(expoToken => _saveTokenToBackend(expoToken, newToken))
      .catch(err => console.error('[Push] Background token registration error:', err));
  };

  const logoutState = () => {
    setToken(null);
    setUser(null);
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // ── Notification event listeners ─────────────────────────────────────────
  useEffect(() => {
    // Fired when a notification arrives while app is foregrounded
    notifReceivedRef.current = Notifications.addNotificationReceivedListener(
      notification => {
        const { title, body } = notification.request.content;
        console.log('[Push] Notification received (foreground):', title, body);
        // Banner is already shown by setNotificationHandler above.
        // Add any in-app badge update here if needed.
      }
    );

    // Fired when user taps the notification
    notifResponseRef.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const { title } = response.notification.request.content;
        console.log('[Push] User tapped notification:', title);
        // Navigate to NotificationsScreen here if needed:
        // navigationRef.current?.navigate('Notifications');
      }
    );

    return () => {
      if (notifReceivedRef.current) {
        Notifications.removeNotificationSubscription(notifReceivedRef.current);
      }
      if (notifResponseRef.current) {
        Notifications.removeNotificationSubscription(notifResponseRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, loginState, logoutState, isDarkMode, toggleDarkMode }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
