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

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const schedule = {
  Mon: [
    { subject: 'Database Systems', code: 'CS-301', time: '10:00 AM', duration: '1h 30m', room: 'Room 205', teacher: 'Prof. Sharma', color: '#eef2ff', iconColor: '#3b5bdb', icon: '🗄️', status: 'ongoing' },
    { subject: 'Mathematics III', code: 'MA-201', time: '12:30 PM', duration: '1h 00m', room: 'Room 101', teacher: 'Prof. Thapa', color: '#fff4e6', iconColor: '#e67e22', icon: 'Σ', status: 'upcoming' },
    { subject: 'Networks', code: 'CS-401', time: '02:00 PM', duration: '1h 30m', room: 'Room 301', teacher: 'Prof. Rai', color: '#e8f4ff', iconColor: '#2980b9', icon: '🌐', status: 'upcoming' },
  ],
  Tue: [
    { subject: 'DAML', code: 'CS-302', time: '09:00 AM', duration: '1h 30m', room: 'Room 201', teacher: 'Prof. Karki', color: '#f3eeff', iconColor: '#7c3aed', icon: '📊', status: 'upcoming' },
    { subject: 'Operating Systems', code: 'CS-303', time: '11:00 AM', duration: '1h 00m', room: 'Room 102', teacher: 'Prof. Bista', color: '#edfaf3', iconColor: '#27ae60', icon: '💻', status: 'upcoming' },
  ],
  Wed: [
    { subject: 'Networks', code: 'CS-401', time: '10:00 AM', duration: '1h 30m', room: 'Room 301', teacher: 'Prof. Rai', color: '#e8f4ff', iconColor: '#2980b9', icon: '🌐', status: 'upcoming' },
    { subject: 'Database Systems', code: 'CS-301', time: '01:00 PM', duration: '1h 30m', room: 'Room 205', teacher: 'Prof. Sharma', color: '#eef2ff', iconColor: '#3b5bdb', icon: '🗄️', status: 'upcoming' },
  ],
  Thu: [
    { subject: 'Operating Systems', code: 'CS-303', time: '09:00 AM', duration: '1h 00m', room: 'Room 102', teacher: 'Prof. Bista', color: '#edfaf3', iconColor: '#27ae60', icon: '💻', status: 'upcoming' },
    { subject: 'DAML', code: 'CS-302', time: '11:30 AM', duration: '1h 30m', room: 'Room 201', teacher: 'Prof. Karki', color: '#f3eeff', iconColor: '#7c3aed', icon: '📊', status: 'upcoming' },
    { subject: 'Mathematics III', code: 'MA-201', time: '02:30 PM', duration: '1h 00m', room: 'Room 101', teacher: 'Prof. Thapa', color: '#fff4e6', iconColor: '#e67e22', icon: 'Σ', status: 'upcoming' },
  ],
  Fri: [
    { subject: 'Database Systems', code: 'CS-301', time: '10:00 AM', duration: '1h 30m', room: 'Room 205', teacher: 'Prof. Sharma', color: '#eef2ff', iconColor: '#3b5bdb', icon: '🗄️', status: 'upcoming' },
    { subject: 'Networks', code: 'CS-401', time: '12:00 PM', duration: '1h 30m', room: 'Room 301', teacher: 'Prof. Rai', color: '#e8f4ff', iconColor: '#2980b9', icon: '🌐', status: 'upcoming' },
  ],
};

// Today = Monday, Tomorrow = Tuesday for demo
const todayKey = 'Mon';
const tomorrowKey = 'Tue';

function ClassCard({ item, showStatus }) {
  const isOngoing = item.status === 'ongoing';
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
        <View style={[styles.classIcon, { backgroundColor: item.color }]}>
          <Text style={[styles.classIconText, { color: item.iconColor }]}>{item.icon}</Text>
        </View>

        {/* Info */}
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.subject}</Text>
          <Text style={styles.classCode}>{item.code}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailItem}>📍 {item.room}</Text>
            <Text style={styles.detailDot}>·</Text>
            <Text style={styles.detailItem}>👤 {item.teacher}</Text>
          </View>
        </View>

        {/* Time */}
        <View style={styles.timeBlock}>
          <Text style={[styles.timeText, isOngoing && styles.timeTextActive]}>{item.time}</Text>
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function WeekDayTab({ day, active, onPress, count }) {
  return (
    <TouchableOpacity style={styles.weekDayTab} onPress={onPress}>
      <Text style={[styles.weekDayText, active && styles.weekDayTextActive]}>{day}</Text>
      {count > 0 && (
        <View style={[styles.weekDayCount, active && styles.weekDayCountActive]}>
          <Text style={[styles.weekDayCountText, active && styles.weekDayCountTextActive]}>
            {count}
          </Text>
        </View>
      )}
      {active && <View style={styles.weekDayUnderline} />}
    </TouchableOpacity>
  );
}

