import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Dimensions,
} from 'react-native';
import TeacherBottomNav from '../components/TeacherBottomNav';
import { CheckCircle2, AlertTriangle, ClipboardList, Trophy, Upload, ChevronRight } from 'lucide-react-native';

const BLUE = '#2952e3';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 36 - 32; // screen - padding - card padding

// ─── Mock data ────────────────────────────────────────────────────────────────
const ATTENDANCE_WEEKLY = [
  { day: 'Mon', pct: 88 },
  { day: 'Tue', pct: 92 },
  { day: 'Wed', pct: 76 },
  { day: 'Thu', pct: 95 },
  { day: 'Fri', pct: 83 },
  { day: 'Sat', pct: 70 },
  { day: 'Sun', pct: 60 },
];

const GRADE_DATA = [
  { grade: 'A', count: 14, color: '#27ae60' },
  { grade: 'B', count: 22, color: BLUE },
  { grade: 'C', count: 18, color: '#f39c12' },
  { grade: 'D', count: 8,  color: '#e67e22' },
  { grade: 'F', count: 4,  color: '#e74c3c' },
];

const CLASS_SUMMARIES = [
  { name: 'Intro to Comp Sci',    code: 'CS101-A', attendance: 91, trend: '+3%', trendUp: true  },
  { name: 'Advanced Algorithms',  code: 'CS302-B', attendance: 85, trend: '-2%', trendUp: false },
  { name: 'Database Systems',     code: 'CS210',   attendance: 78, trend: '+1%', trendUp: true  },
];

const SUMMARY_STATS = [
  { icon: CheckCircle2, label: 'Overall Attendance', value: '87%',  color: '#edfaf3', textColor: '#27ae60' },
  { icon: AlertTriangle, label: 'At-Risk Students',   value: '6',    color: '#fff4e6', textColor: '#e67e22' },
  { icon: ClipboardList, label: 'Waivers Pending',    value: '3',    color: '#fff0f0', textColor: '#e74c3c' },
  { icon: Trophy, label: 'Top Attendance',     value: '100%', color: '#eef2ff', textColor: BLUE      },
];

