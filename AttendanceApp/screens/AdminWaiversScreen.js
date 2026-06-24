import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { X, Check, PartyPopper, ChevronLeft } from 'lucide-react-native';

const BLUE = '#2952e3';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length > 1 
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
}

function WaiverCard({ waiver, onApprove, onReject }) {
  const dateStr = waiver.session_date 
    ? new Date(waiver.session_date).toLocaleDateString()
    : 'Unknown Date';

  return (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(waiver.student_name)}</Text>
        </View>
        <View style={styles.cardTopInfo}>
          <Text style={styles.studentName}>{waiver.student_name || 'Unknown Student'}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>Request #{waiver.request_id}</Text>
          </View>
          <Text style={styles.subjectText}>{waiver.class_name}</Text>
        </View>
        <Text style={styles.timeText}>{dateStr}</Text>
      </View>

      {/* Reason */}
      <Text style={styles.reasonText}>"{waiver.reason}"</Text>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => onReject(waiver)}
          activeOpacity={0.8}
        >
          <X size={13} color="#e74c3c" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => onApprove(waiver)}
          activeOpacity={0.8}
        >
          <Check size={13} color="#ffffff" />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminWaiversScreen({ navigation }) {
  const { token } = useAuth();
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchPendingWaivers();
      }
    }, [token])
  );

  const fetchPendingWaivers = async () => {
    try {
      const res = await fetch(API.excusePending, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setWaivers(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch waivers');
      }
    } catch (e) {
      console.log('Fetch error:', e);
      Alert.alert('Error', 'Network error while loading waivers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingWaivers();
  };

  const decideWaiver = async (waiver, decision) => {
    try {
      const res = await fetch(`${API.excuseDecide}/${waiver.request_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaivers(prev => prev.filter(w => w.request_id !== waiver.request_id));
        Alert.alert(decision === 'Approved' ? '✅ Approved' : '❌ Rejected', 
          `${waiver.student_name || 'Student'}'s waiver has been ${decision.toLowerCase()}.`);
      } else {
        Alert.alert('Error', data.error || 'Failed to record decision');
      }
    } catch (e) {
      console.log('Error deciding waiver:', e);
      Alert.alert('Error', 'Network error while recording decision');
    }
  };

  const handleApprove = (waiver) => {
    Alert.alert(
      'Approve Waiver',
      `Approve waiver for ${waiver.student_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => decideWaiver(waiver, 'Approved') },
      ]
    );
  };

  const handleReject = (waiver) => {
    Alert.alert(
      'Reject Waiver',
      `Reject waiver for ${waiver.student_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => decideWaiver(waiver, 'Rejected') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waiver Review Panel</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>{waivers.length}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} tintColor={BLUE} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : waivers.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={{ marginBottom: 12 }}>
              <PartyPopper size={40} color="#8a94a6" />
            </View>
            <Text style={styles.emptyText}>No pending waivers!</Text>
          </View>
        ) : (
          waivers.map((waiver) => (
            <WaiverCard
              key={waiver.request_id}
              waiver={waiver}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Waivers" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#eef1f5',
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#1a1f36', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1f36' },
  pendingBadge: {
    backgroundColor: '#e74c3c', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pendingText: { fontSize: 12, color: '#ffffff', fontWeight: '800' },

  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#eef2ff', justifyContent: 'center',
    alignItems: 'center', marginRight: 10,
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: BLUE },
  cardTopInfo: { flex: 1, gap: 4 },
  studentName: { fontSize: 15, fontWeight: '800', color: '#1a1f36' },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: '#f0f2f8' },
  typeText: { fontSize: 11, fontWeight: '700', color: '#8a94a6' },
  subjectText: { fontSize: 12, color: '#8a94a6' },
  timeText: { fontSize: 11, color: '#aab0be' },

  reasonText: {
    fontSize: 13, color: '#3a4a6a', lineHeight: 20,
    fontStyle: 'italic', marginBottom: 12,
    backgroundColor: '#f8f9ff', borderRadius: 10,
    padding: 12,
  },

  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e74c3c',
    backgroundColor: '#fff0f0',
  },
  rejectIcon: { fontSize: 13, color: '#e74c3c', fontWeight: '800' },
  rejectText: { fontSize: 13, color: '#e74c3c', fontWeight: '700' },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#27ae60',
  },
  approveIcon: { fontSize: 13, color: '#ffffff', fontWeight: '800' },
  approveText: { fontSize: 13, color: '#ffffff', fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#8a94a6', fontWeight: '600' },
});