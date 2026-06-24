import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import {
  User, Lock, Shield, Bell, Mail, AlertTriangle, ScanFace, Calendar,
  BarChart3, Upload, Trash2, RefreshCw, ChevronLeft, LogOut, ChevronRight
} from 'lucide-react-native';

const BLUE = '#2952e3';
const GOLD = '#b07d00';

const settingSections = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Admin Profile',       sub: 'Edit name, email, photo',        type: 'nav' },
      { icon: Lock, label: 'Change Password',      sub: 'Update your login credentials',  type: 'nav' },
      { icon: Shield, label: 'Two-Factor Auth',      sub: 'Extra layer of security',        type: 'nav' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { icon: Bell, label: 'Push Notifications',   sub: 'Alerts on your device',          type: 'toggle', key: 'push' },
      { icon: Mail, label: 'Email Alerts',          sub: 'Receive reports via email',      type: 'toggle', key: 'email' },
      { icon: AlertTriangle, label: 'At-Risk Alerts',        sub: 'Notify when student drops below 60%', type: 'toggle', key: 'risk' },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: ScanFace, label: 'Face Recognition',     sub: 'Manage AI detection settings',   type: 'nav' },
      { icon: Calendar, label: 'Academic Calendar',    sub: 'Set semester start & end dates', type: 'nav' },
      { icon: BarChart3, label: 'Attendance Threshold', sub: 'Set minimum attendance %',       type: 'nav' },
    ],
  },
  {
    title: 'Data',
    items: [
      { icon: Upload, label: 'Export Data',           sub: 'Download reports and records',   type: 'nav', route: 'ExportReports' },
      { icon: Trash2, label: 'Clear Cache',           sub: 'Free up storage space',          type: 'danger' },
      { icon: RefreshCw, label: 'Reset System',          sub: 'Restore default settings',       type: 'danger' },
    ],
  },
];

export default function AdminSettingsScreen({ navigation }) {
  const [toggles, setToggles] = useState({ push: true, email: true, risk: false });

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const handleNav = (item) => {
    if (item.route) { navigation.navigate(item.route); return; }
    Alert.alert(item.label, `${item.label} settings coming soon.`);
  };

  const handleDanger = (item) => {
    Alert.alert(
      item.label,
      `Are you sure you want to ${item.label.toLowerCase()}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: item.label, style: 'destructive', onPress: () => Alert.alert('Done', `${item.label} completed.`) },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('Login') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Admin Info Card */}
        <View style={styles.adminCard}>
          <View style={styles.adminAvatar}>
            <Text style={styles.adminAvatarText}>AD</Text>
          </View>
          <View style={styles.adminInfo}>
            <Text style={styles.adminName}>Admin User</Text>
            <Text style={styles.adminEmail}>admin@attendance.edu</Text>
          </View>
          <View style={[styles.adminBadge, { flexDirection: 'row', alignItems: 'center' }]}>
            <Shield size={11} color={GOLD} style={{ marginRight: 4 }} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        {/* Setting Sections */}
        {settingSections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.settingRow, ii !== section.items.length - 1 && styles.settingBorder]}
                  onPress={() => {
                    if (item.type === 'toggle') return;
                    if (item.type === 'danger') { handleDanger(item); return; }
                    handleNav(item);
                  }}
                  activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                >
                  <View style={[styles.settingIcon, item.type === 'danger' && styles.settingIconDanger]}>
                    <item.icon size={18} color={item.type === 'danger' ? '#e74c3c' : '#1a1f36'} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, item.type === 'danger' && styles.settingLabelDanger]}>
                      {item.label}
                    </Text>
                    <Text style={styles.settingSub}>{item.sub}</Text>
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={toggles[item.key]}
                      onValueChange={() => toggle(item.key)}
                      trackColor={{ false: '#e0e4f0', true: '#c7d0f8' }}
                      thumbColor={toggles[item.key] ? BLUE : '#aab0be'}
                    />
                  ) : (
                    <ChevronRight size={20} color={item.type === 'danger' ? '#e74c3c' : '#c0c8d8'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v2.10 © 2024 Attendance Systems</Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eef1f5',
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#1a1f36', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1f36' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  adminCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  adminAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff8e6', borderWidth: 2, borderColor: GOLD,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  adminAvatarText: { fontSize: 16, fontWeight: '800', color: GOLD },
  adminInfo: { flex: 1 },
  adminName: { fontSize: 15, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  adminEmail: { fontSize: 12, color: '#8a94a6' },
  adminBadge: {
    backgroundColor: '#fff8e6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#f0d080',
  },
  adminBadgeText: { fontSize: 11, color: GOLD, fontWeight: '700' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: {
    backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f0f2f8', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  settingIconDanger: { backgroundColor: '#fff0f0' },
  settingIconText: { fontSize: 16 },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#1a1f36', marginBottom: 2 },
  settingLabelDanger: { color: '#e74c3c' },
  settingSub: { fontSize: 11, color: '#8a94a6' },
  settingArrow: { fontSize: 22, color: '#c0c8d8' },
  settingArrowDanger: { color: '#e74c3c' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff0f0', borderRadius: 14, paddingVertical: 15,
    marginBottom: 14, borderWidth: 1.5, borderColor: '#ffd0d0',
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#e74c3c' },
  version: { textAlign: 'center', fontSize: 11, color: '#aab0be', marginBottom: 10 },
});