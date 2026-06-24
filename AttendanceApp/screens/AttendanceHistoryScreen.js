import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { BookOpen, Clock, ChevronLeft, Inbox } from 'lucide-react-native';

const BLUE = '#2952e3';

function StatusBadge({ status }) {
  const lower = (status || '').toLowerCase();
  const isPresent = lower === 'present';
  const isPartial = lower === 'partial';
  const badgeStyle = isPresent
    ? styles.badgePresent
    : isPartial
    ? styles.badgePartial
    : styles.badgeAbsent;
  const textStyle = isPresent
    ? styles.badgeTextPresent
    : isPartial
    ? styles.badgeTextPartial
    : styles.badgeTextAbsent;

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{status}</Text>
    </View>
  );
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function AttendanceItem({ item }) {
  return (
    <View style={styles.itemCard}>
      <View style={[styles.itemIcon, { backgroundColor: '#eef2ff' }]}>
        <BookOpen size={16} color={BLUE} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemSubject}>{item.class_name}</Text>
        <Text style={styles.itemTime}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.itemRight}>
        <StatusBadge status={item.status} />
        <View style={styles.durationRow}>
          <Clock size={10} color="#8a94a6" />
          <Text style={styles.durationText}>{formatDuration(item.total_duration_seconds)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AttendanceHistoryScreen({ navigation }) {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(API.attendanceHistory, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(data);
      } else {
        const message = (res.status === 404 && data.error?.toLowerCase().includes('student profile'))
          ? 'Your student profile is incomplete. Please contact your administrator.'
          : data.error || 'Failed to load attendance history';
        Alert.alert('Error', message);
      }
    } catch (e) {
      console.log('Error fetching history:', e);
      Alert.alert('Error', 'Network error while fetching attendance history');
    } finally {
      setLoading(false);
    }
  };

  const presentCount = records.filter(r => r.status === 'Present').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;
  const partialCount = records.filter(r => r.status === 'Partial').length;

  const stats = [
    { label: 'TOTAL', value: `${records.length}`, color: BLUE },
    { label: 'PRESENT', value: `${presentCount}`, color: '#27ae60' },
    { label: 'ABSENT', value: `${absentCount}`, color: '#e74c3c' },
    { label: 'PARTIAL', value: `${partialCount}`, color: '#f39c12' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              {stats.map((stat, i) => (
                <View key={i} style={styles.statCard}>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Records */}
            {records.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={{ marginBottom: 16 }}>
                  <Inbox size={48} color="#8a94a6" />
                </View>
                <Text style={styles.emptyTitle}>No Records Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your attendance records will appear here once sessions are completed.
                </Text>
              </View>
            ) : (
              records.map((item, i) => (
                <AttendanceItem key={item.session_id || i} item={item} />
              ))
            )}
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="History" />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#f5f7fa',
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#1a1f36',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1f36',
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 9,
    color: '#8a94a6',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Item Card
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
  },
  itemSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    color: '#8a94a6',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },

  // Badge
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgePresent: {
    backgroundColor: '#edfaf3',
  },
  badgeAbsent: {
    backgroundColor: '#fff0f0',
  },
  badgePartial: {
    backgroundColor: '#fff8e6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPresent: {
    color: '#27ae60',
  },
  badgeTextAbsent: {
    color: '#e74c3c',
  },
  badgeTextPartial: {
    color: '#f39c12',
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clockIcon: {
    fontSize: 10,
  },
  durationText: {
    fontSize: 11,
    color: '#8a94a6',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8a94a6',
    textAlign: 'center',
    lineHeight: 20,
  },
});