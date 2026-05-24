import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert,
} from 'react-native';
import AdminBottomNav from '../components/AdminBottomNav';

const BLUE = '#2952e3';
const GOLD = '#b07d00';

const allWaivers = [
  {
    id: 'W-001',
    name: 'Shreya Pandey',
    initials: 'SP',
    type: 'Medical Waiver',
    typeColor: '#27ae60',
    typeBg: '#edfaf3',
    subject: 'Intro to Psychology - PSY101',
    time: '2h ago',
    reason: 'I was hospitalized for acute appendicitis on the day of the exam. Attached is the hospital discharge summary.',
    file: 'View Medical_Report_SJ.pdf',
    category: 'Medical',
  },
  {
    id: 'W-002',
    name: 'Sabin Rai',
    initials: 'SR',
    type: 'Family Emergency',
    typeColor: '#e67e22',
    typeBg: '#fff4e6',
    subject: 'Advanced Calculus - MAT202',
    time: '5h ago',
    reason: 'Had to travel urgently due to a family bereavement. Missed the lab session on Tuesday.',
    file: 'View Travel_Ticket.pdf',
    category: 'Family Emergency',
  },
  {
    id: 'W-003',
    name: 'Lila Lama',
    initials: 'LL',
    type: 'School Event',
    typeColor: '#2980b9',
    typeBg: '#e8f4ff',
    subject: 'History of Art - ART104',
    time: '1d ago',
    reason: 'Representing the university at the National Debate Championship finals.',
    file: 'View Event_Letter.pdf',
    category: 'Medical',
  },
  {
    id: 'W-004',
    name: 'Bikash Gurung',
    initials: 'BG',
    type: 'Medical Waiver',
    typeColor: '#27ae60',
    typeBg: '#edfaf3',
    subject: 'Database Systems - CS301',
    time: '2d ago',
    reason: 'Diagnosed with dengue fever. Doctor advised complete bed rest for one week.',
    file: 'View Doctor_Note.pdf',
    category: 'Medical',
  },
  {
    id: 'W-005',
    name: 'Anita Karki',
    initials: 'AK',
    type: 'Family Emergency',
    typeColor: '#e67e22',
    typeBg: '#fff4e6',
    subject: 'Networks - CS401',
    time: '3d ago',
    reason: 'Sister\'s wedding ceremony. Had to travel to home district for the occasion.',
    file: 'View Marriage_Card.pdf',
    category: 'Family Emergency',
  },
];

const filterTabs = ['All Appeals', 'Medical', 'Family Emergency'];

function WaiverCard({ waiver, onApprove, onReject }) {
  return (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{waiver.initials}</Text>
        </View>
        <View style={styles.cardTopInfo}>
          <Text style={styles.studentName}>{waiver.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: waiver.typeBg }]}>
            <Text style={[styles.typeText, { color: waiver.typeColor }]}>{waiver.type}</Text>
          </View>
          <Text style={styles.subjectText}>{waiver.subject}</Text>
        </View>
        <Text style={styles.timeText}>{waiver.time}</Text>
      </View>

      {/* Reason */}
      <Text style={styles.reasonText}>"{waiver.reason}"</Text>

      {/* File */}
      <TouchableOpacity style={styles.fileRow}>
        <Text style={styles.fileIcon}>📄</Text>
        <Text style={styles.fileText}>{waiver.file}</Text>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => onReject(waiver)}
          activeOpacity={0.8}
        >
          <Text style={styles.rejectIcon}>✕</Text>
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => onApprove(waiver)}
          activeOpacity={0.8}
        >
          <Text style={styles.approveIcon}>✓</Text>
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminWaiversScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All Appeals');
  const [waivers, setWaivers] = useState(allWaivers);

  const filtered = activeFilter === 'All Appeals'
    ? waivers
    : waivers.filter(w => w.category === activeFilter);

  const handleApprove = (waiver) => {
    Alert.alert(
      'Approve Waiver',
      `Approve waiver for ${waiver.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            setWaivers(prev => prev.filter(w => w.id !== waiver.id));
            Alert.alert('✅ Approved', `${waiver.name}'s waiver has been approved.`);
          },
        },
      ]
    );
  };

  const handleReject = (waiver) => {
    Alert.alert(
      'Reject Waiver',
      `Reject waiver for ${waiver.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            setWaivers(prev => prev.filter(w => w.id !== waiver.id));
            Alert.alert('❌ Rejected', `${waiver.name}'s waiver has been rejected.`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waiver Review Panel</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>{filtered.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeFilter === tab && styles.tabBtnActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.tabText, activeFilter === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>No pending waivers!</Text>
          </View>
        ) : (
          filtered.map((waiver) => (
            <WaiverCard
              key={waiver.id}
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

  // Header
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

  // Filter Tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    paddingHorizontal: 16, paddingVertical: 10,
    gap: 8, borderBottomWidth: 1, borderBottomColor: '#eef1f5',
  },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#f0f2f8',
  },
  tabBtnActive: { backgroundColor: BLUE },
  tabText: { fontSize: 12, color: '#8a94a6', fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },

  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  // Card
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
  typeBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '700' },
  subjectText: { fontSize: 12, color: '#8a94a6' },
  timeText: { fontSize: 11, color: '#aab0be' },

  // Reason
  reasonText: {
    fontSize: 13, color: '#3a4a6a', lineHeight: 20,
    fontStyle: 'italic', marginBottom: 12,
    backgroundColor: '#f8f9ff', borderRadius: 10,
    padding: 12,
  },

  // File
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 14, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#f0f4ff', borderRadius: 10,
  },
  fileIcon: { fontSize: 14 },
  fileText: { fontSize: 13, color: BLUE, fontWeight: '600' },

  // Action Buttons
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

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#8a94a6', fontWeight: '600' },
});