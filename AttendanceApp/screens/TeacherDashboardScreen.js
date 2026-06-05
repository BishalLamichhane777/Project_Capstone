import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import TeacherBottomNav from '../components/TeacherBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { Clock, Users, CheckCircle2, MoreHorizontal, MapPin, DoorOpen, Play, Bell, Camera, ChevronRight } from 'lucide-react-native';

const BLUE = '#2952e3';

// Fetched dynamically from backend

const quickStats = [
  { icon: Clock, value: '4', label: 'Classes Today', color: '#eef2ff', textColor: BLUE },
  { icon: Users, value: '68', label: 'Total Students', color: '#edfaf3', textColor: '#27ae60' },
  { icon: CheckCircle2, value: '91%', label: 'Avg Attendance', color: '#fff8e6', textColor: '#f39c12' },
];

// Fake avatar initials for student cluster
const avatarColors = ['#d0d7f5', '#fde8d8', '#d4f4e2', '#fde2e2'];
const avatarInitials = ['SK', 'PR', 'AB'];

function StudentAvatars({ count }) {
  return (
    <View style={styles.avatarCluster}>
      {avatarInitials.map((ini, i) => (
        <View
          key={i}
          style={[styles.miniAvatar, { backgroundColor: avatarColors[i], marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }]}
        >
          <Text style={styles.miniAvatarText}>{ini}</Text>
        </View>
      ))}
      <View style={[styles.miniAvatar, styles.miniAvatarCount, { marginLeft: -8 }]}>
        <Text style={styles.miniAvatarCountText}>+{count - 3}</Text>
      </View>
    </View>
  );
}

function OngoingCard({ item, navigation }) {
  return (
    <View style={styles.ongoingCard}>
      <View style={styles.ongoingTop}>
        <View style={styles.ongoingBadge}>
          <View style={styles.ongoingDot} />
          <Text style={styles.ongoingBadgeText}>Now Happening</Text>
        </View>
        <TouchableOpacity>
          <MoreHorizontal size={14} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <Text style={styles.ongoingSubject}>{item.subject}</Text>
      <Text style={styles.ongoingCode}>{item.code} • {item.dept}</Text>

      <View style={styles.ongoingDetails}>
        <View style={styles.ongoingDetailItem}>
          <Clock size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.ongoingDetailText}>{item.time}</Text>
        </View>
        <View style={styles.ongoingDetailItem}>
          <MapPin size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.ongoingDetailText}>{item.room}</Text>
        </View>
      </View>

      <View style={styles.ongoingBottom}>
        <StudentAvatars count={item.students} />
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('StartClass', { classItem: item })}
          activeOpacity={0.85}
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function UpcomingCard({ item, navigation }) {
  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingDate}>
        <Text style={styles.upcomingMonth}>{item.month}</Text>
        <Text style={styles.upcomingDay}>{item.day}</Text>
      </View>
      <View style={styles.upcomingInfo}>
        <Text style={styles.upcomingSubject}>{item.subject}</Text>
        <Text style={styles.upcomingCode}>{item.code} • {item.dept}</Text>
        <View style={styles.upcomingDetails}>
          <View style={styles.upcomingDetailItem}>
            <Clock size={11} color="#6b7280" />
            <Text style={styles.upcomingDetailText}>{item.time}</Text>
          </View>
          <View style={styles.upcomingDetailItem}>
            <DoorOpen size={11} color="#6b7280" />
            <Text style={styles.upcomingDetailText}>{item.room}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => navigation.navigate('StartClass', { classItem: item })}
        activeOpacity={0.85}
      >
        <Play size={12} color={BLUE} fill={BLUE} />
      </TouchableOpacity>
    </View>
  );
}

