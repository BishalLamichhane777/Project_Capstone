import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  Alert, Switch, Modal, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../api';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import {
  User, Bell, Lock, Phone, Check, ChevronDown, ChevronUp,
  ChevronRight, LogOut, Moon, Sun, X, Eye, EyeOff,
} from 'lucide-react-native';

const BLUE   = '#2952e3';
const GREEN  = '#27ae60';
const AMBER  = '#f39c12';
const RED    = '#e74c3c';

// ─── Risk thresholds (match batch.py AT_RISK_THRESHOLD) ───────────────────────
// Low  ≥ 80 %   Mid 60–79 %   High < 60 %
function riskLevel(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct >= 80) return 'Low';
  if (pct >= 60) return 'Mid';
  return 'High';
}
const RISK_CONFIG = {
  Low:  { label: 'Low Risk',  color: GREEN, border: GREEN, bg: '#edfaf3', dotBg: '#1a2e1e', cardBg: '#edfaf3' },
  Mid:  { label: 'Mid Risk',  color: AMBER, border: AMBER, bg: '#fff8e6', dotBg: '#2e2a1a', cardBg: '#fff8e6' },
  High: { label: 'High Risk', color: RED,   border: RED,   bg: '#fff0f0', dotBg: '#2e1a1a', cardBg: '#fff0f0' },
};

// ─── Month chart helpers ──────────────────────────────────────────────────────

const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                           'Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Given raw history records and a period label, return an array of
 * { month: 'Jan', pct: 82 | null } objects for the bar chart.
 *
 * Periods:
 *   'Last 3 Months'  → last 3 complete calendar months
 *   'Last 5 Months'  → last 5 complete calendar months
 *   'This Year'      → every month from Jan through current month
 */
