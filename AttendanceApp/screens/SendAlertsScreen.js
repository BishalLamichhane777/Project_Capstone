import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert, TextInput,
} from 'react-native';
import AdminBottomNav from '../components/AdminBottomNav';
import { AlertTriangle, XCircle, ClipboardList, Megaphone, ChevronLeft, Check, Send } from 'lucide-react-native';

const BLUE = '#2952e3';
const GOLD = '#b07d00';

const alertTypes = [
  { key: 'attendance', icon: AlertTriangle, label: 'Low Attendance',   sub: 'Warn students below threshold', color: '#fff8e6', activeColor: '#f39c12' },
  { key: 'absence',    icon: XCircle, label: 'Absence Reminder',  sub: 'Remind about missed classes',   color: '#fff0f0', activeColor: '#e74c3c' },
  { key: 'waiver',     icon: ClipboardList, label: 'Waiver Update',     sub: 'Notify waiver status change',   color: '#eef2ff', activeColor: BLUE },
  { key: 'general',    icon: Megaphone, label: 'General Announcement', sub: 'Broadcast to all students',  color: '#edfaf3', activeColor: '#27ae60' },
];

const recipientGroups = [
  { key: 'all',      label: 'All Students',       count: '248' },
  { key: 'highrisk', label: 'High Risk Students',  count: '14' },
  { key: 'midrisk',  label: 'Mid Risk Students',   count: '23' },
  { key: 'class',    label: 'Specific Class',      count: null },
];

const recentAlerts = [
  { type: AlertTriangle, title: 'Low Attendance Warning',    recipients: '14 students', time: '2h ago',  color: '#fff8e6' },
  { type: Megaphone, title: 'Semester Exam Schedule',     recipients: 'All students', time: '1d ago',  color: '#edfaf3' },
  { type: XCircle, title: 'Absence Reminder — CS-301',  recipients: '8 students',  time: '3d ago',  color: '#fff0f0' },
];

export default function SendAlertsScreen({ navigation }) {
  const [selectedType,   setSelectedType]   = useState('attendance');
  const [selectedGroup,  setSelectedGroup]  = useState('all');
  const [subject,        setSubject]        = useState('');
  const [message,        setMessage]        = useState('');

  const activeType = alertTypes.find(t => t.key === selectedType);

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both subject and message.');
      return;
    }
    const group = recipientGroups.find(g => g.key === selectedGroup);
    Alert.alert(
      '✅ Alert Sent',
      `Your alert has been sent to ${group.label}.`,
      [{ text: 'OK', onPress: () => { setSubject(''); setMessage(''); } }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Alerts</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Alert Type */}
        <Text style={styles.sectionLabel}>ALERT TYPE</Text>
        <View style={styles.typeGrid}>
          {alertTypes.map(type => {
            const isActive = selectedType === type.key;
            return (
              <TouchableOpacity
                key={type.key}
                style={[styles.typeCard, { backgroundColor: type.color }, isActive && { borderColor: type.activeColor, borderWidth: 2 }]}
                onPress={() => setSelectedType(type.key)}
                activeOpacity={0.8}
              >
                <View style={{ marginBottom: 6 }}>
                  <type.icon size={22} color={isActive ? type.activeColor : '#1a1f36'} />
                </View>
                <Text style={[styles.typeLabel, isActive && { color: type.activeColor }]}>{type.label}</Text>
                <Text style={styles.typeSub}>{type.sub}</Text>
                {isActive && <View style={[styles.typeCheck, { backgroundColor: type.activeColor }]}>
                  <Check size={11} color="#ffffff" />
                </View>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recipients */}
        <Text style={styles.sectionLabel}>RECIPIENTS</Text>
        <View style={styles.card}>
          {recipientGroups.map((group, i) => (
            <TouchableOpacity
              key={group.key}
              style={[styles.recipientRow, i !== recipientGroups.length - 1 && styles.recipientBorder]}
              onPress={() => setSelectedGroup(group.key)}
            >
              <View style={[styles.radioOuter, selectedGroup === group.key && styles.radioOuterActive]}>
                {selectedGroup === group.key && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.recipientLabel}>{group.label}</Text>
              {group.count && (
                <View style={styles.recipientCount}>
                  <Text style={styles.recipientCountText}>{group.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Compose */}
        <Text style={styles.sectionLabel}>COMPOSE MESSAGE</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Low Attendance Warning"
              placeholderTextColor="#aab0be"
              value={subject}
              onChangeText={setSubject}
            />
          </View>
          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your message here..."
              placeholderTextColor="#aab0be"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Preview */}
        {(subject || message) ? (
          <View style={[styles.previewCard, { borderLeftColor: activeType?.activeColor }]}>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            {activeType && (
              <View style={{ marginBottom: 6 }}>
                <activeType.icon size={20} color={activeType.activeColor} />
              </View>
            )}
            <Text style={styles.previewSubject}>{subject || 'Subject...'}</Text>
            <Text style={styles.previewMessage}>{message || 'Message...'}</Text>
          </View>
        ) : null}

        {/* Send Button */}
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
          <Send size={18} color="#ffffff" />
          <Text style={styles.sendText}>Send Alert</Text>
        </TouchableOpacity>

        {/* Recent Alerts */}
        <Text style={styles.sectionLabel}>RECENTLY SENT</Text>
        <View style={styles.card}>
          {recentAlerts.map((alert, i) => (
            <View key={i} style={[styles.recentRow, i !== recentAlerts.length - 1 && styles.recentBorder]}>
              <View style={[styles.recentIcon, { backgroundColor: alert.color }]}>
                <alert.type size={18} color="#1a1f36" />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{alert.title}</Text>
                <Text style={styles.recentMeta}>{alert.recipients}</Text>
              </View>
              <Text style={styles.recentTime}>{alert.time}</Text>
            </View>
          ))}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eef1f5',
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#1a1f36', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1f36' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.8, marginBottom: 10, marginLeft: 2 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  typeCard: {
    width: '47%', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: 'transparent',
    position: 'relative',
  },
  typeIcon: { fontSize: 22, marginBottom: 6 },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#1a1f36', marginBottom: 3 },
  typeSub: { fontSize: 10, color: '#8a94a6', lineHeight: 14 },
  typeCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  typeCheckText: { fontSize: 11, color: '#ffffff', fontWeight: '800' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  recipientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  recipientBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#d0d9f5',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  radioOuterActive: { borderColor: BLUE },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: BLUE },
  recipientLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1f36' },
  recipientCount: { backgroundColor: '#eef2ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  recipientCountText: { fontSize: 11, color: BLUE, fontWeight: '700' },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.5, marginBottom: 7 },
  input: {
    backgroundColor: '#f8f9ff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e6e9f0', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1a1f36',
  },
  textArea: { minHeight: 110 },

  previewCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  previewLabel: { fontSize: 10, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.8, marginBottom: 8 },
  previewIcon: { fontSize: 20, marginBottom: 6 },
  previewSubject: { fontSize: 14, fontWeight: '700', color: '#1a1f36', marginBottom: 4 },
  previewMessage: { fontSize: 13, color: '#6b7280', lineHeight: 19 },

  sendBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginBottom: 24,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  sendIcon: { fontSize: 18 },
  sendText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },

  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  recentBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  recentIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recentIconText: { fontSize: 16 },
  recentInfo: { flex: 1 },
  recentTitle: { fontSize: 13, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  recentMeta: { fontSize: 11, color: '#8a94a6' },
  recentTime: { fontSize: 11, color: '#aab0be' },
});