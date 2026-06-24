import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import TeacherBottomNav from '../components/TeacherBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { BookOpen, Clock, MapPin, Users, Play, LayoutDashboard, AlertCircle, Umbrella } from 'lucide-react-native';

const BLUE = '#2952e3';

// ─── Helper: build the 7-day strip starting from today ───────────────────────
function buildWeekDays() {
  const today = new Date();
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      key: i === 0 ? 'Today' : dayNames[d.getDay()],
      label: i === 0 ? 'Today' : dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
      dayIndex: d.getDay(),
      isToday: i === 0,
    });
  }
  return days;
}

const WEEK_DAYS = buildWeekDays();

const CLASS_COLORS = [
  { accent: '#2952e3', light: '#eef2ff' }, // Blue
  { accent: '#7c3aed', light: '#f3eeff' }, // Purple
  { accent: '#e67e22', light: '#fff4e6' }, // Orange
  { accent: '#27ae60', light: '#edfaf3' }, // Green
  { accent: '#e74c3c', light: '#fff0f0' }, // Red
  { accent: '#8e44ad', light: '#f5eef8' }, // Dark Purple
  { accent: '#2980b9', light: '#ebf5fb' }, // Dark Blue
];

function formatClassTime(scheduleTimeStr, durationMinutes) {
  if (!scheduleTimeStr) return 'TBD';
  try {
    const startTime = new Date(scheduleTimeStr);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    
    const formatTimeStr = (date) => {
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    };
    
    return `${formatTimeStr(startTime)} – ${formatTimeStr(endTime)}`;
  } catch (err) {
    return 'TBD';
  }
}

/**
 * Build the human-readable time string for a class card.
 *
 * Priority:
 *   1. New fields: scheduled_date + scheduled_time [+ scheduled_end_time]
 *   2. Legacy field: schedule_time + duration_minutes
 *   3. Fallback: "TBD"
 *
 * Format: "Jun 14, 2026 • 09:00 AM – 10:30 AM"
 * If end time not set: "Jun 14, 2026 • 09:00 AM"
 */
