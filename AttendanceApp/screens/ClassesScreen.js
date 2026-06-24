import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { API } from '../api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, MapPin, User, Calendar } from 'lucide-react-native';

const BLUE = '#2952e3';

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns an array of 7 Date objects starting from today. */
function getNext7Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Formats a Date to a YYYY-MM-DD string in local time (no UTC shift). */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_NAMES  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats a time string "HH:MM:SS" → "09:00 AM" */
function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const ampm  = h >= 12 ? 'PM' : 'AM';
  const hour  = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Date Strip ───────────────────────────────────────────────────────────────

function DateStrip({ days, selected, onSelect }) {
  const scrollRef = useRef(null);
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateStripContent}
      style={styles.dateStrip}
    >
      {days.map((date, idx) => {
        const dateStr  = toLocalDateStr(date);
        const isActive = dateStr === selected;
        const isToday  = idx === 0;
        return (
          <TouchableOpacity
            key={dateStr}
            style={[styles.dateChip, isActive && styles.dateChipActive]}
            onPress={() => onSelect(dateStr)}
            activeOpacity={0.75}
          >
            <Text style={[styles.dateChipDay, isActive && styles.dateChipTextActive]}>
              {isToday ? 'Today' : DAY_NAMES[date.getDay()]}
            </Text>
            <Text style={[styles.dateChipNum, isActive && styles.dateChipTextActive]}>
              {date.getDate()}
            </Text>
            <Text style={[styles.dateChipMon, isActive && styles.dateChipTextActive]}>
              {MON_NAMES[date.getMonth()]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({ item, token, onStatusChange }) {
  const isOngoing = !!item.active_session_id;
  const [loading, setLoading]   = useState(false);
  const [status,  setStatus]    = useState('not_joined');

  useEffect(() => {
    if (isOngoing && token) fetchStatus();
  }, [isOngoing, token]);

  const fetchStatus = async () => {
    try {
      const res  = await fetch(
        `${API.attendanceStatus}?session_id=${item.active_session_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setStatus(data.status);
    } catch (e) {
      console.log('Error fetching status:', e);
    }
  };

  const handleAction = async (eventType) => {
    setLoading(true);
    try {
      const res  = await fetch(API.attendanceLog, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ session_id: item.active_session_id, event_type: eventType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log attendance');
      setStatus(eventType === 'ENTRY' ? 'joined' : 'left');
      Alert.alert('Success', `Successfully logged ${eventType}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Build time display from scheduled_time / scheduled_end_time
  const startFmt = formatTime(item.scheduled_time);
  const endFmt   = formatTime(item.scheduled_end_time);
  const timeLabel = startFmt
    ? (endFmt ? `${startFmt} – ${endFmt}` : startFmt)
    : 'TBA';

  return (
    <View style={[styles.classCard, isOngoing && styles.classCardOngoing]}>
      {isOngoing && (
        <View style={styles.ongoingBanner}>
          <View style={styles.ongoingDot} />
          <Text style={styles.ongoingText}>Ongoing</Text>
        </View>
      )}

      <View style={styles.cardRow}>
        {/* Icon */}
        <View style={[styles.classIcon, { backgroundColor: '#eef2ff' }]}>
          <BookOpen size={18} color={BLUE} />
        </View>

        {/* Info */}
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.subject}</Text>
          <Text style={styles.classCode}>{item.class_name}</Text>
          <View style={styles.detailsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MapPin size={11} color="#6b7280" style={{ marginRight: 2 }} />
              <Text style={styles.detailItem}>{item.room || 'TBD'}</Text>
            </View>
            <Text style={styles.detailDot}>·</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <User size={11} color="#6b7280" style={{ marginRight: 2 }} />
              <Text style={styles.detailItem}>{item.teacher_name || 'TBA'}</Text>
            </View>
          </View>
        </View>

        {/* Time block */}
        <View style={styles.timeBlock}>
          <Text style={[styles.timeText, isOngoing && styles.timeTextActive]}>
            {startFmt || 'TBA'}
          </Text>
          {endFmt && (
            <Text style={styles.timeEndText}>{endFmt}</Text>
          )}
          {item.duration_minutes > 0 && (
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{item.duration_minutes}m</Text>
            </View>
          )}
        </View>
      </View>

      {/* Join / Leave for ongoing sessions */}
      {isOngoing && (
        <View style={styles.actionContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={BLUE} style={{ padding: 10 }} />
          ) : status === 'not_joined' || status === 'left' ? (
            <TouchableOpacity style={styles.joinBtn} onPress={() => handleAction('ENTRY')}>
              <Text style={styles.joinBtnText}>Join Session</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.leaveBtn} onPress={() => handleAction('EXIT')}>
              <Text style={styles.leaveBtnText}>Leave Session</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClassesScreen({ navigation }) {
  const { token }                   = useAuth();
  const [classes,   setClasses]     = useState([]);
  const [loading,   setLoading]     = useState(true);
  const days                        = useRef(getNext7Days()).current;
  const [selected,  setSelected]    = useState(toLocalDateStr(days[0]));

  useEffect(() => {
    if (token) fetchClasses();
  }, [token]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res  = await fetch(API.studentClasses, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setClasses(data);
      } else {
        const message = (res.status === 404 && data.error?.toLowerCase().includes('student profile'))
          ? 'Your student profile is incomplete. Please contact your administrator.'
          : data.error || 'Failed to fetch classes';
        Alert.alert('Error', message);
      }
    } catch (e) {
      console.log('Error fetching classes:', e);
      Alert.alert('Error', 'Network error while fetching classes');
    } finally {
      setLoading(false);
    }
  };

  // Classes matching the selected date, or ongoing sessions (no date) shown on today only
  const filtered = classes.filter(c => {
    if (c.active_session_id) {
      // Ongoing sessions always appear on today
      return selected === toLocalDateStr(days[0]);
    }
    return c.scheduled_date === selected;
  });

  const ongoingFiltered  = filtered.filter(c =>  c.active_session_id);
  const scheduledFiltered = filtered.filter(c => !c.active_session_id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Classes</Text>
          <Text style={styles.headerSub}>
            {classes.length} enrolled · tap a date to filter
          </Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{classes.length} total</Text>
        </View>
      </View>

      {/* Date strip */}
      <DateStrip days={days} selected={selected} onSelect={setSelected} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
        ) : classes.length === 0 ? (
          /* No enrollments at all */
          <View style={styles.emptyBox}>
            <Calendar size={40} color="#c7cdd8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Enrollments Yet</Text>
            <Text style={styles.emptySub}>
              You are not enrolled in any classes yet.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          /* Enrolled but nothing on this date */
          <View style={styles.emptyBox}>
            <Calendar size={40} color="#c7cdd8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Classes on This Day</Text>
            <Text style={styles.emptySub}>
              No classes are scheduled for this date.
            </Text>
          </View>
        ) : (
          <>
            {/* Ongoing sessions */}
            {ongoingFiltered.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Ongoing Now</Text>
                  <Text style={styles.sectionCount}>{ongoingFiltered.length} active</Text>
                </View>
                {ongoingFiltered.map(item => (
                  <ClassCard key={item.class_id} item={item} token={token} />
                ))}
              </>
            )}

            {/* Scheduled classes for this date */}
            {scheduledFiltered.length > 0 && (
              <>
                <View style={[
                  styles.sectionHeader,
                  ongoingFiltered.length > 0 && { marginTop: 20 },
                ]}>
                  <View style={[styles.sectionDot, { backgroundColor: '#8a94a6' }]} />
                  <Text style={styles.sectionTitle}>Scheduled</Text>
                </View>
                {scheduledFiltered.map(item => (
                  <ClassCard key={item.class_id} item={item} token={token} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Classes" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a1f36' },
  headerSub:   { fontSize: 12, color: '#8a94a6', marginTop: 2 },
  totalBadge: {
    backgroundColor: '#eef2ff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  totalText: { fontSize: 13, color: BLUE, fontWeight: '700' },

  // Date strip
  dateStrip: { maxHeight: 80 },
  dateStripContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    gap: 2,
  },
  dateChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  dateChipDay: { fontSize: 10, color: '#8a94a6', fontWeight: '600' },
  dateChipNum: { fontSize: 17, color: '#1a1f36', fontWeight: '800' },
  dateChipMon: { fontSize: 9,  color: '#8a94a6', fontWeight: '500' },
  dateChipTextActive: { color: '#ffffff' },

  scroll: { flex: 1, paddingHorizontal: 18, paddingTop: 4 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, marginTop: 6, gap: 8,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1f36', flex: 1 },
  sectionCount: { fontSize: 12, color: '#8a94a6', fontWeight: '500' },

  // Class card
  classCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  classCardOngoing: { borderWidth: 1.5, borderColor: BLUE },
  ongoingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  ongoingDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#27ae60',
  },
  ongoingText: {
    fontSize: 11, color: '#27ae60', fontWeight: '700', letterSpacing: 0.5,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  classIcon: {
    width: 46, height: 46, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  classInfo: { flex: 1 },
  className: {
    fontSize: 14, fontWeight: '700', color: '#1a1f36', marginBottom: 2,
  },
  classCode: {
    fontSize: 11, color: '#8a94a6', fontWeight: '500', marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap',
  },
  detailItem: { fontSize: 11, color: '#6b7280' },
  detailDot:  { fontSize: 11, color: '#8a94a6' },

  // Time block
  timeBlock: { alignItems: 'flex-end', gap: 3 },
  timeText: { fontSize: 13, fontWeight: '700', color: '#1a1f36' },
  timeTextActive: { color: BLUE },
  timeEndText: { fontSize: 11, color: '#8a94a6' },
  durationPill: {
    backgroundColor: '#f0f2f8', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  durationText: { fontSize: 10, color: '#8a94a6', fontWeight: '600' },

  // Action container
  actionContainer: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#eef1f5',
    alignItems: 'stretch',
  },
  joinBtn: {
    backgroundColor: BLUE, paddingVertical: 12,
    borderRadius: 10, alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  leaveBtn: {
    backgroundColor: '#fff0f0', paddingVertical: 12,
    borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#fad4d4',
  },
  leaveBtnText: { color: '#e74c3c', fontWeight: '700', fontSize: 14 },

  // Empty states
  emptyBox: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#1a1f36', marginBottom: 6,
  },
  emptySub: {
    fontSize: 13, color: '#8a94a6', textAlign: 'center', lineHeight: 20,
  },
});
