import React, { useState } from 'react';
import BottomNav from '../components/BottomNav';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCircle2, ClipboardList, FileText, ChevronRight } from 'lucide-react-native';


// Simple circular progress using border trick
function CircularProgress({ percentage }) {
  return (
    <View style={styles.circleWrapper}>
      <View style={styles.circleOuter}>
        <View style={styles.circleInner}>
          <Text style={styles.circlePercent}>{percentage}%</Text>
          <Text style={styles.circleLabel}>OVERALL</Text>
        </View>
      </View>
    </View>
  );
}

// Simple bar chart
function WeeklyTrendChart() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const values = [60, 80, 50, 90, 70]; // percentage heights
  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsRow}>
        {values.map((val, i) => (
          <View key={i} style={styles.barColumn}>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { height: `${val}%` }]} />
            </View>
            <Text style={styles.barLabel}>{days[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const displayName = user?.fullname || 'Student';
  const displayInitials = user?.fullname
    ? user.fullname.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST';
  
  const recentStatus = [
    { subject: 'Monday(Room 205-Database)', date: 'Oct 21', status: 'Absent' },
    { subject: 'Tuesday(Room 201-DAML)', date: 'Oct 21', status: 'Absent' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayInitials}</Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.nameText}>{displayName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Bell size={17} color="#1a1f36" />
          </TouchableOpacity>
        </View>


        {/* Attendance Card */}
        <View style={styles.card}>
          <CircularProgress percentage={82} />
          <View style={styles.standingBadge}>
            <CheckCircle2 size={14} color="#27ae60" />
            <Text style={styles.standingText}>Good Standing</Text>
          </View>
        </View>

        {/* Submit Absence Waiver */}
        <TouchableOpacity 
            style={styles.actionButtonBlue} 
            onPress={() => navigation.navigate('SubmitWaiver')}
            activeOpacity={0.85}
            >
          <View style={styles.actionButtonIcon}>
            <ClipboardList size={18} color="#ffffff" />
          </View>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Submit Absence Waiver</Text>
            <Text style={styles.actionButtonSubtitle}>Upload medical certificate or note</Text>
          </View>
          <ChevronRight size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* View Absence Waiver */}
        <TouchableOpacity
          style={styles.actionButtonBlue}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WaiverStatus')}
>
          <View style={styles.actionButtonIcon}>
            <FileText size={18} color="#ffffff" />
          </View>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>View Absence Waiver</Text>
          </View>
          <ChevronRight size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* Weekly Trend */}
        <View style={styles.card}>
          <View style={styles.trendHeader}>
            <Text style={styles.sectionTitle}>Weekly Trend</Text>
            <Text style={styles.trendBadge}>+2.4%</Text>
          </View>
          <WeeklyTrendChart />
        </View>

          {/* Recent Status */}
        <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Recent Status</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AttendanceHistory')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
        </View>

        {recentStatus.map((item, index) => (
          <View key={index} style={styles.statusCard}>
            <View>
              <Text style={styles.statusSubject}>{item.subject}</Text>
              <Text style={styles.statusDate}>{item.date}</Text>
            </View>
            <View style={styles.absentBadge}>
              <View style={styles.absentDot} />
              <Text style={styles.absentText}>Absent</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>

    <BottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const BLUE = '#2952e3';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#d0d7f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
  welcomeText: {
    fontSize: 12,
    color: '#8a94a6',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
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
  bellIcon: {
    fontSize: 17,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },

  // Circle Progress
  circleWrapper: {
    marginVertical: 10,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  circleInner: {
    alignItems: 'center',
  },
  circlePercent: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1f36',
  },
  circleLabel: {
    fontSize: 11,
    color: '#8a94a6',
    letterSpacing: 1,
    fontWeight: '500',
  },

  // Standing Badge
  standingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edfaf3',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 16,
    gap: 6,
  },
  standingIcon: {
    fontSize: 14,
  },
  standingText: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
  },

  // Action Buttons
  actionButtonBlue: {
    backgroundColor: BLUE,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIconText: {
    fontSize: 18,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionButtonSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '300',
  },

  // Weekly Trend
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1f36',
  },
  trendBadge: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
  },

  // Chart
  chartContainer: {
    width: '100%',
    height: 100,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barBackground: {
    width: 28,
    height: 70,
    backgroundColor: '#eef1ff',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: BLUE,
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 11,
    color: '#8a94a6',
    marginTop: 6,
  },

  // Recent Status
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 13,
    color: BLUE,
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 3,
  },
  statusDate: {
    fontSize: 11,
    color: '#8a94a6',
  },
  absentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
  },
  absentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e74c3c',
  },
  absentText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
});