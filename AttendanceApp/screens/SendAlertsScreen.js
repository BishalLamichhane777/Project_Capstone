import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  Alert, TextInput, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import {
  AlertTriangle, XCircle, ClipboardList, Megaphone, ChevronLeft,
  Check, Send, Users, User, BookOpen, ChevronDown, Bell,
} from 'lucide-react-native';
import { API } from '../api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2952e3';

// ─── Target-type options ─────────────────────────────────────────────────
const TARGET_TYPES = [
  { key: 'all_students',      label: 'All Students',     icon: Users,      needsPicker: false },
  { key: 'all_teachers',      label: 'All Teachers',     icon: Users,      needsPicker: false },
  { key: 'specific_student',  label: 'Specific Student', icon: User,       needsPicker: true  },
  { key: 'specific_teacher',  label: 'Specific Teacher', icon: User,       needsPicker: true  },
  { key: 'batch',             label: 'Batch / Group',    icon: BookOpen,   needsPicker: true  },
];

// ─── Alert-type chips (cosmetic only) ────────────────────────────────────
const ALERT_TYPES = [
  { key: 'attendance', icon: AlertTriangle, label: 'Low Attendance',      color: '#fff8e6', activeColor: '#f39c12' },
  { key: 'absence',    icon: XCircle,       label: 'Absence Reminder',    color: '#fff0f0', activeColor: '#e74c3c' },
  { key: 'waiver',     icon: ClipboardList, label: 'Waiver Update',       color: '#eef2ff', activeColor: BLUE      },
  { key: 'general',    icon: Megaphone,     label: 'General',             color: '#edfaf3', activeColor: '#27ae60' },
];

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Picker Modal ────────────────────────────────────────────────────────
function PickerModal({ visible, title, items, onSelect, onClose, loading }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><XCircle size={22} color="#8a94a6" /></TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginVertical: 30 }} />
        ) : items.length === 0 ? (
          <Text style={styles.modalEmpty}>No options available</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => String(i.value)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
                <Text style={styles.modalItemText}>{item.label}</Text>
                <Text style={styles.modalItemSub}>{item.sub || ''}</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 320 }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────