export default function TeacherDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch(API.sessionMySessions, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      } else {
        throw new Error('Failed to fetch classes');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load your classes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const ongoing = sessions.find(c => c.status === 'ongoing');
  const upcoming = sessions.filter(c => c.status === 'upcoming');

  const displayName = user?.fullname || 'Teacher';
  const displayInitials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'TE';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayInitials}</Text>
              <View style={styles.onlineIndicator} />
            </View>
            <View>
              <Text style={styles.roleLabel}>TEACHER</Text>
              <Text style={styles.nameText}>Hello, {displayName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={18} color="#1a1f36" />
          </TouchableOpacity>
        </View>


        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {quickStats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
              <View style={{ marginBottom: 4 }}>
                <s.icon size={18} color={s.textColor} />
              </View>
              <Text style={[styles.statValue, { color: s.textColor }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Today's Schedule Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TeacherClasses')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginVertical: 30 }} />
        ) : (
          <>
            {sessions.length === 0 ? (
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <Text style={{ color: '#8a94a6' }}>No classes scheduled for today.</Text>
              </View>
            ) : (
              <>
                {/* Ongoing Class Card */}
                {ongoing && <OngoingCard item={ongoing} navigation={navigation} />}

                {/* Upcoming Classes */}
                {upcoming.map((item, idx) => (
                  <UpcomingCard key={item.id || idx} item={item} navigation={navigation} />
                ))}

                {/* Start Attendance Banner */}
                <TouchableOpacity
                  style={styles.startBanner}
                  onPress={() => navigation.navigate('StartClass', { classItem: ongoing || upcoming[0] })}
                  activeOpacity={0.85}
                >
                  <View style={styles.startBannerLeft}>
                    <Camera size={26} color="#ffffff" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.startBannerTitle}>Start Face Attendance</Text>
                      <Text style={styles.startBannerSub}>Open camera to detect students</Text>
                    </View>
                  </View>
                  <ChevronRight size={26} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TeacherBottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flex: 1, paddingHorizontal: 18, paddingTop: 16 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#d0d7f5', justifyContent: 'center',
    alignItems: 'center', position: 'relative',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: BLUE },
  onlineIndicator: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#27ae60', borderWidth: 2, borderColor: '#f5f7fa',
  },
  roleLabel: { fontSize: 10, fontWeight: '800', color: BLUE, letterSpacing: 1 },
  nameText: { fontSize: 16, fontWeight: '800', color: '#1a1f36' },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  bellIcon: { fontSize: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 9, color: '#8a94a6', fontWeight: '600', textAlign: 'center' },

  // Section Header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1a1f36' },
  seeAll: { fontSize: 13, color: BLUE, fontWeight: '600' },

  // Ongoing Card
  ongoingCard: {
    backgroundColor: BLUE, borderRadius: 20, padding: 20,
    marginBottom: 14,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  ongoingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  ongoingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  ongoingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  ongoingBadgeText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },
  moreIcon: { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
  ongoingSubject: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  ongoingCode: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  ongoingDetails: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  ongoingDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ongoingDetailIcon: { fontSize: 13 },
  ongoingDetailText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  ongoingBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Avatar Cluster
  avatarCluster: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: BLUE,
  },
  miniAvatarText: { fontSize: 8, fontWeight: '800', color: '#1a1f36' },
  miniAvatarCount: { backgroundColor: 'rgba(255,255,255,0.25)' },
  miniAvatarCountText: { fontSize: 8, fontWeight: '800', color: '#ffffff' },

  viewBtn: {
    backgroundColor: '#ffffff', borderRadius: 20,
    paddingHorizontal: 22, paddingVertical: 9,
  },
  viewBtnText: { fontSize: 13, color: BLUE, fontWeight: '800' },

  // Upcoming Card
  upcomingCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  upcomingDate: {
    width: 46, height: 52, borderRadius: 12,
    backgroundColor: '#eef2ff', justifyContent: 'center',
    alignItems: 'center', marginRight: 14,
  },
  upcomingMonth: { fontSize: 9, fontWeight: '800', color: BLUE, letterSpacing: 0.5 },
  upcomingDay: { fontSize: 20, fontWeight: '800', color: BLUE },
  upcomingInfo: { flex: 1 },
  upcomingSubject: { fontSize: 15, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  upcomingCode: { fontSize: 11, color: '#8a94a6', marginBottom: 6 },
  upcomingDetails: { flexDirection: 'row', gap: 12 },
  upcomingDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  upcomingDetailIcon: { fontSize: 11 },
  upcomingDetailText: { fontSize: 11, color: '#6b7280' },
  startBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center',
  },
  startBtnText: { fontSize: 12, color: BLUE },

  // Start Banner
  startBanner: {
    backgroundColor: '#1a1f36', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },
  startBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  startBannerIcon: { fontSize: 26 },
  startBannerTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff', marginBottom: 2 },
  startBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  startBannerArrow: { fontSize: 26, color: 'rgba(255,255,255,0.5)', fontWeight: '300' },
});