// ─── Simple Line Chart (pure RN, no library) ─────────────────────────────────
function LineChart({ data }) {
  const H = 120;
  const PAD = { top: 16, bottom: 28, left: 8, right: 8 };
  const chartH = H - PAD.top - PAD.bottom;
  const chartW = CHART_WIDTH - PAD.left - PAD.right;
  const maxVal = 100;
  const minVal = 50;
  const range = maxVal - minVal;

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - ((d.pct - minVal) / range) * chartH,
    ...d,
  }));

  // Build SVG polyline path string
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${pts[0].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;

  return (
    <View style={{ height: H }}>
      {/* Y-axis gridlines */}
      {[100, 80, 60].map((v) => {
        const y = PAD.top + chartH - ((v - minVal) / range) * chartH;
        return (
          <View key={v} style={[styles.gridLine, { top: y }]}>
            <Text style={styles.gridLabel}>{v}%</Text>
          </View>
        );
      })}

      {/* Bars (background fill approximation with Views) */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'flex-end',
        paddingLeft: PAD.left, paddingRight: PAD.right, paddingBottom: PAD.bottom, paddingTop: PAD.top }]}>
        {pts.map((p, i) => {
          const barH = ((p.pct - minVal) / range) * chartH;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{
                width: 3, height: barH,
                backgroundColor: BLUE, opacity: 0.15, borderRadius: 2,
              }} />
            </View>
          );
        })}
      </View>

      {/* Line + dots */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Draw line segments with absolute positioned thin views */}
        {pts.map((p, i) => {
          if (i === 0) return null;
          const prev = pts[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: prev.x,
                top: prev.y - 1,
                width: len,
                height: 2.5,
                backgroundColor: BLUE,
                borderRadius: 2,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}

        {/* Dots */}
        {pts.map((p, i) => (
          <View key={i} style={{
            position: 'absolute',
            left: p.x - 5, top: p.y - 5,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: '#ffffff',
            borderWidth: 2.5, borderColor: BLUE,
          }} />
        ))}
      </View>

      {/* X-axis labels */}
      <View style={[styles.xAxis, { paddingLeft: PAD.left, paddingRight: PAD.right }]}>
        {data.map((d) => (
          <Text key={d.day} style={styles.xLabel}>{d.day}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const maxCount = Math.max(...data.map(d => d.count));
  const BAR_H = 120;

  return (
    <View style={{ height: BAR_H + 36 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_H, gap: 10 }}>
        {data.map((d) => {
          const h = Math.max(8, (d.count / maxCount) * BAR_H);
          return (
            <View key={d.grade} style={{ flex: 1, alignItems: 'center' }}>
              {/* Count on top */}
              <Text style={styles.barCount}>{d.count}</Text>
              <View style={{
                width: '70%', height: h,
                backgroundColor: d.color, borderRadius: 8,
                shadowColor: d.color, shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
              }} />
            </View>
          );
        })}
      </View>
      {/* Grade labels */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {data.map((d) => (
          <View key={d.grade} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.barLabel, { color: d.color }]}>{d.grade}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherReportsScreen({ navigation }) {
  const [period, setPeriod] = useState('Week');
  const periods = ['Week', 'Month', 'Semester'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSub}>Attendance & Performance</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn}>
            <Upload size={12} color="#fff" />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* ── Period Toggle ── */}
        <View style={styles.periodRow}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Summary Stats ── */}
        <View style={styles.statsGrid}>
          {SUMMARY_STATS.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
              <View style={{ marginBottom: 6 }}>
                <s.icon size={22} color={s.textColor} />
              </View>
              <Text style={[styles.statValue, { color: s.textColor }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Attendance Line Chart ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Attendance Trend</Text>
              <Text style={styles.cardSub}>This {period} — all classes</Text>
            </View>
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>▲ 4.2%</Text>
            </View>
          </View>
          <LineChart data={ATTENDANCE_WEEKLY} />
        </View>

        {/* ── Grade Distribution Bar Chart ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Grade Distribution</Text>
              <Text style={styles.cardSub}>All students across classes</Text>
            </View>
            <Text style={styles.totalStudents}>66 total</Text>
          </View>
          <BarChart data={GRADE_DATA} />

          {/* Legend */}
          <View style={styles.legend}>
            {GRADE_DATA.map((d) => (
              <View key={d.grade} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={styles.legendText}>Grade {d.grade} ({d.count})</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Per-Class Attendance ── */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Per-Class Summary</Text>
          {CLASS_SUMMARIES.map((cls, i) => (
            <View key={i} style={styles.classRow}>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.classCode}>{cls.code}</Text>
              </View>
              <View style={styles.classRight}>
                <Text style={styles.classAttendance}>{cls.attendance}%</Text>
                <Text style={[styles.classTrend, { color: cls.trendUp ? '#27ae60' : '#e74c3c' }]}>
                  {cls.trend}
                </Text>
              </View>
              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${cls.attendance}%`,
                  backgroundColor: cls.attendance >= 90 ? '#27ae60'
                    : cls.attendance >= 75 ? BLUE : '#e74c3c',
                }]} />
              </View>
            </View>
          ))}
        </View>

        {/* ── At-Risk Students ── */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <AlertTriangle size={16} color="#1a1f36" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle}>At-Risk Students</Text>
          </View>
          <Text style={styles.cardSub}>Below 75% attendance threshold</Text>
          {[
            { name: 'Rajan Thapa',   class: 'CS101-A', pct: 68 },
            { name: 'Anita Sharma',  class: 'CS302-B', pct: 71 },
            { name: 'Bikash Karki',  class: 'CS210',   pct: 74 },
          ].map((s, i) => (
            <View key={i} style={styles.riskRow}>
              <View style={styles.riskAvatar}>
                <Text style={styles.riskAvatarText}>{s.name.split(' ').map(n => n[0]).join('')}</Text>
              </View>
              <View style={styles.riskInfo}>
                <Text style={styles.riskName}>{s.name}</Text>
                <Text style={styles.riskClass}>{s.class}</Text>
              </View>
              <View style={styles.riskBadge}>
                <Text style={styles.riskPct}>{s.pct}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TeacherBottomNav navigation={navigation} active="Reports" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flex: 1, paddingHorizontal: 18 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 16, paddingBottom: 14,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1a1f36' },
  headerSub: { fontSize: 13, color: '#8a94a6', marginTop: 2 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BLUE, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  exportIcon: { fontSize: 12, color: '#fff' },
  exportText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // Period Toggle
  periodRow: {
    flexDirection: 'row', backgroundColor: '#f0f2f8',
    borderRadius: 14, padding: 4, marginBottom: 18,
  },
  periodBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 11,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  periodText: { fontSize: 13, fontWeight: '600', color: '#8a94a6' },
  periodTextActive: { color: '#1a1f36', fontWeight: '700' },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: (SCREEN_WIDTH - 36 - 10) / 2 - 5,
    borderRadius: 16, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 10, color: '#8a94a6', fontWeight: '600', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 18,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1a1f36' },
  cardSub: { fontSize: 12, color: '#8a94a6', marginTop: 2 },
  trendBadge: {
    backgroundColor: '#edfaf3', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  trendText: { fontSize: 11, color: '#27ae60', fontWeight: '700' },
  totalStudents: { fontSize: 13, color: '#8a94a6', fontWeight: '600', marginTop: 4 },

  // Line chart helpers
  gridLine: {
    position: 'absolute', left: 0, right: 0,
    height: 1, backgroundColor: '#f0f2f8',
  },
  gridLabel: {
    position: 'absolute', right: 0, top: -8,
    fontSize: 9, color: '#aab0be',
  },
  xAxis: {
    position: 'absolute', bottom: 0,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  xLabel: { fontSize: 9, color: '#aab0be', flex: 1, textAlign: 'center' },

  // Bar chart
  barCount: { fontSize: 10, fontWeight: '700', color: '#8a94a6', marginBottom: 4 },
  barLabel: { fontSize: 13, fontWeight: '800' },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280' },

  // Per-class rows
  classRow: { marginBottom: 14 },
  classInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  className: { fontSize: 14, fontWeight: '700', color: '#1a1f36', flex: 1 },
  classCode: { fontSize: 12, color: '#8a94a6' },
  classRight: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  classAttendance: { fontSize: 13, fontWeight: '700', color: '#1a1f36' },
  classTrend: { fontSize: 12, fontWeight: '600' },
  progressBg: {
    height: 6, backgroundColor: '#f0f2f8', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  // At-risk rows
  riskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f7fa',
  },
  riskAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff4e6', justifyContent: 'center', alignItems: 'center',
  },
  riskAvatarText: { fontSize: 12, fontWeight: '800', color: '#e67e22' },
  riskInfo: { flex: 1 },
  riskName: { fontSize: 14, fontWeight: '700', color: '#1a1f36' },
  riskClass: { fontSize: 12, color: '#8a94a6' },
  riskBadge: {
    backgroundColor: '#fff0f0', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  riskPct: { fontSize: 13, fontWeight: '800', color: '#e74c3c' },
});