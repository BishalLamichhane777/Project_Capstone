import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  StatusBar, ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Bell, BellOff, AlertTriangle,
  ClipboardList, Megaphone, Info, X,
} from 'lucide-react-native';
import { API } from '../api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2952e3';

// ─── Type config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  Absent:  { icon: AlertTriangle, bg: '#fff8e6', color: '#f39c12', label: 'Absence Alert'  },
  Waiver:  { icon: ClipboardList, bg: '#eef2ff', color: BLUE,      label: 'Waiver Update'  },
  General: { icon: Megaphone,     bg: '#edfaf3', color: '#27ae60', label: 'Announcement'   },
  default: { icon: Info,          bg: '#f0f2f5', color: '#8a94a6', label: 'Notification'   },
};
function typeConfig(type) { return TYPE_CONFIG[type] || TYPE_CONFIG.default; }

// ─── Timestamp helpers ────────────────────────────────────────────────────────
function formatRelative(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now  = new Date();
  const diff = now - date;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  // same calendar day?
  if (
    date.getDate()     === now.getDate()   &&
    date.getMonth()    === now.getMonth()  &&
    date.getFullYear() === now.getFullYear()
  ) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate()     === yesterday.getDate()   &&
    date.getMonth()    === yesterday.getMonth()  &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFull(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function NotifModal({ notif, onClose, isDarkMode }) {
  if (!notif) return null;
  const cfg  = typeConfig(notif.type);
  const Icon = cfg.icon;
  const sheetBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textMuted = isDarkMode ? '#8a94b8' : '#aab0be';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: sheetBg }]}>
        <View style={styles.modalHeader}>
          <View style={[styles.modalIconBox, { backgroundColor: cfg.bg }]}>
            <Icon size={22} color={cfg.color} />
          </View>
          <Text style={[styles.modalType, { color: cfg.color }]}>{cfg.label}</Text>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <X size={20} color="#8a94a6" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalMessage, { color: textPri }]}>{notif.message}</Text>
        </ScrollView>
        <Text style={[styles.modalTime, { color: textMuted }]}>{formatFull(notif.sent_at)}</Text>
        <TouchableOpacity style={styles.modalDismissBtn} onPress={onClose}>
          <Text style={styles.modalDismissText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────
function NotifItem({ item, onView, isDarkMode }) {
  const cfg  = typeConfig(item.type);
  const Icon = cfg.icon;
  const cardBg   = isDarkMode ? (item.is_read ? '#1a1f2e' : '#1e2440') : (item.is_read ? '#ffffff' : '#fafbff');
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textMuted = isDarkMode ? '#8a94b8' : '#aab0be';
  return (
    <View style={[styles.item, { backgroundColor: cardBg }, !item.is_read && { borderLeftWidth: 3, borderLeftColor: BLUE }]}>
      <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
        <Icon size={20} color={cfg.color} />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <Text style={[styles.itemType, { color: cfg.color }]}>{cfg.label}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={[styles.itemMessage, { color: textPri }]} numberOfLines={2} ellipsizeMode="tail">
          {item.message}
        </Text>
        <Text style={[styles.itemTime, { color: textMuted }]}>{formatRelative(item.sent_at)}</Text>
      </View>
      <TouchableOpacity style={[styles.viewBtn, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]} onPress={() => onView(item)} activeOpacity={0.8}>
        <Text style={styles.viewBtnText}>View</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState(null);
  const [selected,      setSelected]      = useState(null); // notification shown in modal

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Fetch notifications — does NOT auto-mark-read
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await fetch(API.myNotifications, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load notifications. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchNotifications(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(true); };

  // Mark a single notification as read, update local state immediately
  const markOneRead = useCallback(async (notif) => {
    if (notif.is_read) return;
    try {
      await fetch(API.markNotificationsRead, {
        method:  'PUT',
        headers: authHeaders,
        body:    JSON.stringify({ notification_id: notif.notif_id }),
      });
      // Optimistic local update — no need to re-fetch the full list
      setNotifications(prev =>
        prev.map(n => n.notif_id === notif.notif_id ? { ...n, is_read: true } : n)
      );
    } catch { /* non-blocking */ }
  }, [token]);

  // Open modal + mark read
  const handleView = useCallback((notif) => {
    setSelected(notif);
    markOneRead(notif);
  }, [markOneRead]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#1a1f2e' : '#ffffff'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={isDarkMode ? '#ffffff' : '#1a1f36'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* List / states */}
      {loading ? (
        <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <BellOff size={52} color="#d0d7e3" />
          <Text style={[styles.emptyTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Something went wrong</Text>
          <Text style={[styles.emptySub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{error}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Bell size={52} color="#d0d7e3" />
          <Text style={[styles.emptyTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>You're all caught up</Text>
          <Text style={[styles.emptySub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
            No notifications yet. We'll let you know when something comes in.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.notif_id)}
          renderItem={({ item }) => <NotifItem item={item} onView={handleView} isDarkMode={isDarkMode} />}
          contentContainerStyle={[styles.list, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
          }
        />
      )}

      {/* Detail modal */}
      <NotifModal notif={selected} onClose={() => setSelected(null)} isDarkMode={isDarkMode} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eef1f5',
  },
  backBtn:      { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: '#1a1f36' },
  headerBadge:  { backgroundColor: BLUE, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  headerBadgeText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },

  // ── List
  list: { paddingVertical: 10, paddingHorizontal: 16 },

  // ── Row
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    padding: 14, marginVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  itemUnread: {
    backgroundColor: '#fafbff',
    borderLeftWidth: 3, borderLeftColor: BLUE,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  itemBody:   { flex: 1, marginRight: 10 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  itemType:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  unreadDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: BLUE },
  itemMessage:{ fontSize: 13, color: '#1a1f36', lineHeight: 18, marginBottom: 5 },
  itemTime:   { fontSize: 11, color: '#aab0be' },

  viewBtn: {
    backgroundColor: '#eef2ff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0,
  },
  viewBtnText: { fontSize: 12, color: BLUE, fontWeight: '700' },

  // ── Empty state
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, marginTop: -40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1a1f36', marginTop: 18, marginBottom: 8 },
  emptySub:   { fontSize: 13, color: '#8a94a6', textAlign: 'center', lineHeight: 20 },

  // ── Modal overlay + sheet
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10,
  },
  modalIconBox: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  modalType:  { flex: 1, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalClose: { padding: 4 },
  modalBody:  { marginBottom: 16 },
  modalMessage: { fontSize: 15, color: '#1a1f36', lineHeight: 23 },
  modalTime:  { fontSize: 12, color: '#aab0be', marginBottom: 20 },
  modalDismissBtn: {
    backgroundColor: BLUE, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalDismissText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
});
