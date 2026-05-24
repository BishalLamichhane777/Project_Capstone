import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert,
} from 'react-native';
import AdminBottomNav from '../components/AdminBottomNav';

const GOLD = '#b07d00';
const BLUE = '#2952e3';

const stats = [
  { label: 'Total Students', value: '248', icon: '👥', color: '#eef2ff', textColor: BLUE },
  { label: 'Present Today',  value: '201', icon: '✅', color: '#edfaf3', textColor: '#27ae60' },
  { label: 'Absent Today',   value: '47',  icon: '❌', color: '#fff0f0', textColor: '#e74c3c' },
  { label: 'Waivers Pending',value: '12',  icon: '📋', color: '#fff8e6', textColor: GOLD },
];

const atRiskStudents = [
  { name: 'Aarav Thapa',    id: '2024-1023', attendance: 54, subject: 'CS-301', risk: 'High' },
  { name: 'Priya Shrestha', id: '2024-1087', attendance: 61, subject: 'MA-201', risk: 'Mid' },
  { name: 'Rohan Basnet',   id: '2024-1145', attendance: 58, subject: 'CS-302', risk: 'High' },
  { name: 'Sita Maharjan',  id: '2024-1201', attendance: 67, subject: 'CS-401', risk: 'Mid' },
];

const weekData = [
  { day: 'Mon', present: 210, total: 248 },
  { day: 'Tue', present: 198, total: 248 },
  { day: 'Wed', present: 225, total: 248 },
  { day: 'Thu', present: 190, total: 248 },
  { day: 'Fri', present: 201, total: 248 },
];

const quickActions = [
  { icon: '📅', label: 'Manage\nSchedules',  route: 'ManageSchedules',  color: '#eef2ff', iconColor: BLUE },
  { icon: '📊', label: 'Student\nAnalytics', route: 'StudentAnalytics', color: '#edfaf3', iconColor: '#27ae60' },
  { icon: '🤳', label: 'Add Student\nFace',  route: 'AddStudentFace',   color: '#fff8e6', iconColor: GOLD },
  { icon: '📋', label: 'Review\nWaivers',    route: 'AdminWaivers',     color: '#fff0f0', iconColor: '#e74c3c' },
  { icon: '📤', label: 'Export\nReports',    route: 'AdminReports',     color: '#f3eeff', iconColor: '#7c3aed' },
  { icon: '🔔', label: 'Send\nAlerts',       route: 'SendAlerts',       color: '#e8f4ff', iconColor: '#2980b9' },
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
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('Login') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Monday, Oct 21, 2024</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>🛡️ Admin</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.textColor }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
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
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={() => navigation.navigate(action.route)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: action.iconColor }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>⚠️ At Risk Students</Text>
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
          <Text style={styles.cardSubText}>Oct 21, 2024 — 5 classes scheduled</Text>
          <View style={styles.overviewBar}>
            <View style={[styles.overviewFill, { width: `${Math.round(201/248*100)}%` }]} />
          </View>
          <View style={styles.overviewLabels}>
            <Text style={styles.overviewPresent}>✅ 201 Present</Text>
            <Text style={styles.overviewAbsent}>❌ 47 Absent</Text>
          </View>
          <View style={styles.overviewStats}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>81%</Text>
              <Text style={styles.overviewLabel}>Attendance Rate</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>5</Text>
              <Text style={styles.overviewLabel}>Classes Today</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>12</Text>
              <Text style={styles.overviewLabel}>Waivers Pending</Text>
            </View>
          </View>
        </View>

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