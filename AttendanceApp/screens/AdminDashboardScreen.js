import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  Calendar, ClipboardList, Download, Bell,
  Shield, LogOut, Users, CheckCircle, XCircle, AlertTriangle, TrendingUp,
} from 'lucide-react-native';

const GOLD = '#b07d00';
const BLUE = '#2952e3';

const quickActions = [
  { icon: Calendar,      label: 'Manage\nSchedules',  route: 'ManageSchedules',  color: '#eef2ff', iconColor: BLUE },
  { icon: TrendingUp,    label: 'Batch\nAnalytics',   route: 'BatchOverview',    color: '#f3eeff', iconColor: '#7c3aed' },
  { icon: Users,         label: 'Manage\nStudents',   route: 'ManageStudents',   color: '#edfaf3', iconColor: '#27ae60' },
  { icon: Users,         label: 'Manage\nTeachers',   route: 'ManageTeachers',   color: '#e8f4ff', iconColor: '#2980b9' },
  { icon: ClipboardList, label: 'Review\nWaivers',    route: 'AdminWaivers',     color: '#fff0f0', iconColor: '#e74c3c' },
  { icon: Download,      label: 'Export\nReports',    route: 'AdminReports',     color: '#f3eeff', iconColor: '#7c3aed' },
  { icon: Bell,          label: 'Send\nAlerts',       route: 'SendAlerts',       color: '#e8f4ff', iconColor: '#2980b9' },
  { icon: Users,         label: 'Manage\nBatches',    route: 'ManageBatches',    color: '#f3eeff', iconColor: '#7c3aed' },
];

