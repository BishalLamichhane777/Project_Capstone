import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TeacherBottomNav from '../components/TeacherBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { CheckCircle2, AlertTriangle } from 'lucide-react-native';

const BLUE = '#2952e3';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 36 - 32;

// Colour palette for the distribution bar chart (cycles if more classes)
const BAR_COLORS = ['#e67e22', BLUE, '#27ae60', '#7c3aed', '#e74c3c', '#0891b2', '#db2777'];

// ─── Simple Line Chart ────────────────────────────────────────────────────────
function LineChart({ data, isDarkMode, gridLineColor }) {
  if (!data || data.length === 0) return null;
  const H = 120;
  const PAD = { top: 16, bottom: 28, left: 8, right: 8 };
  const chartH = H - PAD.top - PAD.bottom;
  const chartW = CHART_WIDTH - PAD.left - PAD.right;

  const values = data.map(d => d.pct);
  const maxVal = Math.max(100, ...values);
  const minVal = Math.max(0,   Math.min(50, ...values) - 5);
  const range  = maxVal - minVal || 1;

  const pts = data.map((d, i) => ({
    x: data.length > 1
      ? PAD.left + (i / (data.length - 1)) * chartW
      : PAD.left + chartW / 2,
    y: PAD.top + chartH - ((d.pct - minVal) / range) * chartH,
    ...d,
  }));

  const labelColor = isDarkMode ? '#5a6080' : '#aab0be';

  return (
    <View style={{ height: H }}>
      {[Math.round(maxVal), Math.round((maxVal + minVal) / 2), Math.round(minVal)].map((v) => {
        const y = PAD.top + chartH - ((v - minVal) / range) * chartH;
        return (
          <View key={v} style={[styles.gridLine, { top: y, backgroundColor: gridLineColor }]}>
            <Text style={[styles.gridLabel, { color: labelColor }]}>{v}%</Text>
          </View>
        );
      })}

      {/* Soft vertical bars */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'flex-end',
        paddingLeft: PAD.left, paddingRight: PAD.right,
        paddingBottom: PAD.bottom, paddingTop: PAD.top }]}>
        {pts.map((p, i) => {
          const barH = ((p.pct - minVal) / range) * chartH;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{ width: 3, height: barH, backgroundColor: BLUE,
                opacity: 0.15, borderRadius: 2 }} />
            </View>
          );
        })}
      </View>

      {/* Line segments */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {pts.map((p, i) => {
          if (i === 0) return null;
          const prev = pts[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View key={i} style={{
              position: 'absolute', left: prev.x, top: prev.y - 1,
              width: len, height: 2.5, backgroundColor: BLUE, borderRadius: 2,
              transform: [{ rotate: `${angle}deg` }], transformOrigin: 'left center',
            }} />
          );
        })}
        {pts.map((p, i) => (
          <View key={i} style={{
            position: 'absolute', left: p.x - 5, top: p.y - 5,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
            borderWidth: 2.5, borderColor: BLUE,
          }} />
        ))}
      </View>

      {/* X-axis labels */}
      <View style={[styles.xAxis, { paddingLeft: PAD.left, paddingRight: PAD.right }]}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.xLabel, { color: labelColor }]}>{d.day}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data, isDarkMode }) {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const BAR_H = 120;
  const labelColor = isDarkMode ? '#8a94b8' : '#8a94a6';

  return (
    <View style={{ height: BAR_H + 36 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_H, gap: 10 }}>
        {data.map((d) => {
          const h = Math.max(8, (d.count / maxCount) * BAR_H);
          return (
            <View key={d.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.barCount, { color: labelColor }]}>{d.count}</Text>
              <View style={{
                width: '70%', height: h, backgroundColor: d.color, borderRadius: 8,
                shadowColor: d.color, shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
              }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {data.map((d) => (
          <View key={d.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.barLabel, { color: d.color }]} numberOfLines={1}>
              {d.label.length > 5 ? d.label.slice(0, 4) + '…' : d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherReportsScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();
  const [period, setPeriod] = useState('Week');
  const periods = ['Week', 'Month', 'Semester'];

  // ── Data state ────────────────────────────────────────────────────────────
  const [loading,         setLoading]         = useState(true);
  const [overallPct,      setOverallPct]       = useState(null);  // teacher-wide avg %
  const [atRiskCount,     setAtRiskCount]      = useState(null);  // students < 75%
  const [weeklyBars,      setWeeklyBars]       = useState([]);    // line chart
  const [distribution,    setDistribution]     = useState([]);    // bar chart
  const [atRiskStudents,  setAtRiskStudents]   = useState([]);    // at-risk list

  // ── Fetch all data ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Step 1 — get teacher's classes (includes students_count per class)
      const classRes = await fetch(API.sessionClasses, { headers });
      if (!classRes.ok) { setLoading(false); return; }
      const classes = await classRes.json();
      if (!Array.isArray(classes) || classes.length === 0) {
        setLoading(false); return;
      }

      // Step 2 — build distribution chart from enrollment counts
      const distData = classes.map((cls, i) => ({
        label: cls.class_name || cls.subject || `Class ${cls.class_id}`,
        count: cls.students_count ?? 0,
        color: BAR_COLORS[i % BAR_COLORS.length],
      }));
      setDistribution(distData);

      // Step 3 — fetch per-class attendance report for each class
      const reportResults = await Promise.allSettled(
        classes.map(cls =>
          fetch(`${API.attendanceReport}/${cls.class_id}`, { headers })
            .then(r => r.ok ? r.json() : null)
        )
      );

      // Flatten all students across all classes
      const allStudents = [];
      reportResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value?.students) {
          result.value.students.forEach(s => {
            allStudents.push({
              name:       s.fullname,
              class_name: result.value.class_name,
              pct:        s.attendance_percentage,
              at_risk:    s.at_risk,
            });
          });
        }
      });

      // Overall attendance % = average across all student records
      const withData = allStudents.filter(s => s.pct !== null && s.pct !== undefined);
      if (withData.length > 0) {
        const avg = withData.reduce((sum, s) => sum + s.pct, 0) / withData.length;
        setOverallPct(Math.round(avg));
      }

      // At-risk count and list
      const atRisk = allStudents.filter(s => s.at_risk);
      setAtRiskCount(atRisk.length);
      setAtRiskStudents(
        atRisk
          .sort((a, b) => a.pct - b.pct)   // lowest % first
          .slice(0, 5)                       // show up to 5
      );

      // Step 4 — build weekly trend from session history per class
      // Group all closed sessions by NPT calendar day (last 7 days)
      const NPT_MS = (5 * 60 + 45) * 60 * 1000;
      const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayMap = {}; // 'YYYY-MM-DD' → { present, total }

      const sessionResults = await Promise.allSettled(
        classes.map(cls =>
          fetch(`${API.sessionByClass}/${cls.class_id}`, { headers })
            .then(r => r.ok ? r.json() : null)
        )
      );

      sessionResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value?.sessions) {
          result.value.sessions.forEach(s => {
            if (!s.start_time || !s.summary) return;
            const npt = new Date(new Date(s.start_time).getTime() + NPT_MS);
            const key = `${npt.getUTCFullYear()}-${String(npt.getUTCMonth()+1).padStart(2,'0')}-${String(npt.getUTCDate()).padStart(2,'0')}`;
            if (!dayMap[key]) dayMap[key] = { present: 0, total: 0, dayIdx: npt.getUTCDay() };
            dayMap[key].present += s.summary.present ?? 0;
            dayMap[key].total   += s.summary.total   ?? 0;
          });
        }
      });

      // Build last 7 days oldest-first
      const bars = [];
      for (let i = 6; i >= 0; i--) {
        const msAgo = Date.now() - i * 24 * 60 * 60 * 1000;
        const npt   = new Date(msAgo + NPT_MS);
        const key   = `${npt.getUTCFullYear()}-${String(npt.getUTCMonth()+1).padStart(2,'0')}-${String(npt.getUTCDate()).padStart(2,'0')}`;
        const day   = dayMap[key];
        bars.push({
          day: i === 0 ? 'Today' : DAY_NAMES[npt.getUTCDay()],
          pct: day && day.total > 0
            ? Math.round((day.present / day.total) * 100)
            : null,
        });
      }
      // Only include days that had sessions so the chart isn't full of nulls
      const activeBars = bars.filter(b => b.pct !== null);
      setWeeklyBars(activeBars.length > 0 ? activeBars : bars);

    } catch (err) {
      console.error('TeacherReports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  // ── Theme ─────────────────────────────────────────────────────────────────
  const bg             = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg         = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPrimary    = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub        = isDarkMode ? '#8a94b8' : '#8a94a6';
  const rowBorder      = isDarkMode ? '#252b3e' : '#f5f7fa';
  const periodRowBg    = isDarkMode ? '#1a1f2e' : '#f0f2f8';
  const periodActiveBg = isDarkMode ? '#252b3e' : '#ffffff';
  const gridLineColor  = isDarkMode ? '#252b3e' : '#f0f2f8';

  // Summary cards — 2 cards (Waivers Pending + Top Attendance removed)
  const summaryCards = [
    {
      icon: CheckCircle2,
      label: 'Overall Attendance',
      value: loading ? '…' : (overallPct !== null ? `${overallPct}%` : '—'),
      color: '#edfaf3', textColor: '#27ae60',
    },
    {
      icon: AlertTriangle,
      label: 'At-Risk Students',
      value: loading ? '…' : (atRiskCount !== null ? String(atRiskCount) : '—'),
      color: '#fff4e6', textColor: '#e67e22',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={bg} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Reports</Text>
            <Text style={[styles.headerSub, { color: textSub }]}>Attendance & Performance</Text>
          </View>
        </View>

        {/* ── Period Toggle ── */}
        <View style={[styles.periodRow, { backgroundColor: periodRowBg }]}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && [styles.periodBtnActive, { backgroundColor: periodActiveBg }]]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, { color: textSub }, period === p && [styles.periodTextActive, { color: textPrimary }]]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Summary Stats (2 cards, dynamic) ── */}
        <View style={styles.statsGrid}>
          {summaryCards.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: isDarkMode ? '#1a1f2e' : s.color }]}>
              <View style={{ marginBottom: 6 }}>
                <s.icon size={22} color={s.textColor} />
              </View>
              <Text style={[styles.statValue, { color: s.textColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: textSub }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Attendance Trend Line Chart ── */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Attendance Trend</Text>
              <Text style={[styles.cardSub, { color: textSub }]}>This {period} — all classes</Text>
            </View>
          </View>
          {loading
            ? <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 20 }} />
            : weeklyBars.length === 0
              ? <Text style={[styles.emptyChart, { color: textSub }]}>No session data yet</Text>
              : <LineChart data={weeklyBars} isDarkMode={isDarkMode} gridLineColor={gridLineColor} />
          }
        </View>

        {/* ── Student Distribution Bar Chart ── */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Student Distribution</Text>
              <Text style={[styles.cardSub, { color: textSub }]}>Students enrolled per class</Text>
            </View>
            {!loading && distribution.length > 0 && (
              <Text style={[styles.totalStudents, { color: textSub }]}>
                {distribution.reduce((s, d) => s + d.count, 0)} total
              </Text>
            )}
          </View>
          {loading
            ? <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 20 }} />
            : distribution.length === 0
              ? <Text style={[styles.emptyChart, { color: textSub }]}>No classes found</Text>
              : <>
                  <BarChart data={distribution} isDarkMode={isDarkMode} />
                  <View style={styles.legend}>
                    {distribution.map((d) => (
                      <View key={d.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                        <Text style={[styles.legendText, { color: textSub }]}>{d.label} ({d.count})</Text>
                      </View>
                    ))}
                  </View>
                </>
          }
        </View>

        {/* ── At-Risk Students ── */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <AlertTriangle size={16} color={textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.cardTitle, { color: textPrimary }]}>At-Risk Students</Text>
          </View>
          <Text style={[styles.cardSub, { color: textSub, marginBottom: 12 }]}>
            Below 75% attendance threshold
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={BLUE} />
          ) : atRiskStudents.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: isDarkMode ? '#1a2e1e' : '#edfaf3' }]}>
              <CheckCircle2 size={20} color="#27ae60" style={{ marginRight: 8 }} />
              <Text style={{ color: '#27ae60', fontSize: 13, fontWeight: '600' }}>
                All students are on track
              </Text>
            </View>
          ) : (
            atRiskStudents.map((s, i) => (
              <View key={i} style={[styles.riskRow, { borderBottomColor: rowBorder },
                i === atRiskStudents.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.riskAvatar}>
                  <Text style={styles.riskAvatarText}>
                    {(s.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.riskInfo}>
                  <Text style={[styles.riskName, { color: textPrimary }]}>{s.name}</Text>
                  <Text style={[styles.riskClass, { color: textSub }]}>{s.class_name}</Text>
                </View>
                <View style={styles.riskBadge}>
                  <Text style={styles.riskPct}>{Math.round(s.pct)}%</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TeacherBottomNav navigation={navigation} active="Reports" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll:   { flex: 1, paddingHorizontal: 18 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSub:   { fontSize: 13, marginTop: 2 },

  periodRow:       { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 18 },
  periodBtn:       { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  periodBtnActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  periodText:      { fontSize: 13, fontWeight: '600' },
  periodTextActive:{ fontWeight: '700' },

  // 2-column grid for 2 stat cards
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:  {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  card: {
    borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle:     { fontSize: 16, fontWeight: '800' },
  cardSub:       { fontSize: 12, marginTop: 2 },
  totalStudents: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  emptyChart: { textAlign: 'center', paddingVertical: 24, fontSize: 13 },
  emptyState: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14 },

  // Line chart helpers
  gridLine:  { position: 'absolute', left: 0, right: 0, height: 1 },
  gridLabel: { position: 'absolute', right: 0, top: -8, fontSize: 9 },
  xAxis:     { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  xLabel:    { fontSize: 9, flex: 1, textAlign: 'center' },

  // Bar chart
  barCount: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  barLabel: { fontSize: 11, fontWeight: '800' },

  legend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },

  // At-risk rows
  riskRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  riskAvatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff4e6', justifyContent: 'center', alignItems: 'center' },
  riskAvatarText:{ fontSize: 12, fontWeight: '800', color: '#e67e22' },
  riskInfo:      { flex: 1 },
  riskName:      { fontSize: 14, fontWeight: '700' },
  riskClass:     { fontSize: 12 },
  riskBadge:     { backgroundColor: '#fff0f0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  riskPct:       { fontSize: 13, fontWeight: '800', color: '#e74c3c' },
});