function buildMonthlyBars(records, period) {
  const now      = new Date();
  const thisYear = now.getFullYear();
  const thisMon  = now.getMonth(); // 0-based

  // Determine which months to include
  let monthSlots = []; // [{ year, month }] ordered oldest first
  if (period === 'This Year') {
    for (let m = 0; m <= thisMon; m++) {
      monthSlots.push({ year: thisYear, month: m });
    }
  } else {
    const count = period === 'Last 3 Months' ? 3 : 5;
    for (let i = count - 1; i >= 0; i--) {
      let m = thisMon - i;
      let y = thisYear;
      while (m < 0) { m += 12; y--; }
      monthSlots.push({ year: y, month: m });
    }
  }

  // Group records by YYYY-MM
  const byMonth = {};
  for (const r of records) {
    if (!r.date) continue;
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!byMonth[key]) byMonth[key] = { present: 0, total: 0 };
    byMonth[key].total++;
    if (r.status === 'Present') byMonth[key].present++;
  }

  return monthSlots.map(({ year, month }) => {
    const key = `${year}-${month}`;
    const d   = byMonth[key];
    return {
      month: MONTH_NAMES_SHORT[month].toUpperCase(),
      pct:   d ? Math.round((d.present / d.total) * 100) : null,
    };
  });
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ bars, isDarkMode }) {
  if (!bars || bars.length === 0) {
    return (
      <View style={[styles.chartWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: isDarkMode ? '#8a94b8' : '#8a94a6', fontSize: 13 }}>
          No data for this period
        </Text>
      </View>
    );
  }

  const validPcts = bars.map(b => b.pct).filter(p => p !== null);
  const max = validPcts.length > 0 ? Math.max(...validPcts) : 100;
  const barBg = isDarkMode ? '#252b3e' : '#eef1f5';

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.barsRow}>
        {bars.map((bar, i) => {
          const isCurrentMonth = i === bars.length - 1;
          const fillPct = bar.pct !== null ? (max > 0 ? (bar.pct / max) * 100 : 0) : 0;
          return (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barValue, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                {bar.pct !== null ? `${bar.pct}%` : '—'}
              </Text>
              <View style={[styles.barBg, { backgroundColor: barBg }]}>
                {bar.pct !== null && (
                  <View style={[
                    styles.barFill,
                    { height: `${fillPct}%`, backgroundColor: isCurrentMonth ? BLUE : '#c7d0f8' }
                  ]} />
                )}
              </View>
              <Text style={[styles.barMonth, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                {bar.month}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose, currentData, token, isDarkMode, onSaved }) {
  const [fullname, setFullname] = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (visible) { setFullname(currentData?.fullname || ''); setPhone(currentData?.phone || ''); }
  }, [visible, currentData]);

  const bg = isDarkMode ? '#1a1f2e' : '#fff';
  const overlay = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri = isDarkMode ? '#fff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  const handleSave = async () => {
    if (!fullname.trim()) { Alert.alert('Validation', 'Full name cannot be empty.'); return; }
    setSaving(true);
    try {
      const res = await fetch(API.updateMe, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullname: fullname.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      Alert.alert('Success', 'Profile updated successfully!');
      onSaved({ fullname: fullname.trim(), phone: phone.trim() || null });
      onClose();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: overlay }} activeOpacity={1} onPress={onClose} />
        <View style={[mStyles.sheet, { backgroundColor: bg }]}>
          <View style={mStyles.sheetHeader}>
            <Text style={[mStyles.sheetTitle, { color: textPri }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}><X size={20} color={textSub} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>EMAIL (cannot be changed)</Text>
            <View style={[mStyles.fieldInput, { backgroundColor: isDarkMode ? '#1a1f2e' : '#f0f2f8', borderColor: inputBdr, opacity: 0.6 }]}>
              <Text style={[mStyles.fieldInputText, { color: textSub }]}>{currentData?.email || '—'}</Text>
            </View>
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>FULL NAME</Text>
            <TextInput style={[mStyles.fieldInput, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]} value={fullname} onChangeText={setFullname} placeholder="Enter your full name" placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'} returnKeyType="next" />
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>PHONE (optional)</Text>
            <TextInput style={[mStyles.fieldInput, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]} value={phone} onChangeText={setPhone} placeholder="e.g. +977 98XXXXXXXX" placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'} keyboardType="phone-pad" returnKeyType="done" />
            <TouchableOpacity style={[mStyles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Password field ───────────────────────────────────────────────────────────
function PasswordField({ label, value, onChangeText, show, toggleShow, errorMsg, textPri, textSub, inputBg, inputBdr }) {
  return (
    <>
      <Text style={[mStyles.fieldLabel, { color: textSub }]}>{label}</Text>
      <View style={[mStyles.passwordRow, { backgroundColor: inputBg, borderColor: errorMsg ? RED : inputBdr }]}>
        <TextInput style={[mStyles.passwordInput, { color: textPri }]} value={value} onChangeText={onChangeText} secureTextEntry={!show} placeholder="••••••••" placeholderTextColor="#aab0be" autoCorrect={false} autoCapitalize="none" returnKeyType="next" />
        <TouchableOpacity onPress={toggleShow} style={mStyles.eyeBtn}>
          {show ? <EyeOff size={18} color={textSub} /> : <Eye size={18} color={textSub} />}
        </TouchableOpacity>
      </View>
      {!!errorMsg && <Text style={mStyles.inlineError}>{errorMsg}</Text>}
    </>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose, token, isDarkMode }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [newErr,    setNewErr]    = useState('');
  const [confErr,   setConfErr]   = useState('');

  useEffect(() => {
    if (visible) { setCurrentPw(''); setNewPw(''); setConfirmPw(''); setNewErr(''); setConfErr(''); }
  }, [visible]);

  const bg = isDarkMode ? '#1a1f2e' : '#fff';
  const overlay = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri = isDarkMode ? '#fff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  const handleNewPwChange = (v) => {
    setNewPw(v);
    setNewErr(v.length > 0 && v.length < 6 ? 'Password must be at least 6 characters.' : '');
    if (confirmPw.length > 0) setConfErr(v !== confirmPw ? 'Passwords do not match.' : '');
  };
  const handleConfirmPwChange = (v) => {
    setConfirmPw(v);
    setConfErr(v.length > 0 && v !== newPw ? 'Passwords do not match.' : '');
  };

  const handleSave = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Validation', 'Please fill in all fields.'); return; }
    if (newPw.length < 6) { setNewErr('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setConfErr('Passwords do not match.'); return; }
    if (newPw === currentPw) { Alert.alert('Validation', 'New password must differ from the current one.'); return; }
    setSaving(true);
    try {
      const meRes = await fetch(API.currentUser, { headers: { Authorization: `Bearer ${token}` } });
      if (!meRes.ok) throw new Error('Could not verify current user.');
      const me = await meRes.json();
      const loginRes = await fetch(API.login, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: me.email, password: currentPw }) });
      if (!loginRes.ok) { Alert.alert('Error', 'Current password is incorrect.'); return; }
      const patchRes = await fetch(API.updateMe, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ password: newPw }) });
      if (!patchRes.ok) { const err = await patchRes.json(); throw new Error(err.error || 'Failed to update password'); }
      Alert.alert('Success', 'Password updated successfully!');
      onClose();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: overlay }} activeOpacity={1} onPress={onClose} />
        <View style={[mStyles.sheet, { backgroundColor: bg }]}>
          <View style={mStyles.sheetHeader}>
            <Text style={[mStyles.sheetTitle, { color: textPri }]}>Change Password</Text>
            <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}><X size={20} color={textSub} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
            <PasswordField label="CURRENT PASSWORD" value={currentPw} onChangeText={setCurrentPw} show={showCur} toggleShow={() => setShowCur(v => !v)} errorMsg="" textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr} />
            <PasswordField label="NEW PASSWORD" value={newPw} onChangeText={handleNewPwChange} show={showNew} toggleShow={() => setShowNew(v => !v)} errorMsg={newErr} textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr} />
            <PasswordField label="RETYPE NEW PASSWORD" value={confirmPw} onChangeText={handleConfirmPwChange} show={showConf} toggleShow={() => setShowConf(v => !v)} errorMsg={confErr} textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr} />
            <Text style={[mStyles.passwordHint, { color: textSub }]}>Minimum 6 characters</Text>
            <TouchableOpacity style={[mStyles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { token, user, logoutState, isDarkMode, toggleDarkMode } = useAuth();

  // ── Profile + class count ─────────────────────────────────────────────────
  const [fullProfile,   setFullProfile]   = useState(null);
  const [enrolledCount, setEnrolledCount] = useState(0);

  // ── Analytics & history (fixes #1–4) ─────────────────────────────────────
  const [percentage,   setPercentage]   = useState(null);  // real attendance %
  const [historyData,  setHistoryData]  = useState([]);    // raw records for chart

  // ── Chart period picker (fix #4) ─────────────────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState('Last 5 Months');
  const periods = ['Last 3 Months', 'Last 5 Months', 'This Year'];
  const [periodOpen, setPeriodOpen] = useState(false);

  // ── Analytics loading ─────────────────────────────────────────────────────
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // ── Notification permission state (fix #6) ───────────────────────────────
  const [notifGranted, setNotifGranted] = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editProfileVisible,    setEditProfileVisible]    = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  // ── Fetch everything on focus ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const isStudent = user?.role === 'student';

      // Profile — all roles
      fetch(API.currentUser, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setFullProfile(d); })
        .catch(() => {});

      // Enrolled class count — students only
      if (isStudent) {
        fetch(API.studentClasses, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (Array.isArray(d)) setEnrolledCount(d.length); })
          .catch(() => {});
      }

      // Analytics + history + unread count — students only
      // Non-student roles (teacher/admin) do not have attendance records
      // and calling these endpoints would return 403.
      if (isStudent) {
        setAnalyticsLoading(true);
        Promise.allSettled([
          fetch(API.attendanceAnalytics,      { headers }),
          fetch(API.attendanceHistory,         { headers }),
          fetch(API.notificationUnreadCount,   { headers }),
        ]).then(async ([analyticsRes, historyRes, notifsRes]) => {
          if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
            const d = await analyticsRes.value.json();
            setPercentage(d.percentage ?? null);
          }
          if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
            const d = await historyRes.value.json();
            if (Array.isArray(d)) setHistoryData(d);
          }
          if (notifsRes.status === 'fulfilled' && notifsRes.value.ok) {
            const d = await notifsRes.value.json();
            setUnreadCount(d?.unread_count ?? 0);
          }
        }).finally(() => setAnalyticsLoading(false));
      } else {
        // For non-student roles only fetch the unread count (works for any role)
        setAnalyticsLoading(false);
        fetch(API.notificationUnreadCount, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setUnreadCount(d?.unread_count ?? 0); })
          .catch(() => {});
      }

      // Notification OS permission — all roles
      Notifications.getPermissionsAsync()
        .then(({ status }) => setNotifGranted(status === 'granted'))
        .catch(() => {});
    }, [token, user?.role])
  );

  // ── Notification toggle handler (fix #6) ─────────────────────────────────
  const handleNotifToggle = async (value) => {
    if (value) {
      // Request permission from OS
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotifGranted(true);
      } else {
        // OS denied — can't force it from inside the app
        Alert.alert(
          'Notifications Blocked',
          'Permission was denied. To enable notifications, please open your device Settings and allow notifications for this app.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setNotifGranted(false);
      }
    } else {
      // Can't programmatically revoke on Android — direct to settings
      Alert.alert(
        'Turn Off Notifications',
        'To disable notifications, please open your device Settings and revoke notification permission for this app.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      // Don't change local state — it still reflects the real OS value
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const risk       = riskLevel(percentage);
  const riskCfg    = risk ? RISK_CONFIG[risk] : null;
  const monthBars  = buildMonthlyBars(historyData, selectedPeriod);

  const displayName     = fullProfile?.fullname || user?.fullname || 'Student';
  const displayID       = fullProfile?.student_profile?.roll_number
    ? `Roll No: ${fullProfile.student_profile.roll_number}`
    : user ? `User ID: ${user.id}` : '';
  const program         = fullProfile?.student_profile?.program || 'Computer Science';
  const yearOfStudy     = fullProfile?.student_profile?.year_of_study
    ? `Year ${fullProfile.student_profile.year_of_study}` : 'Student';
  const displayInitials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { logoutState(); navigation.replace('Login'); } },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#111827' : '#f5f7fa'} />

      {/* ── Header (fix #5: bell navigates + badge) ── */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Academic Dashboard</Text>
        <TouchableOpacity
          style={[styles.bellButton, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Bell size={17} color={isDarkMode ? '#fff' : '#1a1f36'} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { borderColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile Card (fix #1: real % in stats row) ── */}
        <View style={[styles.profileCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayInitials}</Text>
            </View>
            <View style={styles.verifiedBadge}><Check size={11} color="#fff" /></View>
          </View>
          <Text style={[styles.profileName, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>{displayName}</Text>
          <Text style={[styles.profileID, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{displayID}</Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
              <Text style={styles.tagText}>{program}</Text>
            </View>
            <View style={[styles.tag, styles.tagSecondary, { backgroundColor: isDarkMode ? '#2e2a1a' : '#fff4e6' }]}>
              <Text style={[styles.tagText, styles.tagTextSecondary]}>{yearOfStudy}</Text>
            </View>
          </View>
          <View style={[styles.statsRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff' }]}>
            {/* Attendance stat — students only (fix #1) */}
            {user?.role === 'student' && (
            <>
            <View style={styles.statItem}>
              {analyticsLoading
                ? <ActivityIndicator size="small" color={BLUE} />
                : <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>
                    {percentage !== null ? `${percentage}%` : '—'}
                  </Text>
              }
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>ATTENDANCE</Text>
              <View style={[styles.statBar, { backgroundColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
                <View style={[styles.statBarFill, {
                  width: percentage !== null ? `${percentage}%` : '0%',
                  backgroundColor: BLUE,
                }]} />
              </View>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>{enrolledCount}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>ACTIVE</Text>
              <Text style={[styles.statSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>subjects</Text>
            </View>
            </>
            )}
            {user?.role !== 'student' && (
            <View style={[styles.statItem, { flex: 1 }]}>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                {user?.role === 'teacher' ? 'TEACHER' : 'ADMIN'}
              </Text>
            </View>
            )}
          </View>
        </View>

        {/* ── Attendance Analytics Chart (fix #4: real monthly data) — students only ── */}
        {user?.role === 'student' && (
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Attendance Analytics</Text>
            <TouchableOpacity
              style={[styles.periodPicker, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}
              onPress={() => setPeriodOpen(!periodOpen)}
            >
              <Text style={[styles.periodText, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>{selectedPeriod}</Text>
              {periodOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
            </TouchableOpacity>
          </View>
          {periodOpen && (
            <View style={[styles.periodDropdown, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
              {periods.map(p => (
                <TouchableOpacity key={p} style={[styles.periodOption, { borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]} onPress={() => { setSelectedPeriod(p); setPeriodOpen(false); }}>
                  <Text style={[styles.periodOptionText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }, selectedPeriod === p && styles.periodOptionActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {analyticsLoading
            ? <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 20 }} />
            : <BarChart bars={monthBars} isDarkMode={isDarkMode} />
          }
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BLUE }]} />
              <Text style={[styles.legendText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Current Month</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c7d0f8' }]} />
              <Text style={[styles.legendText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Previous Months</Text>
            </View>
          </View>
        </View>
        )}

        {/* ── Risk Assessment (fix #2 + #3: real %, dynamic risk level) — students only ── */}
        {user?.role === 'student' && (
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Risk Assessment</Text>
          <Text style={[styles.riskSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
            Based on your current attendance record
          </Text>

          {analyticsLoading ? (
            <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 16 }} />
          ) : riskCfg ? (
            <View style={[styles.riskCardActive, {
              backgroundColor: isDarkMode ? riskCfg.dotBg : riskCfg.cardBg,
              borderColor: riskCfg.border,
            }]}>
              <View style={styles.riskLeft}>
                <View style={[styles.riskDot, { backgroundColor: riskCfg.color }]} />
                <View>
                  <Text style={[styles.riskLabelActive, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>
                    {riskCfg.label} (Current)
                  </Text>
                  <Text style={[styles.riskRange, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                    {risk === 'Low'  ? 'Attendance 80% — 100%'
                     : risk === 'Mid' ? 'Attendance 60% — 79%'
                     : 'Attendance below 60%'}
                  </Text>
                </View>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: riskCfg.color }]}>
                <Text style={styles.riskBadgeText}>{percentage}%</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.riskSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6', marginBottom: 14 }]}>
              No attendance data yet.
            </Text>
          )}

          <View style={styles.thresholdRow}>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: AMBER }]} />
              <Text style={[styles.thresholdText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Mid Risk: 60–79%</Text>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: RED }]} />
              <Text style={[styles.thresholdText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>High Risk: Below 60%</Text>
            </View>
          </View>

          {/* Progress bar — fix #2: width driven by real percentage */}
          <View style={styles.riskProgressBg}>
            <View style={[styles.riskProgressFill, {
              width: percentage !== null ? `${Math.min(percentage, 100)}%` : '0%',
              backgroundColor: riskCfg ? riskCfg.color : '#27ae60',
            }]} />
            <View style={[styles.riskMarker, { left: '60%' }]} />
            <View style={[styles.riskMarker, { left: '80%' }]} />
          </View>
          <View style={styles.riskProgressLabels}>
            <Text style={[styles.riskProgressLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>0%</Text>
            <Text style={[styles.riskProgressLabel, { color: AMBER }]}>60%</Text>
            <Text style={[styles.riskProgressLabel, { color: GREEN }]}>80%</Text>
            <Text style={[styles.riskProgressLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>100%</Text>
          </View>
        </View>
        )}

        {/* ── Dark Mode ── */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#1a1f36', marginBottom: 14 }]}>Appearance</Text>
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              {isDarkMode ? <Moon size={17} color="#7c8ccc" /> : <Sun size={17} color="#b07d00" />}
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Dark Mode</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                {isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ false: '#e0e4f0', true: '#3a4a8a' }} thumbColor={isDarkMode ? '#7c8ccc' : '#aab0be'} />
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Settings</Text>

          <TouchableOpacity style={[styles.settingsRow, styles.settingsBorder, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]} onPress={() => setEditProfileVisible(true)}>
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}><User size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} /></View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Edit Profile</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Update your personal information</Text>
            </View>
            <ChevronRight size={22} color={isDarkMode ? '#3a4060' : '#8a94a6'} />
          </TouchableOpacity>

          {/* Notifications toggle — fix #6: real OS permission */}
          <View style={[styles.settingsRow, styles.settingsBorder, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]}>
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}><Bell size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} /></View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Notifications</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                {notifGranted ? 'Alerts are enabled' : 'Alerts are disabled — tap to enable'}
              </Text>
            </View>
            <Switch value={notifGranted} onValueChange={handleNotifToggle} trackColor={{ false: isDarkMode ? '#2a2f42' : '#e0e4f0', true: '#c7d0f8' }} thumbColor={notifGranted ? BLUE : '#aab0be'} />
          </View>

          <TouchableOpacity style={[styles.settingsRow, styles.settingsBorder, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]} onPress={() => setChangePasswordVisible(true)}>
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}><Lock size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} /></View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Change Password</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Update your account password</Text>
            </View>
            <ChevronRight size={22} color={isDarkMode ? '#3a4060' : '#8a94a6'} />
          </TouchableOpacity>

          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}><Phone size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} /></View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Contact Support</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>iimscollege.edu.np</Text>
              <Text style={[styles.settingsSub, { color: BLUE, marginTop: 1 }]}>info@iimscollege.edu.np</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6', marginTop: 1 }]}>+977-01-4362154</Text>
            </View>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0', borderColor: isDarkMode ? '#4a2020' : '#ffd0d0' }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={18} color={RED} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Profile" />

      <EditProfileModal visible={editProfileVisible} onClose={() => setEditProfileVisible(false)} currentData={{ fullname: displayName, email: fullProfile?.email || user?.email, phone: fullProfile?.phone }} token={token} isDarkMode={isDarkMode} onSaved={(u) => setFullProfile(p => ({ ...p, ...u }))} />
      <ChangePasswordModal visible={changePasswordVisible} onClose={() => setChangePasswordVisible(false)} token={token} isDarkMode={isDarkMode} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1f36' },
  bellButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, position: 'relative' },
  bellBadge:  { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5 },
  bellBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  scroll: { flex: 1, paddingHorizontal: 18 },

  profileCard: { borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: '#d0d7f5', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: BLUE },
  avatarText:    { fontSize: 26, fontWeight: '800', color: BLUE },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  profileName:   { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  profileID:     { fontSize: 12, marginBottom: 12 },
  tagRow:        { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tag:           { backgroundColor: '#eef2ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagSecondary:  { backgroundColor: '#fff4e6' },
  tagText:       { fontSize: 12, color: BLUE, fontWeight: '600' },
  tagTextSecondary: { color: '#e67e22' },
  statsRow:      { flexDirection: 'row', width: '100%', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10 },
  statItem:      { flex: 1, alignItems: 'center', gap: 3 },
  statDivider:   { width: 1, marginVertical: 4 },
  statValue:     { fontSize: 22, fontWeight: '800' },
  statLabel:     { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  statSub:       { fontSize: 10 },
  statBar:       { width: 50, height: 4, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  statBarFill:   { height: '100%', borderRadius: 2 },

  card: { borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardTitle:    { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },

  periodPicker:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  periodText:     { fontSize: 11, fontWeight: '600' },
  periodDropdown: { borderRadius: 10, marginBottom: 10, overflow: 'hidden', borderWidth: 1 },
  periodOption:   { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  periodOptionText: { fontSize: 13 },
  periodOptionActive: { color: BLUE, fontWeight: '700' },

  chartWrapper: { marginTop: 10, marginBottom: 12 },
  barsRow:      { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  barCol:       { alignItems: 'center', flex: 1, gap: 4 },
  barValue:     { fontSize: 9, fontWeight: '600' },
  barBg:        { width: 30, height: 70, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:      { width: '100%', borderRadius: 8 },
  barMonth:     { fontSize: 10, fontWeight: '600' },
  chartLegend:  { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendText:   { fontSize: 11 },

  riskSub:        { fontSize: 12, marginBottom: 14 },
  riskCardActive: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1.5, marginBottom: 14 },
  riskLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskDot:        { width: 10, height: 10, borderRadius: 5 },
  riskLabelActive:{ fontSize: 14, fontWeight: '700', marginBottom: 2 },
  riskRange:      { fontSize: 11 },
  riskBadge:      { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  riskBadgeText:  { fontSize: 13, color: '#fff', fontWeight: '800' },
  thresholdRow:   { flexDirection: 'row', gap: 16, marginBottom: 12 },
  thresholdItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  thresholdDot:   { width: 8, height: 8, borderRadius: 4 },
  thresholdText:  { fontSize: 11 },
  riskProgressBg:     { height: 8, backgroundColor: '#e74c3c', borderRadius: 4, overflow: 'hidden', position: 'relative', marginBottom: 6 },
  riskProgressFill:   { height: '100%', borderRadius: 4 },
  riskMarker:         { position: 'absolute', top: 0, width: 2, height: '100%', backgroundColor: '#fff' },
  riskProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  riskProgressLabel:  { fontSize: 10, fontWeight: '600' },

  settingsRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  settingsBorder:  { borderBottomWidth: 1 },
  settingsIcon:    { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingsContent: { flex: 1 },
  settingsLabel:   { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingsSub:     { fontSize: 11 },

  logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginBottom: 14, borderWidth: 1.5 },
  logoutText:   { fontSize: 15, fontWeight: '700', color: RED },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '90%' },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f2f8', justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  fieldInput: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, marginBottom: 14 },
  fieldInputText: { fontSize: 14 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, marginBottom: 14 },
  passwordInput: { flex: 1, fontSize: 14, paddingVertical: 13 },
  eyeBtn:      { padding: 6 },
  passwordHint:{ fontSize: 12, marginBottom: 18, marginTop: -6 },
  inlineError: { fontSize: 12, color: RED, marginTop: -8, marginBottom: 10, marginLeft: 2 },
  saveBtn:     { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