function RiskBadge({ risk }) {
  const isHigh = risk === 'High';
  return (
    <View style={[styles.riskBadge, isHigh ? styles.riskHigh : styles.riskMid]}>
      <Text style={[styles.riskBadgeText, isHigh ? styles.riskHighText : styles.riskMidText]}>
        {risk} Risk
      </Text>
    </View>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { logoutState, user, token, isDarkMode } = useAuth();
  const [dashboardStats, setDashboardStats]   = useState(null);
  const [recentSessions, setRecentSessions]   = useState([]);
  const [atRiskStudents, setAtRiskStudents]   = useState([]);
  const [refreshing, setRefreshing]           = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [unreadCount, setUnreadCount]         = useState(0);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, sessionsRes, notifRes, atRiskRes] = await Promise.all([
        fetch(API.adminStats,              { headers }),
        fetch(API.adminRecentSessions,     { headers }),
        fetch(API.notificationUnreadCount, { headers }),
        fetch(API.adminDashboardAtRisk,    { headers }),
      ]);

      if (statsRes.ok)    setDashboardStats(await statsRes.json());
      if (sessionsRes.ok) setRecentSessions(await sessionsRes.json());
      if (notifRes.ok) {
        const nd = await notifRes.json();
        setUnreadCount(nd.unread_count ?? 0);
      }
      if (atRiskRes.ok) {
        const ard = await atRiskRes.json();
        setAtRiskStudents(ard.students ?? []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: () => { logoutState(); navigation.replace('Login'); },
      },
    ]);
  };

  const displayName = user?.fullname || 'Admin';

  // ── Theme ────────────────────────────────────────────────────────────────
  const bg          = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const headerBg    = isDarkMode ? '#1a1f2e' : '#f5f7fa';
  const textPrimary = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub     = isDarkMode ? '#8a94b8' : '#8a94a6';
  const rowBorder   = isDarkMode ? '#252b3e' : '#f0f2f5';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={headerBg}
      />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Admin Dashboard</Text>
          <Text style={[styles.headerSub,   { color: textSub }]}>Hello, {displayName}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.adminBadge, { flexDirection: 'row', alignItems: 'center' }]}>
            <Shield size={12} color={GOLD} style={{ marginRight: 4 }} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={18} color="#1a1f36" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Total Students', value: dashboardStats?.total_students  ?? '-', icon: Users,         color: '#eef2ff', textColor: BLUE        },
                { label: 'Present Today',  value: dashboardStats?.present_today   ?? '-', icon: CheckCircle,   color: '#edfaf3', textColor: '#27ae60'   },
                { label: 'Absent Today',   value: dashboardStats?.absent_today    ?? '-', icon: XCircle,       color: '#fff0f0', textColor: '#e74c3c'   },
                { label: 'Waivers Pending',value: dashboardStats?.waivers_pending ?? '-', icon: ClipboardList, color: '#fff8e6', textColor: GOLD        },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
                    <View style={{ marginBottom: 8 }}>
                      <Icon size={22} color={s.textColor} />
                    </View>
                    <Text style={[styles.statValue, { color: s.textColor }]}>{s.value}</Text>
                    <Text style={[styles.statLabel,  { color: textSub }]}>{s.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* ── Quick Actions ── */}
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.actionCard, { backgroundColor: action.color }]}
                    onPress={() => navigation.navigate(action.route)}
                    activeOpacity={0.8}
                  >
                    <View style={{ marginBottom: 6 }}>
                      <Icon size={24} color={action.iconColor} />
                    </View>
                    <Text style={[styles.actionLabel, { color: action.iconColor }]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── At Risk Students (live data) ── */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <View style={styles.cardTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle size={18} color="#e74c3c" style={{ marginRight: 6 }} />
                  <Text style={[styles.cardTitle, { color: textPrimary }]}>At Risk Students</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('StudentAnalytics')}>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.cardSubText, { color: textSub }]}>
                Students with attendance below 75%
              </Text>

              {atRiskStudents.length === 0 ? (
                <View style={styles.emptyState}>
                  <CheckCircle size={28} color="#27ae60" style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyStateText, { color: textSub }]}>
                    No at-risk students right now
                  </Text>
                </View>
              ) : (
                atRiskStudents.map((student, i) => {
                  const risk = student.attendance_percent < 60 ? 'High' : 'Mid';
                  return (
                    <View
                      key={student.student_id}
                      style={[
                        styles.studentRow,
                        i !== atRiskStudents.length - 1 && [
                          styles.studentBorder, { borderBottomColor: rowBorder },
                        ],
                      ]}
                    >
                      <View style={[styles.studentAvatar, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
                        <Text style={styles.studentAvatarText}>
                          {student.fullname.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={[styles.studentName, { color: textPrimary }]}>
                          {student.fullname}
                        </Text>
                        <Text style={[styles.studentMeta, { color: textSub }]}>
                          {student.roll_number} · {student.class_name}
                        </Text>
                      </View>
                      <View style={styles.studentRight}>
                        <Text style={[
                          styles.attendancePct,
                          { color: risk === 'High' ? '#e74c3c' : '#f39c12' },
                        ]}>
                          {student.attendance_percent}%
                        </Text>
                        <RiskBadge risk={risk} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* ── Recent Sessions ── */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Recent Sessions</Text>
              {recentSessions.length === 0 ? (
                <Text style={[styles.cardSubText, { color: textSub }]}>No recent sessions found.</Text>
              ) : (
                recentSessions.map((session, i) => (
                  <View
                    key={session.session_id ?? i}
                    style={[
                      styles.studentRow,
                      i !== recentSessions.length - 1 && [
                        styles.studentBorder, { borderBottomColor: rowBorder },
                      ],
                    ]}
                  >
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: textPrimary }]}>
                        {session.class_name}
                      </Text>
                      <Text style={[styles.studentMeta, { color: textSub }]}>
                        {session.subject} · {new Date(session.start_time).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.studentRight}>
                      <Text style={[styles.sessionCount, { color: '#27ae60' }]}>
                        {session.present_count} P
                      </Text>
                      <Text style={[styles.sessionCount, { color: '#e74c3c' }]}>
                        {session.absent_count} A
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: '#f5f7fa' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1f36' },
  headerSub:   { fontSize: 12, color: '#8a94a6', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminBadge: {
    backgroundColor: '#fff8e6', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#f0d080',
  },
  adminBadgeText: { fontSize: 12, color: GOLD, fontWeight: '700' },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#e74c3c',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#f5f7fa',
  },
  bellBadgeText: { fontSize: 9, color: '#ffffff', fontWeight: '800' },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff0f0', justifyContent: 'center', alignItems: 'center',
  },

  // Scroll
  scroll: { flex: 1, paddingHorizontal: 18 },

  // Stat cards
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16, marginTop: 8 },
  statCard: {
    width: '47%', borderRadius: 16, padding: 16, alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1f36', marginBottom: 12 },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  actionCard: {
    width: '30%', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  actionLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15 },

  // Generic card
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: '#1a1f36' },
  cardSubText: { fontSize: 12, color: '#8a94a6', marginBottom: 14 },
  viewAll:     { fontSize: 13, color: BLUE, fontWeight: '600' },

  // Student rows (at-risk + recent sessions)
  studentRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  studentBorder:{ borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  studentAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  studentAvatarText: { fontSize: 13, fontWeight: '700', color: BLUE },
  studentInfo:  { flex: 1 },
  studentName:  { fontSize: 14, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  studentMeta:  { fontSize: 11, color: '#8a94a6' },
  studentRight: { alignItems: 'flex-end', gap: 4 },
  attendancePct:{ fontSize: 16, fontWeight: '800' },
  sessionCount: { fontSize: 13, fontWeight: '700' },

  // Risk badges
  riskBadge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  riskHigh:      { backgroundColor: '#fff0f0' },
  riskMid:       { backgroundColor: '#fff8e6' },
  riskBadgeText: { fontSize: 10, fontWeight: '700' },
  riskHighText:  { color: '#e74c3c' },
  riskMidText:   { color: '#f39c12' },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 24,
  },
  emptyStateText: { fontSize: 14, fontWeight: '500' },
});
