import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import BottomNav from '../components/BottomNav';

const BLUE = '#2952e3';

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY'];
const chartValues = [72, 78, 65, 85, 82];

function BarChart() {
  const max = Math.max(...chartValues);
  return (
    <View style={styles.chartWrapper}>
      <View style={styles.barsRow}>
        {chartValues.map((val, i) => (
          <View key={i} style={styles.barCol}>
            <Text style={styles.barValue}>{val}%</Text>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${(val / max) * 100}%`,
                    backgroundColor: val === 82 ? BLUE : '#c7d0f8',
                  },
                ]}
              />
            </View>
            <Text style={styles.barMonth}>{months[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const settingsItems = [
  { icon: '👤', label: 'Edit Profile', sub: 'Update your personal information' },
  { icon: '🔔', label: 'Notifications', sub: 'Manage alerts and reminders' },
  { icon: '🔒', label: 'Change Password', sub: 'Update your account password' },
  { icon: '📞', label: 'Contact Support', sub: 'Get help from our team' },
];

export default function ProfileScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 5 Months');
  const periods = ['Last 3 Months', 'Last 5 Months', 'This Year'];
  const [periodOpen, setPeriodOpen] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('Login') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Academic Dashboard</Text>
        <TouchableOpacity style={styles.bellButton}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SK</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon}>✓</Text>
            </View>
          </View>

          <Text style={styles.profileName}>Sajak Singh Khadka</Text>
          <Text style={styles.profileID}>Student ID: 2024-8836</Text>

          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Computer Science</Text>
            </View>
            <View style={[styles.tag, styles.tagSecondary]}>
              <Text style={[styles.tagText, styles.tagTextSecondary]}>Junior Year</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>88%</Text>
              <Text style={styles.statLabel}>ATTENDANCE</Text>
              <View style={styles.statBar}>
                <View style={[styles.statBarFill, { width: '88%', backgroundColor: BLUE }]} />
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <Text style={styles.statSub}>subjects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#f39c12' }]}>B+</Text>
              <Text style={styles.statLabel}>GPA</Text>
              <View style={styles.starRow}>
                {[1,2,3,4].map(s => (
                  <Text key={s} style={styles.star}>★</Text>
                ))}
                <Text style={[styles.star, { color: '#ddd' }]}>★</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Attendance Analytics */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Attendance Analytics</Text>
            <TouchableOpacity
              style={styles.periodPicker}
              onPress={() => setPeriodOpen(!periodOpen)}
            >
              <Text style={styles.periodText}>{selectedPeriod}</Text>
              <Text style={styles.periodArrow}>{periodOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </View>

          {periodOpen && (
            <View style={styles.periodDropdown}>
              {periods.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.periodOption}
                  onPress={() => { setSelectedPeriod(p); setPeriodOpen(false); }}
                >
                  <Text style={[styles.periodOptionText, selectedPeriod === p && styles.periodOptionActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <BarChart />

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BLUE }]} />
              <Text style={styles.legendText}>Current Month</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c7d0f8' }]} />
              <Text style={styles.legendText}>Previous Months</Text>
            </View>
          </View>
        </View>

        {/* Risk Assessment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Risk Assessment</Text>
          <Text style={styles.riskSub}>Based on your current attendance record</Text>

          {/* Low Risk - Current */}
          <View style={styles.riskCardActive}>
            <View style={styles.riskLeft}>
              <View style={[styles.riskDot, { backgroundColor: '#27ae60' }]} />
              <View>
                <Text style={styles.riskLabelActive}>Low Risk (Current)</Text>
                <Text style={styles.riskRange}>Attendance 80% — 100%</Text>
              </View>
            </View>
            <View style={styles.riskBadge}>
              <Text style={styles.riskBadgeText}>88%</Text>
            </View>
          </View>

          {/* Thresholds Info */}
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#f39c12' }]} />
              <Text style={styles.thresholdText}>Mid Risk: 60–79%</Text>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.thresholdText}>High Risk: Below 60%</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.riskProgressBg}>
            <View style={[styles.riskProgressFill, { width: '88%' }]} />
            <View style={[styles.riskMarker, { left: '60%' }]} />
            <View style={[styles.riskMarker, { left: '79%' }]} />
          </View>
          <View style={styles.riskProgressLabels}>
            <Text style={styles.riskProgressLabel}>0%</Text>
            <Text style={[styles.riskProgressLabel, { color: '#f39c12' }]}>60%</Text>
            <Text style={[styles.riskProgressLabel, { color: '#27ae60' }]}>80%</Text>
            <Text style={styles.riskProgressLabel}>100%</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          {settingsItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.settingsRow, i !== settingsItems.length - 1 && styles.settingsBorder]}
            >
              <View style={styles.settingsIcon}>
                <Text style={styles.settingsIconText}>{item.icon}</Text>
              </View>
              <View style={styles.settingsContent}>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Text style={styles.settingsSub}>{item.sub}</Text>
              </View>
              <Text style={styles.settingsArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v2.10 © 2024 Attendance Systems</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1f36',
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  bellIcon: { fontSize: 17 },

  scroll: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d0d7f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: BLUE,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: BLUE,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  verifiedIcon: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1f36',
    marginBottom: 4,
  },
  profileID: {
    fontSize: 12,
    color: '#8a94a6',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tag: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagSecondary: {
    backgroundColor: '#fff4e6',
  },
  tagText: {
    fontSize: 12,
    color: BLUE,
    fontWeight: '600',
  },
  tagTextSecondary: {
    color: '#e67e22',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#f8f9ff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e6e9f0',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1f36',
  },
  statLabel: {
    fontSize: 9,
    color: '#8a94a6',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statSub: {
    fontSize: 10,
    color: '#8a94a6',
  },
  statBar: {
    width: 50,
    height: 4,
    backgroundColor: '#e6e9f0',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  star: {
    fontSize: 10,
    color: '#f39c12',
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1f36',
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  // Period Picker
  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f2f8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  periodText: {
    fontSize: 11,
    color: '#1a1f36',
    fontWeight: '600',
  },
  periodArrow: {
    fontSize: 9,
    color: '#8a94a6',
  },
  periodDropdown: {
    backgroundColor: '#f8f9ff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e6e9f0',
  },
  periodOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  periodOptionText: {
    fontSize: 13,
    color: '#8a94a6',
  },
  periodOptionActive: {
    color: BLUE,
    fontWeight: '700',
  },

  // Chart
  chartWrapper: {
    marginTop: 10,
    marginBottom: 12,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  barValue: {
    fontSize: 9,
    color: '#8a94a6',
    fontWeight: '600',
  },
  barBg: {
    width: 30,
    height: 70,
    backgroundColor: '#eef1f5',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barMonth: {
    fontSize: 10,
    color: '#8a94a6',
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#8a94a6',
  },

  // Risk Assessment
  riskSub: {
    fontSize: 12,
    color: '#8a94a6',
    marginBottom: 14,
  },
  riskCardActive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#edfaf3',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#27ae60',
    marginBottom: 14,
  },
  riskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  riskLabelActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 2,
  },
  riskRange: {
    fontSize: 11,
    color: '#8a94a6',
  },
  riskBadge: {
    backgroundColor: '#27ae60',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  riskBadgeText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '800',
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  thresholdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thresholdText: {
    fontSize: 11,
    color: '#8a94a6',
  },
  riskProgressBg: {
    height: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  riskProgressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  riskMarker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#ffffff',
  },
  riskProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskProgressLabel: {
    fontSize: 10,
    color: '#8a94a6',
    fontWeight: '600',
  },

  // Settings
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  settingsBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0f2f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsIconText: { fontSize: 17 },
  settingsContent: { flex: 1 },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 2,
  },
  settingsSub: {
    fontSize: 11,
    color: '#8a94a6',
  },
  settingsArrow: {
    fontSize: 22,
    color: '#8a94a6',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff0f0',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#ffd0d0',
  },
  logoutIcon: { fontSize: 18 },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e74c3c',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#aab0be',
    marginBottom: 10,
  },
});