function buildTimeLabel(cls) {
  // ── 1. New fine-grained fields ────────────────────────────────────
  if (cls.scheduled_date && cls.scheduled_time) {
    try {
      // scheduled_date = "YYYY-MM-DD", scheduled_time = "HH:MM:SS"
      const dateStr = cls.scheduled_date;            // e.g. "2026-06-14"
      const timeStr = cls.scheduled_time.slice(0, 5); // e.g. "09:00"

      // Parse the date for a pretty label
      const [year, month, day] = dateStr.split('-').map(Number);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun',
                          'Jul','Aug','Sep','Oct','Nov','Dec'];
      const datePart = `${monthNames[month - 1]} ${day}, ${year}`;

      // Format start time
      const [sh, sm] = timeStr.split(':').map(Number);
      const startAmpm = sh >= 12 ? 'PM' : 'AM';
      const startH = sh % 12 || 12;
      const startLabel = `${startH}:${String(sm).padStart(2, '0')} ${startAmpm}`;

      if (cls.scheduled_end_time) {
        const endStr = cls.scheduled_end_time.slice(0, 5);
        const [eh, em] = endStr.split(':').map(Number);
        const endAmpm = eh >= 12 ? 'PM' : 'AM';
        const endH = eh % 12 || 12;
        const endLabel = `${endH}:${String(em).padStart(2, '0')} ${endAmpm}`;
        return `${datePart} • ${startLabel} – ${endLabel}`;
      }
      return `${datePart} • ${startLabel}`;
    } catch (_) {
      // fall through to legacy
    }
  }

  // ── 2. Legacy schedule_time + duration_minutes ────────────────────
  if (cls.schedule_time) {
    try {
      const startTime = new Date(cls.schedule_time);
      const endTime = new Date(startTime.getTime() + (cls.duration_minutes || 0) * 60000);
      const fmt = (d) => {
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ap}`;
      };
      return `${fmt(startTime)} – ${fmt(endTime)}`;
    } catch (_) {}
  }

  return 'TBD';
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isOngoing = status === 'ongoing';
  return (
    <View style={[styles.badge, isOngoing ? styles.badgeOngoing : styles.badgeUpcoming]}>
      {isOngoing && <View style={styles.badgeDot} />}
      <Text style={[styles.badgeText, isOngoing ? styles.badgeTextOngoing : styles.badgeTextUpcoming]}>
        {isOngoing ? 'Live' : 'Upcoming'}
      </Text>
    </View>
  );
}

// ─── Schedule badge ───────────────────────────────────────────────────────────
function ScheduleBadge({ scheduleStatus, scheduledTime, scheduledDate }) {
  // Build a concise time string for "Starts HH:MM" labels
  const timeShort = scheduledTime ? scheduledTime.slice(0, 5) : null;

  const configs = {
    ongoing:     { label: 'Live Now',      bg: '#e8faf1', text: '#27ae60', dot: true  },
    ready:       { label: 'Live Now',      bg: '#e8faf1', text: '#27ae60', dot: true  },
    not_started: { label: 'Starting Soon', bg: '#fffbeb', text: '#d97706', dot: false },
    future_date: { label: 'Upcoming',      bg: '#eef2ff', text: '#2952e3', dot: false },
    ended_today: { label: 'Ended Today',   bg: '#f0f2f8', text: '#8a94a6', dot: false },
    ended:       { label: 'Ended',         bg: '#f0f2f8', text: '#8a94a6', dot: false },
    unscheduled: { label: 'TBD',           bg: '#f0f2f8', text: '#aab0be', dot: false },
  };
  const cfg = configs[scheduleStatus] || configs.unscheduled;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      {cfg.dot && <View style={[styles.badgeDot, { backgroundColor: cfg.text }]} />}
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────
function ClassCard({ item, navigation }) {
  const isOngoing = item.status === 'ongoing';
  const schedStatus = item.schedule_status || (item.active_session_id ? 'ongoing' : 'unscheduled');
  const canStart = schedStatus === 'ready' || schedStatus === 'ongoing';

  return (
    <View style={[
      styles.card,
      isOngoing && { borderLeftWidth: 4, borderLeftColor: item.accent },
    ]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardDot, { backgroundColor: item.light }]}>
          <BookOpen size={16} color={item.accent} />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardSubject}>{item.subject}</Text>
          <Text style={styles.cardCode}>{item.code}</Text>
        </View>

        <ScheduleBadge
          scheduleStatus={schedStatus}
          scheduledTime={item.scheduled_time}
          scheduledDate={item.scheduled_date}
        />
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Clock size={12} color="#6b7280" />
          <Text style={styles.metaText}>{item.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <MapPin size={12} color="#6b7280" />
          <Text style={styles.metaText}>{item.room}</Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={12} color="#6b7280" />
          <Text style={styles.metaText}>{item.students} students</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: canStart ? item.light : '#f0f2f8', opacity: canStart ? 1 : 0.55 },
          ]}
          onPress={() => canStart && navigation.navigate('StartClass', { classItem: item })}
          activeOpacity={canStart ? 0.8 : 1}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Play
              size={11}
              fill={canStart ? item.accent : '#aab0be'}
              color={canStart ? item.accent : '#aab0be'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.actionBtnText, { color: canStart ? item.accent : '#aab0be' }]}>
              {isOngoing ? 'Take Attendance' : 'Start Class'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherClassesScreen({ navigation }) {
  const { token } = useAuth();
  const isFocused = useIsFocused();
  const [selectedDay, setSelectedDay] = useState('Today');
  const [classesData, setClassesData] = useState({
    Today: [],
    Sun: [],
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClasses = async () => {
    try {
      const response = await fetch(API.sessionClasses, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes');
      }

      const newClassData = {
        Today: [],
        Sun: [],
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: [],
      };

      data.forEach((cls) => {
        const color = CLASS_COLORS[cls.class_id % CLASS_COLORS.length];
        const formatted = {
          id: cls.class_id,
          class_id: cls.class_id,
          subject: cls.subject,
          code: cls.class_name,
          room: cls.room || 'TBD',
          // Use the new buildTimeLabel which handles both new and legacy fields
          time: buildTimeLabel(cls),
          students: cls.students_count || 0,
          status: cls.active_session_id ? 'ongoing' : 'upcoming',
          active_session_id: cls.active_session_id,
          accent: color.accent,
          light: color.light,
          // schedule enforcement fields
          schedule_status:    cls.schedule_status || null,
          scheduled_date:     cls.scheduled_date || null,
          scheduled_time:     cls.scheduled_time || null,
          scheduled_end_time: cls.scheduled_end_time || null,
          // keep legacy field for other consumers
          schedule_time:      cls.schedule_time || null,
          duration_minutes:   cls.duration_minutes,
        };

        // ── Day-strip bucketing ──────────────────────────────────────
        // Priority: new scheduled_date → legacy schedule_time → Today
        let bucketed = false;

        if (cls.scheduled_date) {
          // "YYYY-MM-DD" → parse as local date to get day-of-week
          const [y, m, d] = cls.scheduled_date.split('-').map(Number);
          const clsDayIndex = new Date(y, m - 1, d).getDay();
          WEEK_DAYS.forEach((day) => {
            if (day.dayIndex === clsDayIndex) {
              newClassData[day.key].push(formatted);
              bucketed = true;
            }
          });
        }

        if (!bucketed && cls.schedule_time) {
          const clsDate = new Date(cls.schedule_time);
          const clsDayIndex = clsDate.getDay();
          WEEK_DAYS.forEach((day) => {
            if (day.dayIndex === clsDayIndex) {
              newClassData[day.key].push(formatted);
              bucketed = true;
            }
          });
        }

        if (!bucketed) {
          newClassData['Today'].push(formatted);
        }
      });

      setClassesData(newClassData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isFocused) {
      fetchClasses();
    }
  }, [token, isFocused]);

  const classes = classesData[selectedDay] ?? [];
  const totalStudents = classes.reduce((s, c) => s + c.students, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Classes</Text>
          <Text style={styles.headerSub}>Weekly Schedule</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <LayoutDashboard size={18} color="#1a1f36" />
        </TouchableOpacity>
      </View>

      {/* ── Day Selector Strip ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayStrip}
        contentContainerStyle={styles.dayStripContent}
      >
        {WEEK_DAYS.map((day) => {
          const isActive = selectedDay === day.key;
          const hasCls = (classesData[day.key] ?? []).length > 0;
          return (
            <TouchableOpacity
              key={day.key}
              style={[styles.dayPill, isActive && styles.dayPillActive]}
              onPress={() => setSelectedDay(day.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dayPillLabel, isActive && styles.dayPillLabelActive]}>
                {day.label}
              </Text>
              <Text style={[styles.dayPillDate, isActive && styles.dayPillDateActive]}>
                {day.date}
              </Text>
              {hasCls && (
                <View style={[styles.dayPillDot, isActive && styles.dayPillDotActive]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Summary Bar ── */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {selectedDay === 'Today' ? "Today's Classes" : `${selectedDay}'s Classes`}
          {'  '}
          <Text style={styles.summaryCount}>{classes.length} classes · {totalStudents} students</Text>
        </Text>
      </View>

      {/* ── Class List ── */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.loadingText}>Loading schedule...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color="#e74c3c" style={{ marginBottom: 14 }} />
            <Text style={styles.emptyTitle}>Error Loading Classes</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchClasses}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Umbrella size={48} color="#8a94a6" style={{ marginBottom: 14 }} />
            <Text style={styles.emptyTitle}>No Classes</Text>
            <Text style={styles.emptySub}>Enjoy your day off!</Text>
          </View>
        ) : (
          classes.map((item) => (
            <ClassCard key={item.id} item={item} navigation={navigation} />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TeacherBottomNav navigation={navigation} active="Classes" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1a1f36' },
  headerSub: { fontSize: 13, color: '#8a94a6', marginTop: 2 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  filterIcon: { fontSize: 18 },

  // Day Strip
  dayStrip: { flexGrow: 0, marginBottom: 6 },
  dayStripContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  dayPill: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, backgroundColor: '#ffffff', minWidth: 60,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dayPillActive: {
    backgroundColor: BLUE,
    shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  dayPillLabel: { fontSize: 11, fontWeight: '600', color: '#8a94a6', marginBottom: 2 },
  dayPillLabelActive: { color: 'rgba(255,255,255,0.85)' },
  dayPillDate: { fontSize: 18, fontWeight: '800', color: '#1a1f36' },
  dayPillDateActive: { color: '#ffffff' },
  dayPillDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: BLUE, marginTop: 4,
  },
  dayPillDotActive: { backgroundColor: 'rgba(255,255,255,0.7)' },

  // Summary Bar
  summaryBar: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#eef1f5', marginBottom: 4,
  },
  summaryText: { fontSize: 13, fontWeight: '700', color: '#1a1f36' },
  summaryCount: { fontSize: 13, fontWeight: '500', color: '#8a94a6' },

  // List
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 10 },

  // Card
  card: {
    backgroundColor: '#ffffff', borderRadius: 18, padding: 16,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardDot: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardSubject: { fontSize: 16, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  cardCode: { fontSize: 12, color: '#8a94a6', fontWeight: '500' },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  badgeOngoing: { backgroundColor: '#e8faf1' },
  badgeUpcoming: { backgroundColor: '#f0f2f8' },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27ae60' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextOngoing: { color: '#27ae60' },
  badgeTextUpcoming: { color: '#8a94a6' },

  // Meta row
  cardMeta: { flexDirection: 'row', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { fontSize: 12, color: '#6b7280' },

  // Actions
  cardActions: { flexDirection: 'row' },
  actionBtn: {
    flex: 1, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1a1f36', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#8a94a6' },

  // Center loader/retry
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#8a94a6',
    fontWeight: '500',
  },
  retryBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BLUE,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});