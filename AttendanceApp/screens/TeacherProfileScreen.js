import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Switch,
} from 'react-native';
import TeacherBottomNav from '../components/TeacherBottomNav';

const BLUE = '#2952e3';

// ─── Mock teacher data ────────────────────────────────────────────────────────
const TEACHER = {
  name: 'Bishal Bhat',
  initials: 'BB',
  role: 'Lecturer',
  department: 'Computer Science',
  employeeId: 'EMP-2024-041',
  email: 'bishal.bhat@college.edu',
  phone: '+977 98XXXXXXXX',
  joinDate: 'August 2021',
  classes: 3,
  students: 68,
  avgAttendance: '87%',
};

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: '✏️',  label: 'Edit Profile',          route: null },
      { icon: '🔑',  label: 'Change Password',        route: null },
      { icon: '🖼️',  label: 'Update Profile Photo',   route: null },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: '🌐',  label: 'Language',               value: 'English',  route: null },
      { icon: '🎨',  label: 'Theme',                   value: 'Light',    route: null },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { icon: '🔔',  label: 'Push Notifications',     toggle: 'push'     },
      { icon: '📧',  label: 'Email Alerts',            toggle: 'email'    },
      { icon: '📱',  label: 'SMS Alerts',              toggle: 'sms'      },
    ],
  },
  {
    title: 'App Settings',
    items: [
      { icon: '🔒',  label: 'Biometric Login',         toggle: 'biometric' },
      { icon: '📷',  label: 'Auto-Open Camera',         toggle: 'autoCamera' },
      { icon: '💾',  label: 'Auto-Save Attendance',     toggle: 'autoSave'  },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: '❓',  label: 'Help & FAQ',              route: null },
      { icon: '🐛',  label: 'Report a Bug',            route: null },
      { icon: '📄',  label: 'Privacy Policy',          route: null },
      { icon: '📋',  label: 'Terms of Service',        route: null },
    ],
  },
];

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MenuItem({ item, toggles, onToggle }) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={item.toggle ? 1 : 0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconWrap}>
          <Text style={styles.menuIcon}>{item.icon}</Text>
        </View>
        <Text style={styles.menuLabel}>{item.label}</Text>
      </View>

      {item.toggle ? (
        <Switch
          value={toggles[item.toggle]}
          onValueChange={(v) => onToggle(item.toggle, v)}
          trackColor={{ false: '#e6e9f0', true: `${BLUE}55` }}
          thumbColor={toggles[item.toggle] ? BLUE : '#aab0be'}
          ios_backgroundColor="#e6e9f0"
        />
      ) : item.value ? (
        <View style={styles.menuValueRow}>
          <Text style={styles.menuValue}>{item.value}</Text>
          <Text style={styles.menuChevron}>›</Text>
        </View>
      ) : (
        <Text style={styles.menuChevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherProfileScreen({ navigation }) {
  const [toggles, setToggles] = useState({
    push: true,
    email: true,
    sms: false,
    biometric: false,
    autoCamera: true,
    autoSave: true,
  });
  const [showSettings, setShowSettings] = useState(false);

  const handleToggle = (key, val) => setToggles(prev => ({ ...prev, [key]: val }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile Hero Card ── */}
        <View style={styles.heroCard}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{TEACHER.initials}</Text>
            </View>
            <TouchableOpacity style={styles.avatarEdit}>
              <Text style={{ fontSize: 11 }}>✏️</Text>
            </TouchableOpacity>
            <View style={styles.onlineIndicator} />
          </View>

          <Text style={styles.heroName}>{TEACHER.name}</Text>
          <Text style={styles.heroRole}>{TEACHER.role} · {TEACHER.department}</Text>
          <Text style={styles.heroId}>ID: {TEACHER.employeeId}</Text>

          {/* Quick Stats */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{TEACHER.classes}</Text>
              <Text style={styles.heroStatLabel}>Classes</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{TEACHER.students}</Text>
              <Text style={styles.heroStatLabel}>Students</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{TEACHER.avgAttendance}</Text>
              <Text style={styles.heroStatLabel}>Avg. Att.</Text>
            </View>
          </View>
        </View>

        {/* ── Contact Info ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <InfoRow icon="✉️"  label="Email"      value={TEACHER.email}   />
          <InfoRow icon="📱"  label="Phone"      value={TEACHER.phone}   />
          <InfoRow icon="🏛️"  label="Department" value={TEACHER.department} />
          <InfoRow icon="📅"  label="Joined"     value={TEACHER.joinDate} />
        </View>

        {/* ── Settings Toggle ── */}
        <TouchableOpacity
          style={styles.settingsToggle}
          onPress={() => setShowSettings(!showSettings)}
          activeOpacity={0.8}
        >
          <View style={styles.settingsToggleLeft}>
            <View style={styles.settingsToggleIcon}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </View>
            <View>
              <Text style={styles.settingsToggleTitle}>App Settings</Text>
              <Text style={styles.settingsToggleSub}>Notifications, preferences, security</Text>
            </View>
          </View>
          <Text style={[styles.menuChevron, { transform: [{ rotate: showSettings ? '90deg' : '0deg' }] }]}>›</Text>
        </TouchableOpacity>

        {/* ── Settings Sections (collapsible) ── */}
        {showSettings && MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, i) => (
              <MenuItem
                key={i}
                item={item}
                toggles={toggles}
                onToggle={handleToggle}
              />
            ))}
          </View>
        ))}

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>AttendanceApp v2.10 · © 2024</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TeacherBottomNav navigation={navigation} active="Profile" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flex: 1, paddingHorizontal: 18 },

  // Hero Card
  heroCard: {
    backgroundColor: BLUE, borderRadius: 24, padding: 24,
    alignItems: 'center', marginTop: 16, marginBottom: 14,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: -4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute', top: 2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#4ade80', borderWidth: 2, borderColor: BLUE,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  heroRole: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  heroId: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  heroStats: {
    flexDirection: 'row', width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingVertical: 14,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Card
  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 18,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#8a94a6',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f7fa',
  },
  infoIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  infoBody: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#8a94a6', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#1a1f36', fontWeight: '600', marginTop: 1 },

  // Settings toggle banner
  settingsToggle: {
    backgroundColor: '#1a1f36', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  settingsToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingsToggleIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  settingsToggleTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  settingsToggleSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // Menu items
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f7fa',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f5f7fa', justifyContent: 'center', alignItems: 'center',
  },
  menuIcon: { fontSize: 16 },
  menuLabel: { fontSize: 14, color: '#1a1f36', fontWeight: '600' },
  menuValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, color: '#8a94a6' },
  menuChevron: { fontSize: 20, color: '#aab0be', fontWeight: '300' },

  // Logout
  logoutBtn: {
    backgroundColor: '#fff0f0', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 14,
    borderWidth: 1.5, borderColor: '#fdd',
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#e74c3c' },

  versionText: {
    textAlign: 'center', fontSize: 11, color: '#aab0be', marginBottom: 8,
  },
});