export default function ClassesScreen({ navigation }) {
  const [showFullWeek, setShowFullWeek] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Mon');

  const todayClasses = schedule[todayKey];
  const tomorrowClasses = schedule[tomorrowKey];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Classes</Text>
          <Text style={styles.headerSub}>Monday, Oct 21</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{todayClasses.length} today</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* TODAY */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.sectionCount}>{todayClasses.length} classes</Text>
        </View>

        {todayClasses.map((item, i) => (
          <ClassCard key={i} item={item} />
        ))}

        {/* TOMORROW */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: '#8a94a6' }]} />
          <Text style={styles.sectionTitle}>Tomorrow</Text>
          <Text style={styles.sectionCount}>{tomorrowClasses.length} classes</Text>
        </View>

        {tomorrowClasses.map((item, i) => (
          <ClassCard key={i} item={item} />
        ))}

        {/* FULL WEEK SCHEDULE */}
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowFullWeek(!showFullWeek)}
          activeOpacity={0.8}
        >
          <Text style={styles.moreButtonText}>
            {showFullWeek ? '▲  Hide Weekly Schedule' : '▼  View Full Week Schedule'}
          </Text>
        </TouchableOpacity>

        {showFullWeek && (
          <View style={styles.weekContainer}>
            {/* Day Tabs */}
            <View style={styles.weekTabRow}>
              {weekDays.map((day) => (
                <WeekDayTab
                  key={day}
                  day={day}
                  active={selectedDay === day}
                  onPress={() => setSelectedDay(day)}
                  count={schedule[day]?.length || 0}
                />
              ))}
            </View>

            {/* Classes for selected day */}
            <View style={styles.weekClasses}>
              {schedule[selectedDay].length === 0 ? (
                <View style={styles.noClassBox}>
                  <Text style={styles.noClassIcon}>🎉</Text>
                  <Text style={styles.noClassText}>No classes this day!</Text>
                </View>
              ) : (
                schedule[selectedDay].map((item, i) => (
                  <ClassCard key={i} item={{ ...item, status: 'upcoming' }} />
                ))
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Classes" />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1f36',
  },
  headerSub: {
    fontSize: 13,
    color: '#8a94a6',
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  totalText: {
    fontSize: 13,
    color: BLUE,
    fontWeight: '700',
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1f36',
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: '#8a94a6',
    fontWeight: '500',
  },

  // Class Card
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
  classCardOngoing: {
    borderWidth: 1.5,
    borderColor: BLUE,
  },
  ongoingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ongoingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#27ae60',
  },
  ongoingText: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 2,
  },
  classCode: {
    fontSize: 11,
    color: '#8a94a6',
    fontWeight: '500',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  detailItem: {
    fontSize: 11,
    color: '#6b7280',
  },
  detailDot: {
    fontSize: 11,
    color: '#8a94a6',
  },

  // Time Block
  timeBlock: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1f36',
  },
  timeTextActive: {
    color: BLUE,
  },
  durationPill: {
    backgroundColor: '#f0f2f8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontSize: 10,
    color: '#8a94a6',
    fontWeight: '600',
  },

  // More Button
  moreButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    borderStyle: 'dashed',
  },
  moreButtonText: {
    fontSize: 13,
    color: BLUE,
    fontWeight: '700',
  },

  // Week Container
  weekContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  weekTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
    marginBottom: 16,
  },
  weekDayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  weekDayText: {
    fontSize: 13,
    color: '#8a94a6',
    fontWeight: '600',
  },
  weekDayTextActive: {
    color: BLUE,
    fontWeight: '800',
  },
  weekDayCount: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
  },
  weekDayCountActive: {
    backgroundColor: '#eef2ff',
  },
  weekDayCountText: {
    fontSize: 9,
    color: '#8a94a6',
    fontWeight: '700',
  },
  weekDayCountTextActive: {
    color: BLUE,
  },
  weekDayUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: BLUE,
    borderRadius: 2,
  },
  weekClasses: {
    gap: 0,
  },

  // No Class
  noClassBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noClassIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  noClassText: {
    fontSize: 14,
    color: '#8a94a6',
    fontWeight: '500',
  },
});