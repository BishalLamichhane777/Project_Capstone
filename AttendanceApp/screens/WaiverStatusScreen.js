import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import BottomNav from '../components/BottomNav';

const BLUE = '#2952e3';

const waivers = [
  {
    id: '#W-8821',
    subject: 'Computer Science 101',
    absenceDate: 'Oct 12, 2023',
    status: 'Approved',
    feedback: 'Medical certificate verified. Stay safe!',
    feedbackType: 'admin',
  },
  {
    id: '#W-8845',
    subject: 'Advanced Mathematics II',
    absenceDate: 'Oct 20, 2023',
    status: 'Pending Review',
    feedback: 'Your request is currently being processed by the faculty office.',
    feedbackType: 'info',
  },
  {
    id: '#W-8799',
    subject: 'Introduction to Sociology',
    absenceDate: 'Oct 05, 2023',
    status: 'Rejected',
    feedback: 'The submitted document is not a valid medical excuse. Please resubmit with proper documentation.',
    feedbackType: 'admin',
  },
];

const statusConfig = {
  'Approved': {
    bg: '#edfaf3',
    text: '#27ae60',
    borderColor: '#27ae60',
    feedbackBorder: '#27ae60',
  },
  'Pending Review': {
    bg: '#fff8e6',
    text: '#f39c12',
    borderColor: '#f39c12',
    feedbackBorder: '#f39c12',
  },
  'Rejected': {
    bg: '#fff0f0',
    text: '#e74c3c',
    borderColor: '#e74c3c',
    feedbackBorder: '#e74c3c',
  },
};

function StatusBadge({ status }) {
  const config = statusConfig[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{status}</Text>
    </View>
  );
}

function WaiverCard({ waiver }) {
  const config = statusConfig[waiver.status];
  const isPending = waiver.status === 'Pending Review';

  return (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={styles.cardTopRow}>
        <StatusBadge status={waiver.status} />
        <Text style={styles.waiverID}>ID: {waiver.id}</Text>
      </View>

      {/* Subject */}
      <Text style={styles.subjectText}>{waiver.subject}</Text>

      {/* Absence Date */}
      <View style={styles.dateRow}>
        <Text style={styles.calendarIcon}>📅</Text>
        <Text style={styles.dateText}>Absence Date: {waiver.absenceDate}</Text>
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
          {isPending ? waiver.feedback : `"${waiver.feedback}"`}
        </Text>
        {isPending && (
          <View style={styles.pendingIconRow}>
            {/* clock icon placeholder */}
          </View>
        )}
      </View>

      {/* View Details */}
      <TouchableOpacity style={styles.viewDetailsButton}>
        <Text style={styles.viewDetailsText}>View Details  ›</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function WaiverStatusScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('My Requests');
  const tabs = ['Active', 'My Requests', 'Archived'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
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
        {waivers.map((waiver, index) => (
          <WaiverCard key={index} waiver={waiver} />
        ))}
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

  // Feedback Box
  feedbackBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    marginBottom: 14,
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

  // View Details
  viewDetailsButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  viewDetailsText: {
    fontSize: 13,
    color: BLUE,
    fontWeight: '600',
  },
});