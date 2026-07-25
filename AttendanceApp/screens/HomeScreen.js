import React, { useState, useCallback } from 'react';
import BottomNav from '../components/BottomNav';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  Bell, CheckCircle2, AlertTriangle,
  ClipboardList, FileText, ChevronRight,
} from 'lucide-react-native';
import { API } from '../api';

const BLUE  = '#2952e3';
const GREEN = '#27ae60';
const RED   = '#e74c3c';

// ─── AT_RISK_THRESHOLD — matches batch.py / attendance analytics backend ──────
const AT_RISK_THRESHOLD = 75;

// ─── NPT helpers (UTC+5:45) ───────────────────────────────────────────────────
const NPT_MS     = (5 * 60 + 45) * 60 * 1000;
const MON_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Shift a UTC ISO string or Date to a Date whose UTC getters read NPT values. */
function toNPT(src) {
  const ms = typeof src === 'string' ? new Date(src).getTime() : src.getTime();
  return new Date(ms + NPT_MS);
}

/** 'YYYY-MM-DD' string in NPT for a Date (or UTC-ms number). */
function nptDateStr(src) {
  const d = toNPT(typeof src === 'number' ? new Date(src) : src);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** "Today, 2:30 PM"  or  "Jul 25, 2026" */
function formatRecentDate(iso) {
  if (!iso) return '';
  const npt    = toNPT(iso);
  const nowNPT = toNPT(new Date());
  const sameDay =
    npt.getUTCFullYear() === nowNPT.getUTCFullYear() &&
    npt.getUTCMonth()    === nowNPT.getUTCMonth()    &&
    npt.getUTCDate()     === nowNPT.getUTCDate();
  if (sameDay) {
    let h = npt.getUTCHours();
    const min  = String(npt.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `Today, ${h}:${min} ${ampm}`;
  }
  return `${MON_SHORT[npt.getUTCMonth()]} ${npt.getUTCDate()}, ${npt.getUTCFullYear()}`;
}

/** Status badge colour triple */
function statusColour(status) {
  if (status === 'Present') return { badge: '#edfaf3', dot: GREEN,       text: GREEN };
  if (status === 'Partial') return { badge: '#fff8e6', dot: '#f39c12',   text: '#f39c12' };
  return                           { badge: '#fff0f0', dot: RED,         text: RED };
}

// ─── Weekly trend helpers ─────────────────────────────────────────────────────

/**
 * Given the raw attendance history array, derive per-day attendance % for
 * the last 7 NPT calendar days (today = index 0 … 6 days ago = index 6).
 *
 * Returns an array of { label: 'Mon', pct: 80 | null } objects ordered
 * oldest-first so the chart reads left-to-right chronologically.
 * Days with no sessions get pct = null (rendered as empty bar).
 */
function buildWeeklyBars(records) {
  // Build a map: 'YYYY-MM-DD' → { present, total }
  const byDay = {};
  for (const r of records) {
    const key = nptDateStr(r.date || r.created_at);
    if (!byDay[key]) byDay[key] = { present: 0, total: 0 };
    byDay[key].total++;
    if (r.status === 'Present') byDay[key].present++;
  }

  // Generate the last 7 NPT days, oldest first
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const msAgo = Date.now() - i * 24 * 60 * 60 * 1000;
    const key   = nptDateStr(new Date(msAgo));
    const npt   = toNPT(new Date(msAgo));
    const label = i === 0 ? 'Today' : DAY_SHORT[npt.getUTCDay()];
    const day   = byDay[key];
    bars.push({
      label,
      pct: day ? Math.round((day.present / day.total) * 100) : null,
    });
  }
  return bars;
}

/**
 * Calculate the average attendance % over a slice of bars
 * (ignoring days with no sessions).
 * Returns null if no data in that slice.
 */
function avgPct(bars) {
  const active = bars.filter(b => b.pct !== null);
  if (active.length === 0) return null;
  return active.reduce((s, b) => s + b.pct, 0) / active.length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CircularProgress({ percentage, loading, isDarkMode }) {
  const display = loading ? '—' : (percentage !== null ? `${percentage}%` : '—');
  return (
    <View style={styles.circleWrapper}>
      <View style={[styles.circleOuter, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
        <View style={styles.circleInner}>
          <Text style={[styles.circlePercent, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>
            {display}
          </Text>
          <Text style={[styles.circleLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
            OVERALL
          </Text>
        </View>
      </View>
    </View>
  );
}

function StandingBadge({ percentage }) {
  if (percentage === null) return null;
  const good = percentage >= AT_RISK_THRESHOLD;
  return (
    <View style={[styles.standingBadge, { backgroundColor: good ? '#edfaf3' : '#fff0f0' }]}>
      {good
        ? <CheckCircle2 size={14} color={GREEN} />
        : <AlertTriangle size={14} color={RED} />
      }
      <Text style={[styles.standingText, { color: good ? GREEN : RED }]}>
        {good ? 'Good Standing' : 'At Risk'}
      </Text>
    </View>
  );
}

function WeeklyTrendChart({ bars, isDarkMode }) {
  const barBg      = isDarkMode ? '#252b3e' : '#eef1ff';
  const emptyBg    = isDarkMode ? '#1e2030' : '#f5f6fa';
  const labelColor = isDarkMode ? '#8a94b8' : '#8a94a6';

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsRow}>
        {bars.map((bar, i) => (
          <View key={i} style={styles.barColumn}>
            <View style={[styles.barBackground, { backgroundColor: bar.pct !== null ? barBg : emptyBg }]}>
              {bar.pct !== null && (
                <View style={[styles.barFill, { height: `${bar.pct}%` }]} />
              )}
            </View>
            <Text style={[styles.barLabel, { color: labelColor }]}>{bar.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { user, token, isDarkMode } = useAuth();

  const [unreadCount,   setUnreadCount]   = useState(0);
  const [analytics,     setAnalytics]     = useState(null);   // { percentage, ... }
  const [historyData,   setHistoryData]   = useState([]);     // raw attendance records
  const [dataLoading,   setDataLoading]   = useState(true);

  // ── Single fetch that grabs both analytics + history ─────────────────────
  const fetchAll = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    const [analyticsRes, historyRes, notifsRes] = await Promise.allSettled([
      fetch(API.attendanceAnalytics, { headers }),
      fetch(API.attendanceHistory,   { headers }),
      fetch(API.notificationUnreadCount, { headers }),
    ]);

    // Analytics
    if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
      const d = await analyticsRes.value.json();
      setAnalytics(d);
    }

    // History (used for Recent Status + Weekly Trend)
    if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
      const d = await historyRes.value.json();
      if (Array.isArray(d)) setHistoryData(d);
    }

    // Unread notification count
    if (notifsRes.status === 'fulfilled' && notifsRes.value.ok) {
      const d = await notifsRes.value.json();
      setUnreadCount(d?.unread_count ?? 0);
    }

    setDataLoading(false);
  }, [token]);

  // Refresh every time the student navigates to this screen
  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  // ── Derived values ────────────────────────────────────────────────────────
  const percentage   = analytics?.percentage ?? null;
  const recentRecords = historyData.slice(0, 3);  // backend returns newest-first

  // Weekly chart bars
  const weekBars = buildWeeklyBars(historyData);

  // Trend badge: this week (last 7 days) vs previous week (8–14 days ago)
  const thisWeekBars = weekBars;                       // 7 bars already
  const prevWeekAvg  = (() => {
    // Build bars for days 7–13 ago
    const prevBars = [];
    for (let i = 13; i >= 7; i--) {
      const msAgo = Date.now() - i * 24 * 60 * 60 * 1000;
      const key   = nptDateStr(new Date(msAgo));
      // reuse the same byDay map — rebuild it here
      const byDay = {};
      for (const r of historyData) {
        const k = nptDateStr(r.date || r.created_at);
        if (!byDay[k]) byDay[k] = { present: 0, total: 0 };
        byDay[k].total++;
        if (r.status === 'Present') byDay[k].present++;
      }
      const day = byDay[key];
      prevBars.push({ pct: day ? Math.round((day.present / day.total) * 100) : null });
    }
    return avgPct(prevBars);
  })();

  const thisWeekAvg   = avgPct(thisWeekBars);
  let trendLabel      = null;
  let trendColor      = '#8a94a6';
  if (thisWeekAvg !== null) {
    if (prevWeekAvg !== null) {
      const diff = thisWeekAvg - prevWeekAvg;
      trendLabel = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
      trendColor = diff >= 0 ? GREEN : RED;
    } else {
      trendLabel = thisWeekAvg.toFixed(1) + '%';
      trendColor = thisWeekAvg >= AT_RISK_THRESHOLD ? GREEN : RED;
    }
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  const displayName     = user?.fullname || 'Student';
  const displayInitials = user?.fullname
    ? user.fullname.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#111827' : '#f5f7fa'}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#1e2540' : '#d0d7f5' }]}>
              <Text style={styles.avatarText}>{displayInitials}</Text>
            </View>
            <View>
              <Text style={[styles.welcomeText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                Welcome back,
              </Text>
              <Text style={[styles.nameText, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>
                {displayName}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.bellButton, {
              backgroundColor: isDarkMode ? '#1a1f2e' : '#fff',
              borderColor: isDarkMode ? '#2a2f42' : 'transparent',
            }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={17} color={isDarkMode ? '#fff' : '#1a1f36'} />
            {unreadCount > 0 && (
              <View style={[styles.bellBadge, { borderColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Attendance Card (fixes #1 + #2) ── */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
          {dataLoading
            ? <ActivityIndicator size="large" color={BLUE} style={{ marginVertical: 30 }} />
            : <>
                <CircularProgress percentage={percentage} loading={false} isDarkMode={isDarkMode} />
                <StandingBadge percentage={percentage} />
              </>
          }
        </View>

        {/* ── Action buttons ── */}
        <TouchableOpacity
          style={styles.actionButtonBlue}
          onPress={() => navigation.navigate('SubmitWaiver')}
          activeOpacity={0.85}
        >
          <View style={styles.actionButtonIcon}>
            <ClipboardList size={18} color="#fff" />
          </View>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Submit Absence Waiver</Text>
            <Text style={styles.actionButtonSubtitle}>Upload medical certificate or note</Text>
          </View>
          <ChevronRight size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonBlue}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WaiverStatus')}
        >
          <View style={styles.actionButtonIcon}>
            <FileText size={18} color="#fff" />
          </View>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>View Absence Waiver</Text>
          </View>
          <ChevronRight size={22} color="#fff" />
        </TouchableOpacity>

        {/* ── Weekly Trend (fixes #4 + #5) ── */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}>
          <View style={styles.trendHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>
              Weekly Trend
            </Text>
            {!dataLoading && trendLabel && (
              <Text style={[styles.trendBadge, { color: trendColor }]}>{trendLabel}</Text>
            )}
          </View>
          {dataLoading
            ? <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 20 }} />
            : <WeeklyTrendChart bars={weekBars} isDarkMode={isDarkMode} />
          }
        </View>

        {/* ── Recent Status (#3 — already live from previous session) ── */}
        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>
            Recent Status
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('AttendanceHistory')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {dataLoading ? (
          <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 10 }} />
        ) : recentRecords.length === 0 ? (
          <View style={[styles.statusCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff', justifyContent: 'center' }]}>
            <Text style={[styles.statusDate, { color: isDarkMode ? '#8a94b8' : '#8a94a6', textAlign: 'center', padding: 6 }]}>
              No attendance records yet.
            </Text>
          </View>
        ) : (
          recentRecords.map((item, index) => {
            const c = statusColour(item.status);
            return (
              <View
                key={item.session_id || index}
                style={[styles.statusCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#fff' }]}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text
                    style={[styles.statusSubject, { color: isDarkMode ? '#fff' : '#1a1f36' }]}
                    numberOfLines={1}
                  >
                    {item.class_name}
                  </Text>
                  <Text style={[styles.statusDate, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                    {formatRecentDate(item.date)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: c.badge }]}>
                  <View style={[styles.statusDot, { backgroundColor: c.dot }]} />
                  <Text style={[styles.statusBadgeText, { color: c.text }]}>{item.status}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll:   { flex: 1, paddingHorizontal: 18, paddingTop: 16 },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#d0d7f5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: BLUE },
  welcomeText:{ fontSize: 12, color: '#8a94a6' },
  nameText:   { fontSize: 16, fontWeight: '700', color: '#1a1f36' },
  bellButton: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: RED,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5,
  },
  bellBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  // Card
  card: {
    borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },

  // Circle
  circleWrapper: { marginVertical: 10 },
  circleOuter:   { width: 140, height: 140, borderRadius: 70, borderWidth: 10, borderColor: BLUE, justifyContent: 'center', alignItems: 'center' },
  circleInner:   { alignItems: 'center' },
  circlePercent: { fontSize: 32, fontWeight: '800', color: '#1a1f36' },
  circleLabel:   { fontSize: 11, color: '#8a94a6', letterSpacing: 1, fontWeight: '500' },

  // Standing badge
  standingBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 16, gap: 6 },
  standingText:  { fontSize: 13, fontWeight: '600' },

  // Action buttons
  actionButtonBlue: {
    backgroundColor: BLUE, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  actionButtonIcon:    { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionButtonContent: { flex: 1 },
  actionButtonTitle:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionButtonSubtitle:{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Weekly Trend
  trendHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1f36' },
  trendBadge:   { fontSize: 13, fontWeight: '600' },

  // Chart
  chartContainer: { width: '100%', height: 100 },
  barsRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80, marginBottom: 8 },
  barColumn:      { alignItems: 'center', flex: 1 },
  barBackground:  { width: 28, height: 70, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:        { width: '100%', backgroundColor: BLUE, borderRadius: 8 },
  barLabel:       { fontSize: 11, color: '#8a94a6', marginTop: 6 },

  // Recent Status
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll:      { fontSize: 13, color: BLUE, fontWeight: '500' },
  statusCard:   {
    borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statusSubject:    { fontSize: 13, fontWeight: '600', color: '#1a1f36', marginBottom: 3 },
  statusDate:       { fontSize: 11, color: '#8a94a6' },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, gap: 5 },
  statusDot:        { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText:  { fontSize: 12, fontWeight: '600' },
});
