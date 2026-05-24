import React, { useState } from 'react';
import BottomNav from '../components/BottomNav';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';

const BLUE = '#2952e3';

const subjectIcons = ['Σ', '♟', '📖', '⚗', 'Σ', '</>'];
const iconBgColors = ['#eef2ff', '#f3eeff', '#fff4e6', '#e6fff4', '#eef2ff', '#e8f4ff'];
const iconTextColors = ['#3b5bdb', '#7c3aed', '#e67e22', '#27ae60', '#3b5bdb', '#2980b9'];

const attendanceData = [
  {
    week: 'THIS WEEK',
    items: [
      { subject: 'Advanced Calculus', time: 'Today, 10:00 AM', status: 'Present', duration: '55m', iconIndex: 0 },
      { subject: 'Psychology 101', time: 'Yesterday, 02:00 PM', status: 'Absent', duration: '1h 30m', iconIndex: 1 },
      { subject: 'Modern History', time: 'Mon, 11:30 AM', status: 'Present', duration: '45m', iconIndex: 2 },
    ],
  },
  {
    week: 'LAST WEEK',
    items: [
      { subject: 'Physics Lab', time: 'Fri, 09:00 AM', status: 'Present', duration: '2h 00m', iconIndex: 3 },
      { subject: 'Advanced Calculus', time: 'Thu, 10:00 AM', status: 'Present', duration: '55m', iconIndex: 0 },
      { subject: 'Intro to CS', time: 'Wed, 01:00 PM', status: 'Absent', duration: '1h 15m', iconIndex: 5 },
    ],
  },
];

const stats = [
  { label: 'TOTAL', value: '48', color: BLUE },
  { label: 'PRESENT', value: '42', color: '#27ae60' },
  { label: 'ABSENT', value: '6', color: '#e74c3c' },
  { label: 'WAIVERS', value: '2', color: '#f39c12' },
];

function StatusBadge({ status }) {
  const isPresent = status === 'Present';
  return (
    <View style={[styles.badge, isPresent ? styles.badgePresent : styles.badgeAbsent]}>
      <Text style={[styles.badgeText, isPresent ? styles.badgeTextPresent : styles.badgeTextAbsent]}>
        {status}
      </Text>
    </View>
  );
}

function AttendanceItem({ item }) {
  return (
    <View style={styles.itemCard}>
      <View style={[styles.itemIcon, { backgroundColor: iconBgColors[item.iconIndex] }]}>
        <Text style={[styles.itemIconText, { color: iconTextColors[item.iconIndex] }]}>
          {subjectIcons[item.iconIndex]}
        </Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemSubject}>{item.subject}</Text>
        <Text style={styles.itemTime}>{item.time}</Text>
      </View>
      <View style={styles.itemRight}>
        <StatusBadge status={item.status} />
        <View style={styles.durationRow}>
          <Text style={styles.clockIcon}>🕐</Text>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AttendanceHistoryScreen({ navigation }) {

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Attendance Sections */}
        {attendanceData.map((section, si) => (
          <View key={si}>
            <Text style={styles.sectionLabel}>{section.week}</Text>
            {section.items.map((item, ii) => (
              <AttendanceItem key={ii} item={item} />
            ))}
          </View>
        ))}

        <View style={{ height: 90 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="History" />
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
    backgroundColor: '#f5f7fa',
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
  filterButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 18,
    color: BLUE,
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 9,
    color: '#8a94a6',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Section Label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a94a6',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },

  // Item Card
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
  },
  itemSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    color: '#8a94a6',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },

  // Badge
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgePresent: {
    backgroundColor: '#edfaf3',
  },
  badgeAbsent: {
    backgroundColor: '#fff0f0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPresent: {
    color: '#27ae60',
  },
  badgeTextAbsent: {
    color: '#e74c3c',
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clockIcon: {
    fontSize: 10,
  },
  durationText: {
    fontSize: 11,
    color: '#8a94a6',
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 3,
    opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#aab0be',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: BLUE,
    fontWeight: '700',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e74c3c',
    marginTop: 2,
  },
});