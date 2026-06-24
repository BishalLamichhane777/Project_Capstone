import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  Calendar, BarChart2, UserPlus, ClipboardList, Download, Bell,
  Shield, LogOut, Users, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react-native';


const GOLD = '#b07d00';
const BLUE = '#2952e3';

const atRiskStudents = [
  { name: 'Aarav Thapa', id: '2024-1023', attendance: 54, subject: 'CS-301', risk: 'High' },
  { name: 'Priya Shrestha', id: '2024-1087', attendance: 61, subject: 'MA-201', risk: 'Mid' },
  { name: 'Rohan Basnet', id: '2024-1145', attendance: 58, subject: 'CS-302', risk: 'High' },
  { name: 'Sita Maharjan', id: '2024-1201', attendance: 67, subject: 'CS-401', risk: 'Mid' },
];

const weekData = [
  { day: 'Mon', present: 210, total: 248 },
  { day: 'Tue', present: 198, total: 248 },
  { day: 'Wed', present: 225, total: 248 },
  { day: 'Thu', present: 190, total: 248 },
  { day: 'Fri', present: 201, total: 248 },
];

const quickActions = [
  { icon: Calendar, label: 'Manage\nSchedules', route: 'ManageSchedules', color: '#eef2ff', iconColor: BLUE },
  { icon: BarChart2, label: 'Student\nAnalytics', route: 'StudentAnalytics', color: '#edfaf3', iconColor: '#27ae60' },
  { icon: UserPlus, label: 'Add Student\nFace', route: 'AddStudentFace', color: '#fff8e6', iconColor: GOLD },
  { icon: ClipboardList, label: 'Review\nWaivers', route: 'AdminWaivers', color: '#fff0f0', iconColor: '#e74c3c' },
  { icon: Download, label: 'Export\nReports', route: 'AdminReports', color: '#f3eeff', iconColor: '#7c3aed' },
  { icon: Bell, label: 'Send\nAlerts', route: 'SendAlerts', color: '#e8f4ff', iconColor: '#2980b9' },
  { icon: Users, label: 'Manage\nBatches', route: 'ManageBatches', color: '#f3eeff', iconColor: '#7c3aed' },
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

function WeeklyChart() {
  return (
    <View style={styles.chartRow}>
      {weekData.map((d, i) => {
        const pct = Math.round((d.present / d.total) * 100);
        return (
          <View key={i} style={styles.chartCol}>
            <Text style={styles.chartPct}>{pct}%</Text>
            <View style={styles.chartBarBg}>
              <View style={[styles.chartBarFill, { height: `${pct}%` }]} />
            </View>
            <Text style={styles.chartDay}>{d.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { logoutState, user, token } = useAuth();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    try {
      const statsRes = await fetch(API.adminStats, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDashboardStats(statsData);
      }

      const sessionsRes = await fetch(API.adminRecentSessions, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setRecentSessions(sessionsData);
      }

      // Fetch unread notification count for badge
      const notifRes = await fetch(API.notificationUnreadCount, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setUnreadCount(notifData.unread_count ?? 0);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logoutState();
          navigation.replace('Login');
        }
      },
    ]);
  };

  const displayName = user?.fullname || 'Admin';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Hello, {displayName}</Text>
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
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 20 }} />
        ) : (
          <>

            <View style={styles.statsGrid}>
              {[
                { label: 'Total Students', value: dashboardStats?.total_students ?? '-', icon: Users, color: '#eef2ff', textColor: BLUE },
                { label: 'Present Today', value: dashboardStats?.present_today ?? '-', icon: CheckCircle, color: '#edfaf3', textColor: '#27ae60' },
                { label: 'Absent Today', value: dashboardStats?.absent_today ?? '-', icon: XCircle, color: '#fff0f0', textColor: '#e74c3c' },
                { label: 'Waivers Pending', value: dashboardStats?.waivers_pending ?? '-', icon: ClipboardList, color: '#fff8e6', textColor: GOLD },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
                  <View style={{ marginBottom: 8 }}>
                    <Icon size={22} color={s.textColor} />
                  </View>
                  <Text style={[styles.statValue, { color: s.textColor }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Weekly Attendance</Text>
                <Text style={styles.cardSub}>This Week</Text>
              </View>
              <WeeklyChart />
              <View style={styles.chartLegend}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>% of students present per day</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
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
                  <Text style={[styles.actionLabel, { color: action.iconColor }]}>{action.label}</Text>
                </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle size={18} color="#e74c3c" style={{ marginRight: 6 }} />
                  <Text style={styles.cardTitle}>At Risk Students</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('StudentAnalytics')}>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardSubText}>Students with attendance below 70%</Text>
              {atRiskStudents.map((student, i) => (
                <View key={i} style={[styles.studentRow, i !== atRiskStudents.length - 1 && styles.studentBorder]}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentMeta}>{student.id} · {student.subject}</Text>
                  </View>
                  <View style={styles.studentRight}>
                    <Text style={[styles.attendancePct, { color: student.risk === 'High' ? '#e74c3c' : '#f39c12' }]}>
                      {student.attendance}%
                    </Text>
                    <RiskBadge risk={student.risk} />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today's Overview</Text>
              <Text style={styles.cardSubText}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {dashboardStats?.sessions_today ?? 0} classes scheduled
              </Text>
              <View style={styles.overviewBar}>
                <View style={[styles.overviewFill, { width: `${dashboardStats?.attendance_rate ?? 0}%` }]} />
              </View>
              <View style={styles.overviewLabels}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={14} color="#27ae60" style={{ marginRight: 4 }} />
                  <Text style={styles.overviewPresent}>{dashboardStats?.present_today ?? 0} Present</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <XCircle size={14} color="#e74c3c" style={{ marginRight: 4 }} />
                  <Text style={styles.overviewAbsent}>{dashboardStats?.absent_today ?? 0} Absent</Text>
                </View>
              </View>
              <View style={styles.overviewStats}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{dashboardStats?.attendance_rate ?? 0}%</Text>
                  <Text style={styles.overviewLabel}>Attendance Rate</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{dashboardStats?.sessions_today ?? 0}</Text>
                  <Text style={styles.overviewLabel}>Classes Today</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{dashboardStats?.waivers_pending ?? 0}</Text>
                  <Text style={styles.overviewLabel}>Waivers Pending</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Sessions</Text>
              {recentSessions.length === 0 ? (
                <Text style={styles.cardSubText}>No recent sessions found.</Text>
              ) : (
                recentSessions.map((session, i) => (
                  <View key={i} style={[styles.studentRow, i !== recentSessions.length - 1 && styles.studentBorder]}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{session.class_name}</Text>
                      <Text style={styles.studentMeta}>{session.subject} · {new Date(session.start_time).toLocaleString()}</Text>
                    </View>
                    <View style={styles.studentRight}>
                      <Text style={[styles.attendancePct, { color: '#27ae60', fontSize: 13 }]}>
                        {session.present_count} P
                      </Text>
                      <Text style={[styles.attendancePct, { color: '#e74c3c', fontSize: 13 }]}>
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
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1f36' },
  headerSub: { fontSize: 12, color: '#8a94a6', marginTop: 2 },
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
  logoutBtnText: { fontSize: 16 },
  scroll: { flex: 1, paddingHorizontal: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    width: '47%', borderRadius: 16, padding: 16, alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { fontSize: 22, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#8a94a6', fontWeight: '600' },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1a1f36' },
  cardSub: { fontSize: 12, color: '#8a94a6' },
  cardSubText: { fontSize: 12, color: '#8a94a6', marginBottom: 14 },
  viewAll: { fontSize: 13, color: BLUE, fontWeight: '600' },
  chartRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'flex-end', height: 110, marginVertical: 10,
  },
  chartCol: { alignItems: 'center', flex: 1, gap: 4 },
  chartPct: { fontSize: 9, color: '#8a94a6', fontWeight: '600' },
  chartBarBg: {
    width: 32, height: 75, backgroundColor: '#eef1f5',
    borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden',
  },
  chartBarFill: { width: '100%', backgroundColor: BLUE, borderRadius: 8 },
  chartDay: { fontSize: 11, color: '#8a94a6', fontWeight: '600' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  legendText: { fontSize: 11, color: '#8a94a6' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1f36', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  actionCard: {
    width: '30%', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15 },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  studentBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  studentAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  studentAvatarText: { fontSize: 13, fontWeight: '700', color: BLUE },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  studentMeta: { fontSize: 11, color: '#8a94a6' },
  studentRight: { alignItems: 'flex-end', gap: 4 },
  attendancePct: { fontSize: 16, fontWeight: '800' },
  riskBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  riskHigh: { backgroundColor: '#fff0f0' },
  riskMid: { backgroundColor: '#fff8e6' },
  riskBadgeText: { fontSize: 10, fontWeight: '700' },
  riskHighText: { color: '#e74c3c' },
  riskMidText: { color: '#f39c12' },
  overviewBar: { height: 10, backgroundColor: '#fee', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  overviewFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: 5 },
  overviewLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  overviewPresent: { fontSize: 12, color: '#27ae60', fontWeight: '600' },
  overviewAbsent: { fontSize: 12, color: '#e74c3c', fontWeight: '600' },
  overviewStats: { flexDirection: 'row', backgroundColor: '#f8f9ff', borderRadius: 12, paddingVertical: 14 },
  overviewItem: { flex: 1, alignItems: 'center' },
  overviewDivider: { width: 1, backgroundColor: '#e6e9f0' },
  overviewValue: { fontSize: 20, fontWeight: '800', color: '#1a1f36', marginBottom: 3 },
  overviewLabel: { fontSize: 10, color: '#8a94a6', fontWeight: '600', textAlign: 'center' },
});