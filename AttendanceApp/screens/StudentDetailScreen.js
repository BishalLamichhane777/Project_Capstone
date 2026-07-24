import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { triggerExport } from '../utils/exportHelper';
import {
  ChevronLeft, AlertTriangle, CheckCircle, XCircle,
  BookOpen, Calendar, BarChart2, Download,
} from 'lucide-react-native';

const BLUE  = '#2952e3';
const GREEN = '#27ae60';
const RED   = '#e74c3c';
const AMBER = '#f39c12';

// ─── Colour helper (shared with ClassDetailScreen) ───────────────────────────
function pctColor(pct) {
  if (pct === null || pct === undefined) return '#aab0be';
  if (pct >= 75) return GREEN;
  if (pct >= 50) return AMBER;
  return RED;
}

// ─── Summary stat card ───────────────────────────────────────────────────────
function StatCard({ value, label, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Per-class row ────────────────────────────────────────────────────────────
function ClassRow({ cls, isDarkMode }) {
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#6b7280';
  const divBg   = isDarkMode ? '#252b3e' : '#f0f2f5';

  const hasData = cls.attendance_percent !== null && cls.attendance_percent !== undefined;
  const color   = pctColor(cls.attendance_percent);

  return (
    <View style={[styles.classRow, { backgroundColor: cardBg }]}>
      <View style={[styles.classIconWrap, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
        <BookOpen size={16} color={BLUE} />
      </View>
      <View style={styles.classRowInfo}>
        <Text style={[styles.classRowName, { color: textPri }]} numberOfLines={1}>
          {cls.class_name}
        </Text>
        <Text style={[styles.classRowSub, { color: textSub }]}>{cls.subject}</Text>
        <View style={styles.classRowPills}>
          <View style={[styles.pill, { backgroundColor: isDarkMode ? '#1a2e1e' : '#edfaf3' }]}>
            <CheckCircle size={9} color={GREEN} style={{ marginRight: 3 }} />
            <Text style={[styles.pillText, { color: GREEN }]}>{cls.present_count}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0' }]}>
            <XCircle size={9} color={RED} style={{ marginRight: 3 }} />
            <Text style={[styles.pillText, { color: RED }]}>{cls.absent_count}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: divBg }]}>
            <Calendar size={9} color={textSub} style={{ marginRight: 3 }} />
            <Text style={[styles.pillText, { color: textSub }]}>{cls.session_count}</Text>
          </View>
        </View>
      </View>
      <View style={styles.classRowPct}>
        <Text style={[styles.classRowPctVal, { color }]}>
          {hasData ? `${cls.attendance_percent}%` : '—'}
        </Text>
        <Text style={[styles.classRowPctLbl, { color: textSub }]}>
          {hasData ? 'attend.' : 'no data'}
        </Text>
      </View>
    </View>
  );
}

// ─── Recent session row ───────────────────────────────────────────────────────
function SessionRow({ session, isDarkMode }) {
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#6b7280';

  const isPresent = session.status === 'Present';
  const statusColor  = isPresent ? GREEN : RED;
  const statusBg     = isPresent
    ? (isDarkMode ? '#1a2e1e' : '#edfaf3')
    : (isDarkMode ? '#2e1a1a' : '#fff0f0');

  // Format date: "Mon 12 Jul"
  const dateStr = session.date
    ? new Date(session.date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : '—';

  return (
    <View style={[styles.sessionRow, { backgroundColor: cardBg }]}>
      <View style={[styles.statusDot, { backgroundColor: statusBg }]}>
        {isPresent
          ? <CheckCircle size={14} color={GREEN} />
          : <XCircle    size={14} color={RED}   />
        }
      </View>
      <View style={styles.sessionInfo}>
        <Text style={[styles.sessionClass, { color: textPri }]} numberOfLines={1}>
          {session.class_name}
        </Text>
        <Text style={[styles.sessionDate, { color: textSub }]}>{dateStr}</Text>
      </View>
      <View style={styles.sessionRight}>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {session.status}
          </Text>
        </View>
        {session.waived && (
          <View style={styles.waivedBadge}>
            <Text style={styles.waivedText}>Waived</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, isDarkMode }) {
  return (
    <Text style={[styles.sectionHeader, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
      {title}
    </Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentDetailScreen({ navigation, route }) {
  const { token, isDarkMode } = useAuth();
  const { student_id, fullname: navFullname, class_id } = route.params ?? {};

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [exporting,  setExporting]  = useState(false);

  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg = isDarkMode ? '#1a1f2e' : '#ffffff';
  const border   = isDarkMode ? '#2a2f42' : '#eef1f5';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const cardBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const divBg    = isDarkMode ? '#252b3e' : '#f0f2f5';

  const fetchDetail = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `${API.adminStudentDetail2}/${student_id}/detail`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (res.status === 404) throw new Error(json.error || `Student ${student_id} not found`);
      if (!res.ok)            throw new Error(json.error || 'Failed to load student detail');
      setData(json);
    } catch (e) {
      setError(e.message || 'Network error — check your connection');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, student_id]);

  React.useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const onRefresh = () => { setRefreshing(true); fetchDetail(); };

  const handleExport = () => {
    const name  = data?.fullname   ?? navFullname ?? 'Student';
    const roll  = data?.roll_number ?? String(student_id);
    const label = `${name}_${roll}_attendance`;
    Alert.alert(
      'Export Student Report',
      `Export full attendance report for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export Excel',
          onPress: () => triggerExport({
            token,
            reportType: 'student',
            format:     'excel',
            studentId:  student_id,
            label,
            onStart: () => setExporting(true),
            onEnd:   () => setExporting(false),
          }),
        },
        {
          text: 'Export CSV',
          onPress: () => triggerExport({
            token,
            reportType: 'student',
            format:     'csv',
            studentId:  student_id,
            label,
            onStart: () => setExporting(true),
            onEnd:   () => setExporting(false),
          }),
        },
      ]
    );
  };

  const displayName = data?.fullname ?? navFullname ?? 'Student';
  const rollNumber  = data?.roll_number ?? '';
  const program     = data?.program ?? '';
  const yearOfStudy = data?.year_of_study;
  const overallPct  = data?.overall_attendance_percent;
  const hasOverall  = overallPct !== null && overallPct !== undefined;
  const overallColor = pctColor(overallPct);
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={headerBg}
      />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textPri }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.headerSub, { color: textSub }]} numberOfLines={1}>
            {rollNumber}{program ? `  ·  ${program}` : ''}{yearOfStudy ? `  Y${yearOfStudy}` : ''}
          </Text>
        </View>
        {/* Export button — wired in step 8 */}
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExport}
          disabled={exporting || loading || !data}
          activeOpacity={0.75}
        >
          {exporting
            ? <ActivityIndicator size="small" color={BLUE} />
            : <Download size={18} color={(!data || loading) ? (isDarkMode ? '#5a6080' : '#c0c6d4') : BLUE} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Loading ── */}
      {loading && <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />}

      {/* ── Error ── */}
      {!loading && error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={36} color={RED} style={{ marginBottom: 12 }} />
          <Text style={[styles.errorTitle, { color: textPri }]}>Couldn't load student</Text>
          <Text style={[styles.errorSub, { color: textSub }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchDetail(); }} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backLinkText, { color: textSub }]}>← Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Content ── */}
      {!loading && !error && data && (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              tintColor={BLUE} colors={[BLUE]} />
          }
        >
          {/* ── Avatar + overall stats ── */}
          <View style={[styles.profileCard, { backgroundColor: cardBg }]}>
            <View style={[styles.avatarLg, { backgroundColor: isDarkMode ? '#252b3e' : '#eef2ff' }]}>
              <Text style={[styles.avatarLgText, { color: BLUE }]}>{initials}</Text>
            </View>
            <Text style={[styles.profileName, { color: textPri }]}>{displayName}</Text>
            {rollNumber ? <Text style={[styles.profileRoll, { color: textSub }]}>{rollNumber}</Text> : null}
            {(program || yearOfStudy) ? (
              <Text style={[styles.profileProgram, { color: textSub }]}>
                {program}{program && yearOfStudy ? ' · ' : ''}{yearOfStudy ? `Year ${yearOfStudy}` : ''}
              </Text>
            ) : null}
          </View>

          {/* ── Summary stat cards ── */}
          <View style={styles.statsRow}>
            <StatCard
              value={hasOverall ? `${overallPct}%` : '—'}
              label="Overall"
              color={overallColor}
              bg={cardBg}
            />
            <StatCard
              value={data.total_sessions}
              label="Sessions"
              color={textPri}
              bg={cardBg}
            />
            <StatCard
              value={data.total_present}
              label="Present"
              color={GREEN}
              bg={cardBg}
            />
            <StatCard
              value={data.total_absent}
              label="Absent"
              color={data.total_absent > 0 ? RED : textPri}
              bg={cardBg}
            />
          </View>

          {/* ── At-risk banner ── */}
          {hasOverall && overallPct < 75 && (
            <View style={styles.riskBanner}>
              <AlertTriangle size={14} color={RED} style={{ marginRight: 8 }} />
              <Text style={styles.riskBannerText}>
                Below 75% — this student is at risk
              </Text>
            </View>
          )}

          {/* ── Per-class breakdown ── */}
          {data.classes.length > 0 && (
            <>
              <SectionHeader title="CLASS BREAKDOWN" isDarkMode={isDarkMode} />
              {data.classes.map(cls => (
                <ClassRow key={cls.class_id} cls={cls} isDarkMode={isDarkMode} />
              ))}
            </>
          )}

          {data.classes.length === 0 && (
            <View style={[styles.emptySection, { backgroundColor: cardBg }]}>
              <BookOpen size={32} color="#aab0be" style={{ marginBottom: 8 }} />
              <Text style={[styles.emptySectionText, { color: textSub }]}>
                Not enrolled in any classes
              </Text>
            </View>
          )}

          {/* ── Recent sessions ── */}
          <SectionHeader title="RECENT SESSIONS (LAST 10)" isDarkMode={isDarkMode} />
          {data.recent_sessions.length > 0
            ? data.recent_sessions.map(s => (
                <SessionRow key={s.session_id} session={s} isDarkMode={isDarkMode} />
              ))
            : (
              <View style={[styles.emptySection, { backgroundColor: cardBg }]}>
                <Calendar size={32} color="#aab0be" style={{ marginBottom: 8 }} />
                <Text style={[styles.emptySectionText, { color: textSub }]}>
                  No session records yet
                </Text>
              </View>
            )
          }

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <AdminBottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn:      { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '800' },
  headerSub:    { fontSize: 11, marginTop: 1 },
  exportBtn:    { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },

  scroll: { flex: 1, paddingHorizontal: 14, paddingTop: 14 },

  // Profile card
  profileCard: {
    borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarLg: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  avatarLgText:  { fontSize: 22, fontWeight: '800' },
  profileName:   { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  profileRoll:   { fontSize: 12, marginBottom: 2 },
  profileProgram:{ fontSize: 12 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8a94a6', letterSpacing: 0.3 },

  // At-risk banner
  riskBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff0f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  riskBannerText: { fontSize: 13, color: RED, fontWeight: '700' },

  sectionHeader: {
    fontSize: 10, fontWeight: '800', letterSpacing: 0.8,
    marginBottom: 8, marginTop: 4,
  },

  // Class row
  classRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  classIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  classRowInfo:    { flex: 1, minWidth: 0 },
  classRowName:    { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  classRowSub:     { fontSize: 11, marginBottom: 4 },
  classRowPills:   { flexDirection: 'row', gap: 5 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },
  pillText:      { fontSize: 10, fontWeight: '700' },
  classRowPct:   { alignItems: 'center', minWidth: 50 },
  classRowPctVal:{ fontSize: 17, fontWeight: '800' },
  classRowPctLbl:{ fontSize: 9, fontWeight: '700', marginTop: 1 },

  // Session row
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 11, marginBottom: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statusDot: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  sessionInfo:  { flex: 1, minWidth: 0 },
  sessionClass: { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  sessionDate:  { fontSize: 11 },
  sessionRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  waivedBadge: {
    backgroundColor: '#fff8e6', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  waivedText: { fontSize: 10, fontWeight: '700', color: AMBER },

  // Empty section
  emptySection: {
    borderRadius: 14, padding: 28, alignItems: 'center', marginBottom: 12,
  },
  emptySectionText: { fontSize: 13 },

  // Error
  errorBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 40,
  },
  errorTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  errorSub:   { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  retryBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12, marginBottom: 12,
  },
  retryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  backLink:     { paddingVertical: 8 },
  backLinkText: { fontSize: 13, fontWeight: '600' },
});
