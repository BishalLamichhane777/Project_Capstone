import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar,
} from 'react-native';
import TeacherBottomNav from '../components/TeacherBottomNav';

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

// ─── Class data keyed by day index (0=Sun … 6=Sat) + "Today" ─────────────────
const CLASS_DATA = {
  Today: [
    {
      id: 't1',
      subject: 'Intro to Comp Sci',
      code: 'CS101-A',
      room: 'Room 304',
      time: '09:00 – 10:30 AM',
      students: 28,
      status: 'ongoing',
      accent: BLUE,
      light: '#eef2ff',
    },
    {
      id: 't2',
      subject: 'Advanced Algorithms',
      code: 'CS302-B',
      room: 'Room 201',
      time: '11:00 – 12:30 PM',
      students: 22,
      status: 'upcoming',
      accent: '#7c3aed',
      light: '#f3eeff',
    },
    {
      id: 't3',
      subject: 'Database Systems',
      code: 'CS210-Lab',
      room: 'Lab 2',
      time: '02:00 – 04:00 PM',
      students: 18,
      status: 'upcoming',
      accent: '#e67e22',
      light: '#fff4e6',
    },
  ],
  Mon: [
    {
      id: 'm1',
      subject: 'Data Structures',
      code: 'CS201-A',
      room: 'Room 101',
      time: '08:00 – 09:30 AM',
      students: 30,
      status: 'upcoming',
      accent: '#27ae60',
      light: '#edfaf3',
    },
    {
      id: 'm2',
      subject: 'Operating Systems',
      code: 'CS305-C',
      room: 'Room 406',
      time: '01:00 – 02:30 PM',
      students: 25,
      status: 'upcoming',
      accent: '#e74c3c',
      light: '#fff0f0',
    },
  ],
  Tue: [
    {
      id: 'tu1',
      subject: 'Computer Networks',
      code: 'CS311-A',
      room: 'Room 205',
      time: '10:00 – 11:30 AM',
      students: 24,
      status: 'upcoming',
      accent: '#2980b9',
      light: '#ebf5fb',
    },
  ],
  Wed: [
    {
      id: 'w1',
      subject: 'Intro to Comp Sci',
      code: 'CS101-A',
      room: 'Room 304',
      time: '09:00 – 10:30 AM',
      students: 28,
      status: 'upcoming',
      accent: BLUE,
      light: '#eef2ff',
    },
    {
      id: 'w2',
      subject: 'Software Engineering',
      code: 'CS401-B',
      room: 'Room 302',
      time: '03:00 – 04:30 PM',
      students: 20,
      status: 'upcoming',
      accent: '#8e44ad',
      light: '#f5eef8',
    },
  ],
  Thu: [
    {
      id: 'th1',
      subject: 'Advanced Algorithms',
      code: 'CS302-B',
      room: 'Room 201',
      time: '11:00 – 12:30 PM',
      students: 22,
      status: 'upcoming',
      accent: '#7c3aed',
      light: '#f3eeff',
    },
    {
      id: 'th2',
      subject: 'Database Systems',
      code: 'CS210-Lab',
      room: 'Lab 2',
      time: '02:00 – 04:00 PM',
      students: 18,
      status: 'upcoming',
      accent: '#e67e22',
      light: '#fff4e6',
    },
  ],
  Fri: [
    {
      id: 'f1',
      subject: 'Computer Networks',
      code: 'CS311-A',
      room: 'Room 205',
      time: '10:00 – 11:30 AM',
      students: 24,
      status: 'upcoming',
      accent: '#2980b9',
      light: '#ebf5fb',
    },
  ],
  Sat: [],
  Sun: [],
};

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

// ─── Class Card ───────────────────────────────────────────────────────────────
function ClassCard({ item, navigation }) {
  const isOngoing = item.status === 'ongoing';
  return (
    <View style={[
      styles.card,
      isOngoing && { borderLeftWidth: 4, borderLeftColor: item.accent },
    ]}>
      <View style={styles.cardTop}>
        {/* Left accent dot */}
        <View style={[styles.cardDot, { backgroundColor: item.light }]}>
          <Text style={{ fontSize: 16 }}>📚</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardSubject}>{item.subject}</Text>
          <Text style={styles.cardCode}>{item.code}</Text>
        </View>

        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>🕐</Text>
          <Text style={styles.metaText}>{item.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText}>{item.room}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>👥</Text>
          <Text style={styles.metaText}>{item.students} students</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: item.light }]}
          onPress={() => navigation.navigate('StartClass', { classItem: item })}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionBtnText, { color: item.accent }]}>
            {isOngoing ? '▶  Take Attendance' : '▶  Start Class'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherClassesScreen({ navigation }) {
  const [selectedDay, setSelectedDay] = useState('Today');

  const classes = CLASS_DATA[selectedDay] ?? [];
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
          <Text style={styles.filterIcon}>⊞</Text>
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
          const hasCls = (CLASS_DATA[day.key] ?? []).length > 0;
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
        {classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏖️</Text>
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
});