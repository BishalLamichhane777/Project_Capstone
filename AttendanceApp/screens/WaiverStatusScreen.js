import React, { useState, useEffect } from 'react';
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
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { Calendar, ChevronLeft, FolderOpen } from 'lucide-react-native';

const BLUE = '#2952e3';

const statusConfig = {
  'Approved': {
    bg: '#edfaf3',
    text: '#27ae60',
    borderColor: '#27ae60',
    feedbackBorder: '#27ae60',
    feedbackText: 'Medical certificate verified. Stay safe!',
  },
  'Pending': {
    bg: '#fff8e6',
    text: '#f39c12',
    borderColor: '#f39c12',
    feedbackBorder: '#f39c12',
    feedbackText: 'Your request is currently being processed by the faculty office.',
  },
  'Rejected': {
    bg: '#fff0f0',
    text: '#e74c3c',
    borderColor: '#e74c3c',
    feedbackBorder: '#e74c3c',
    feedbackText: 'The submitted document is not a valid medical excuse or insufficient reason provided.',
  },
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig['Pending'];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{status}</Text>
    </View>
  );
}

function WaiverCard({ waiver }) {
  const config = statusConfig[waiver.status] || statusConfig['Pending'];
  const isPending = waiver.status === 'Pending';
  
  // Format Date
  const dateStr = waiver.session_date 
    ? new Date(waiver.session_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Unknown Date';

  return (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={styles.cardTopRow}>
        <StatusBadge status={waiver.status} />
        <Text style={styles.waiverID}>ID: #W-{waiver.request_id}</Text>
      </View>

      {/* Subject */}
      <Text style={styles.subjectText}>{waiver.class_name}</Text>

      {/* Absence Date */}
      <View style={styles.dateRow}>
        <Calendar size={13} color="#8a94a6" />
        <Text style={styles.dateText}>Absence Date: {dateStr}</Text>
      </View>
      
      {/* Reason Box */}
      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>YOUR REASON</Text>
        <Text style={styles.reasonText}>"{waiver.reason}"</Text>
      </View>

      {/* Feedback Box */}
      <View style={[
        styles.feedbackBox,
        { borderLeftColor: config.feedbackBorder },
        isPending && styles.feedbackBoxPending,
      ]}>
        {!isPending && (
          <Text style={styles.feedbackLabel}>ADMIN FEEDBACK</Text>
        )}
        <Text style={[
          styles.feedbackText,
          isPending && { color: config.text },
        ]}>
          {isPending ? config.feedbackText : `"${config.feedbackText}"`}
        </Text>
      </View>

    </View>
  );
}

export default function WaiverStatusScreen({ navigation }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('My Requests');
  const tabs = ['Active', 'My Requests', 'Archived'];
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchExcuses();
    }
  }, [token]);

  const fetchExcuses = async () => {
    setLoading(true);
    try {
      const res = await fetch(API.myExcuses, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setWaivers(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to load waiver history');
      }
    } catch (e) {
      console.log('Fetch error:', e);
      Alert.alert('Error', 'Network error while loading waiver history');
    } finally {
      setLoading(false);
    }
  };

  const filteredWaivers = activeTab === 'My Requests' 
    ? waivers 
    : activeTab === 'Active' 
      ? waivers.filter(w => w.status === 'Pending')
      : waivers.filter(w => w.status !== 'Pending');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waiver Status</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab Row */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabButton}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : filteredWaivers.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={{ marginBottom: 16 }}>
              <FolderOpen size={48} color="#8a94a6" />
            </View>
            <Text style={styles.emptyTitle}>No Requests</Text>
            <Text style={styles.emptySubtitle}>You have no waivers in this category.</Text>
          </View>
        ) : (
          filteredWaivers.map((waiver, index) => (
            <WaiverCard key={waiver.request_id || index} waiver={waiver} />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Home" />
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
    backgroundColor: '#ffffff',
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

  // Tab Row
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    color: '#8a94a6',
    fontWeight: '500',
  },
  tabTextActive: {
    color: BLUE,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: BLUE,
    borderRadius: 2,
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  // Badge
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  waiverID: {
    fontSize: 12,
    color: '#8a94a6',
    fontWeight: '500',
  },

  subjectText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1f36',
    marginBottom: 8,
  },

  // Date Row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  calendarIcon: {
    fontSize: 13,
  },
  dateText: {
    fontSize: 13,
    color: '#8a94a6',
  },
  
  // Reason Box
  reasonBox: {
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8a94a6',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#1a1f36',
    fontStyle: 'italic',
  },

  // Feedback Box
  feedbackBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    marginBottom: 4,
  },
  feedbackBoxPending: {
    backgroundColor: '#fff8e6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8a94a6',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  feedbackText: {
    fontSize: 13,
    color: '#3a4a6a',
    lineHeight: 19,
    flex: 1,
  },

  // Empty Box
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
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
  },
});