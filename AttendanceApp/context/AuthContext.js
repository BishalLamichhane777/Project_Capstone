/**
 * AuthContext.js
 *
 * Global authentication state + FCM device token registration.
 *
 * On login:
 *   1. Sets token + user in context (synchronous — navigation happens immediately).
 *   2. In the background:
 *      a. Requests notification permission from the OS.
 *      b. Calls getDevicePushTokenAsync() to get the NATIVE FCM token
 *         (NOT getExpoPushTokenAsync — we use firebase_admin.messaging, not Expo Push).
 *      c. POSTs { device_token, platform } to /api/auth/device-token so the
 *         backend can send FCM pushes to this device.
 *
 * Token registration is fire-and-forget:
 *   - Only runs on real physical devices (Device.isDevice).
 *   - Errors are logged, never shown to the user, never block login.
 *   - iOS: no APNs — skips push registration silently, in-app notifications still work.
 */

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { API } from '../api';

// ─── Foreground notification display ────────────────────────────────────────
// Show banner + play sound even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ─── Permission + native FCM token ───────────────────────────────────────────

async function _requestPermissionAndGetToken() {
  // Push only works on real devices
  if (!Device.isDevice) {
    console.log('[FCM] Skipping token registration — not a physical device.');
    return null;
  }

  // iOS: skip push registration (no Apple Developer account / APNs)
  // In-app notifications still work for iOS via the SQLite row.
  if (Platform.OS === 'ios') {
    console.log('[FCM] iOS detected — skipping push token (no APNs configured).');
    return null;
  }

  // Request Android notification permission (required on Android 13+)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[FCM] Notification permission denied — push will not be delivered.');
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

  // Get native FCM token — this is what firebase_admin.messaging.send() uses
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    console.log('[FCM] Native device push token obtained:', tokenData.data?.slice(0, 20), '...');
    return tokenData.data;   // raw FCM registration token string
  } catch (err) {
    console.error('[FCM] getDevicePushTokenAsync failed:', err.message);
    return null;
  }
}

// ─── Save token to backend ───────────────────────────────────────────────────

async function _saveTokenToBackend(fcmToken, authToken) {
  if (!fcmToken || !authToken) return;
  try {
    const res = await fetch(API.deviceToken, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_token: fcmToken,
        platform:     Platform.OS,   // 'android' | 'ios'
      }),
    });
    if (res.ok) {
      console.log('[FCM] Device token saved to backend (platform=' + Platform.OS + ').');
    } else {
      const body = await res.json().catch(() => ({}));
      console.warn('[FCM] Backend rejected device token:', res.status, body);
    }
  } catch (err) {
    console.error('[FCM] Failed to save device token to backend:', err.message);
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
   * Registers FCM token in the background (fire-and-forget).
   */
  const loginState = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);

    // Background: request permission, get native FCM token, save to backend
    _requestPermissionAndGetToken()
      .then(fcmToken => _saveTokenToBackend(fcmToken, newToken))
      .catch(err => console.error('[FCM] Background token registration error:', err));
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
        console.log('[FCM] Notification received (foreground):', title, body);
        // Banner is already shown by setNotificationHandler above.
        // Add any in-app badge update here if needed.
      }
    );

    // Fired when user taps the notification
    notifResponseRef.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const { title } = response.notification.request.content;
        console.log('[FCM] User tapped notification:', title);
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