export default function SendAlertsScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();

  // Form state
  const [alertType,   setAlertType]   = useState('general');
  const [targetType,  setTargetType]  = useState('all_students');
  const [targetId,    setTargetId]    = useState(null);
  const [targetLabel, setTargetLabel] = useState('');
  const [title,       setTitle]       = useState('');
  const [message,     setMessage]     = useState('');
  const [sending,     setSending]     = useState(false);

  // Picker modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerItems,   setPickerItems]   = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Recent notifications
  const [recents,        setRecents]        = useState([]);
  const [recentsLoading, setRecentsLoading] = useState(true);

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Fetch recent notifications on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API.adminNotifications, { headers: authHeaders });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setRecents(data.slice(0, 5));
      } catch (_) {}
      setRecentsLoading(false);
    })();
  }, []);

  // When target type changes, clear selection
  useEffect(() => {
    setTargetId(null);
    setTargetLabel('');
  }, [targetType]);

  const activeAlertType = ALERT_TYPES.find(t => t.key === alertType);
  const currentTarget   = TARGET_TYPES.find(t => t.key === targetType);

  // ── Open picker and load data ──────────────────────────────────────
  const openPicker = useCallback(async () => {
    setPickerItems([]);
    setPickerVisible(true);
    setPickerLoading(true);
    try {
      let url, items = [];
      if (targetType === 'specific_student') {
        url = API.adminStudentsList;
        const res  = await fetch(url, { headers: authHeaders });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          items = data.map(s => ({
            value: s.student_id,
            label: s.fullname || s.name || `Student #${s.student_id}`,
            sub:   s.roll_number || s.email || '',
          }));
        }
      } else if (targetType === 'specific_teacher') {
        url = API.adminTeachers;
        const res  = await fetch(url, { headers: authHeaders });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          items = data.map(u => ({
            value: u.id,
            label: u.fullname,
            sub:   u.email || '',
          }));
        }
      } else if (targetType === 'batch') {
        url = API.adminBatches;
        const res  = await fetch(url, { headers: authHeaders });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          items = data.map(b => ({
            value: b.batch_id,
            label: b.batch_name,
            sub:   `${b.student_count ?? 0} students`,
          }));
        }
      }
      setPickerItems(items);
    } catch (_) {
      setPickerItems([]);
    }
    setPickerLoading(false);
  }, [targetType, token]);

  const handlePickerSelect = (item) => {
    setTargetId(item.value);
    setTargetLabel(item.label);
    setPickerVisible(false);
  };

  // ── Send ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both title and message.');
      return;
    }
    if (currentTarget?.needsPicker && !targetId) {
      Alert.alert('Select Recipient', `Please select a ${currentTarget.label.toLowerCase()}.`);
      return;
    }
    setSending(true);
    try {
      const body = {
        title:       title.trim(),
        message:     message.trim(),
        target_type: targetType,
      };
      if (targetId) body.target_id = targetId;

      const res  = await fetch(API.adminSendNotification, {
        method:  'POST',
        headers: authHeaders,
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        Alert.alert(
          'Notification Sent',
          data.message || `Sent to ${data.recipients} recipient(s).`,
          [{ text: 'OK', onPress: () => { setTitle(''); setMessage(''); setTargetId(null); setTargetLabel(''); } }]
        );
        // Refresh recents
        try {
          const r2 = await fetch(API.adminNotifications, { headers: authHeaders });
          const d2 = await r2.json();
          if (r2.ok && Array.isArray(d2)) setRecents(d2.slice(0, 5));
        } catch (_) {}
      } else {
        Alert.alert('Error', data.error || 'Failed to send notification.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
    setSending(false);
  };

  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg = isDarkMode ? '#1a1f2e' : '#ffffff';
  const cardBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';
  const rowBrd   = isDarkMode ? '#252b3e' : '#f0f2f5';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={headerBg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPri }]}>Send Notification</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Alert Type chips */}
        <Text style={[styles.sectionLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>NOTIFICATION TYPE</Text>
        <View style={styles.typeGrid}>
          {ALERT_TYPES.map(type => {
            const isActive = alertType === type.key;
            return (
              <TouchableOpacity
                key={type.key}
                style={[styles.typeCard, { backgroundColor: type.color },
                        isActive && { borderColor: type.activeColor, borderWidth: 2 }]}
                onPress={() => setAlertType(type.key)}
                activeOpacity={0.8}
              >
                <View style={{ marginBottom: 6 }}>
                  <type.icon size={22} color={isActive ? type.activeColor : '#1a1f36'} />
                </View>
                <Text style={[styles.typeLabel, isActive && { color: type.activeColor }]}>
                  {type.label}
                </Text>
                {isActive && (
                  <View style={[styles.typeCheck, { backgroundColor: type.activeColor }]}>
                    <Check size={11} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Target audience */}
        <Text style={[styles.sectionLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>SEND TO</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {TARGET_TYPES.map((t, i) => {
            const isActive = targetType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.recipientRow, i !== TARGET_TYPES.length - 1 && [styles.recipientBorder, { borderBottomColor: rowBrd }]]}
                onPress={() => setTargetType(t.key)}
              >
                <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                  {isActive && <View style={styles.radioInner} />}
                </View>
                <t.icon size={16} color={isActive ? BLUE : '#8a94a6'} style={{ marginRight: 10 }} />
                <Text style={[styles.recipientLabel, { color: isActive ? BLUE : textPri }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Specific-target picker */}
        {currentTarget?.needsPicker && (
          <>
            <Text style={[styles.sectionLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>SELECT {currentTarget.label.toUpperCase()}</Text>
            <TouchableOpacity style={styles.pickerRow} onPress={openPicker} activeOpacity={0.85}>
              <Text style={[styles.pickerText, !targetLabel && { color: '#aab0be' }]}>
                {targetLabel || `Tap to select ${currentTarget.label}…`}
              </Text>
              <ChevronDown size={18} color="#8a94a6" />
            </TouchableOpacity>
          </>
        )}

        {/* Compose */}
        <Text style={[styles.sectionLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>COMPOSE</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textSub }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]}
              placeholder="e.g. Low Attendance Warning"
              placeholderTextColor="#aab0be"
              value={title}
              onChangeText={setTitle}
            />
          </View>
          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={[styles.fieldLabel, { color: textSub }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]}
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
        {(title || message) ? (
          <View style={[styles.previewCard, { borderLeftColor: activeAlertType?.activeColor }]}>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            {activeAlertType && (
              <View style={{ marginBottom: 6 }}>
                <activeAlertType.icon size={20} color={activeAlertType.activeColor} />
              </View>
            )}
            <Text style={styles.previewSubject}>{title || 'Title…'}</Text>
            <Text style={styles.previewMessage}>{message || 'Message…'}</Text>
            <Text style={styles.previewTo}>
              → {currentTarget?.label}{targetLabel ? ` · ${targetLabel}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendBtn, sending && { opacity: 0.7 }]}
          onPress={handleSend}
          activeOpacity={0.85}
          disabled={sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Send size={18} color="#ffffff" />}
          <Text style={styles.sendText}>{sending ? 'Sending…' : 'Send Notification'}</Text>
        </TouchableOpacity>

        {/* Recent Sent */}
        <Text style={[styles.sectionLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>RECENTLY SENT</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {recentsLoading ? (
            <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 16 }} />
          ) : recents.length === 0 ? (
            <Text style={styles.emptyText}>No notifications sent yet</Text>
          ) : (
            recents.map((n, i) => (
              <View key={n.notif_id} style={[styles.recentRow, i !== recents.length - 1 && styles.recentBorder]}>
                <View style={[styles.recentIcon, { backgroundColor: '#eef2ff' }]}>
                  <Bell size={18} color={BLUE} />
                </View>
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentTitle, { color: textPri }]} numberOfLines={1}>{n.message}</Text>
                  <Text style={[styles.recentMeta, { color: textSub }]}>{n.type}</Text>
                </View>
                <Text style={styles.recentTime}>{formatRelative(n.sent_at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Picker Modal */}
      <PickerModal
        visible={pickerVisible}
        title={`Select ${currentTarget?.label}`}
        items={pickerItems}
        onSelect={handlePickerSelect}
        onClose={() => setPickerVisible(false)}
        loading={pickerLoading}
      />

      <AdminBottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eef1f5',
  },
  backBtn:      { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: '#1a1f36' },
  scroll:       { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.8, marginBottom: 10, marginLeft: 2 },

  typeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  typeCard: {
    width: '47%', borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  typeCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  recipientRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  recipientBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#d0d9f5',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  radioOuterActive: { borderColor: BLUE },
  radioInner:       { width: 10, height: 10, borderRadius: 5, backgroundColor: BLUE },
  recipientLabel:   { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1f36' },

  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#e6e9f0', paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  pickerText: { fontSize: 14, color: '#1a1f36', flex: 1 },

  fieldGroup:  { marginBottom: 14 },
  fieldLabel:  { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.5, marginBottom: 7 },
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
  previewLabel:   { fontSize: 10, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.8, marginBottom: 8 },
  previewSubject: { fontSize: 14, fontWeight: '700', color: '#1a1f36', marginBottom: 4 },
  previewMessage: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 6 },
  previewTo:      { fontSize: 11, color: '#8a94a6', fontStyle: 'italic' },

  sendBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginBottom: 24,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  sendText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },

  recentRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  recentBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  recentIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recentInfo:   { flex: 1 },
  recentTitle:  { fontSize: 13, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  recentMeta:   { fontSize: 11, color: '#8a94a6' },
  recentTime:   { fontSize: 11, color: '#aab0be' },
  emptyText:    { textAlign: 'center', color: '#aab0be', fontSize: 13, paddingVertical: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 16, fontWeight: '800', color: '#1a1f36' },
  modalEmpty:  { textAlign: 'center', color: '#aab0be', paddingVertical: 30 },
  modalItem: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f2f5',
  },
  modalItemText: { fontSize: 14, fontWeight: '600', color: '#1a1f36' },
  modalItemSub:  { fontSize: 12, color: '#8a94a6', marginTop: 2 },
});
