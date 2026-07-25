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
import { Calendar, ChevronLeft, FolderOpen, Clock, AlertTriangle } from 'lucide-react-native';

const BLUE   = '#2952e3';
const ORANGE = '#f39c12';

// date helper — handles plain YYYY-MM-DD and ISO UTC strings
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatWaiverDate(iso) {
  if (!iso) return 'Unknown Date';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
  }
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

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

function WaiverCard({ waiver, isDarkMode }) {
  const config    = statusConfig[waiver.status] || statusConfig['Pending'];
  const isPending = waiver.status === 'Pending';
  const isPrior   = waiver.waiver_type === 'prior';
  const dateLabel = isPrior ? (
    waiver.end_date && waiver.end_date !== waiver.start_date ? 'Leave Period' : 'Target Date'
  ) : 'Absence Date';
  const dateStr   = isPrior
    ? (waiver.end_date && waiver.end_date !== waiver.start_date
        ? `${formatWaiverDate(waiver.start_date)} → ${formatWaiverDate(waiver.end_date)}`
        : formatWaiverDate(waiver.start_date || waiver.session_date))
    : formatWaiverDate(waiver.session_date);

  const cardBg           = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPrimary      = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub          = isDarkMode ? '#8a94b8' : '#8a94a6';
  const reasonLabelColor = isDarkMode ? '#5a6080' : '#8a94a6';
  const feedbackBg       = isDarkMode ? '#252b3e' : '#f9fafb';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Top row: status badge + ID + type badge */}
      <View style={styles.cardTopRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <StatusBadge status={waiver.status} />
          {/* Prior / Retroactive type badge */}
          <View style={[
            styles.typeBadge,
            isPrior
              ? { backgroundColor: isDarkMode ? '#2e2010' : '#fff8e6' }
              : { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }
          ]}>
            {isPrior
              ? <Clock size={10} color={ORANGE} style={{ marginRight: 3 }} />
              : <AlertTriangle size={10} color={textSub} style={{ marginRight: 3 }} />
            }
            <Text style={[styles.typeBadgeText, { color: isPrior ? ORANGE : textSub }]}>
              {isPrior ? 'Prior' : 'Retroactive'}
            </Text>
          </View>
        </View>
        <Text style={[styles.waiverID, { color: textSub }]}>#{waiver.request_id}</Text>
      </View>

      <Text style={[styles.subjectText, { color: textPrimary }]}>{waiver.class_name}</Text>

      <View style={styles.dateRow}>
        <Calendar size={13} color={textSub} />
        <Text style={[styles.dateText, { color: textSub }]}>{dateLabel}: {dateStr}</Text>
      </View>

      <View style={styles.reasonBox}>
        <Text style={[styles.reasonLabel, { color: reasonLabelColor }]}>YOUR REASON</Text>
        <Text style={[styles.reasonText, { color: textPrimary }]}>"{waiver.reason}"</Text>
      </View>

      <View style={[
        styles.feedbackBox,
        { backgroundColor: isPending ? '#fff8e6' : feedbackBg, borderLeftColor: config.feedbackBorder },
        isPending && styles.feedbackBoxPending,
      ]}>
        {!isPending && <Text style={[styles.feedbackLabel, { color: reasonLabelColor }]}>ADMIN FEEDBACK</Text>}
        <Text style={[
          styles.feedbackText,
          { color: isDarkMode ? '#a0b0d0' : '#3a4a6a' },
          isPending && { color: config.text },
        ]}>
          {isPending ? config.feedbackText : `"${config.feedbackText}"`}
        </Text>
      </View>
    </View>
  );
}

export default function WaiverStatusScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#1a1f2e' : '#ffffff'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={22} color={isDarkMode ? '#ffffff' : '#1a1f36'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Waiver Status</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab Row */}
      <View style={[styles.tabRow, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab} style={styles.tabButton} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }, activeTab === tab && [styles.tabTextActive]]}>
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
            <Text style={[styles.emptyTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>No Requests</Text>
            <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>You have no waivers in this category.</Text>
          </View>
        ) : (
          filteredWaivers.map((waiver, index) => (
            <WaiverCard key={waiver.request_id || index} waiver={waiver} isDarkMode={isDarkMode} />
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

  // Type badge (Prior / Retroactive)
  typeBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },

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