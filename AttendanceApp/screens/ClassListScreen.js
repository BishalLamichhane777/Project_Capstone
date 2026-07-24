import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  ChevronLeft, ChevronRight, Users, Calendar,
  AlertTriangle, BookOpen, BarChart2,
} from 'lucide-react-native';

const BLUE = '#2952e3';

// ─── Attendance colour helper (same logic as BatchOverviewScreen) ─────────────
function pctColor(avg, isDarkMode) {
  if (avg === null) return isDarkMode ? '#5a6080' : '#aab0be';
  if (avg >= 75)   return '#27ae60';
  if (avg >= 50)   return '#f39c12';
  return '#e74c3c';
}

// ─── Class Card ───────────────────────────────────────────────────────────────
function ClassCard({ cls, onPress, isDarkMode }) {
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const divider = isDarkMode ? '#252b3e' : '#f0f2f5';
  const metaBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const iconBg  = isDarkMode ? '#1e2540' : '#eef2ff';

  const hasData = cls.average_attendance_percent !== null;
  const avgPct  = cls.average_attendance_percent;
  const atRisk  = cls.at_risk_count ?? 0;
  const color   = pctColor(avgPct, isDarkMode);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top row: icon + name/subject + chevron */}
      <View style={styles.cardTop}>
        <View style={[styles.classIcon, { backgroundColor: iconBg }]}>
          <BookOpen size={20} color={BLUE} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.className, { color: textPri }]} numberOfLines={1}>
            {cls.class_name}
          </Text>
          <Text style={[styles.classSubject, { color: textSub }]} numberOfLines={1}>
            {cls.subject}{cls.room ? ` · ${cls.room}` : ''}
          </Text>
        </View>
        <ChevronRight size={18} color={isDarkMode ? '#5a6080' : '#c0c6d4'} />
      </View>

      {/* Meta pill row */}
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
          <Calendar size={11} color={BLUE} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: BLUE }]}>
            {cls.session_count} session{cls.session_count !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
          <Users size={11} color={BLUE} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: BLUE }]}>
            {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: divider }]} />

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: metaBg }]}>
        {/* Avg attendance */}
        <View style={styles.statItem}>
          <BarChart2 size={13} color={textSub} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color }]}>
            {hasData ? `${avgPct}%` : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: textSub }]}>Avg Attend.</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: divider }]} />

        {/* At-risk */}
        <View style={styles.statItem}>
          <AlertTriangle
            size={13}
            color={atRisk > 0 ? '#e74c3c' : textSub}
            style={{ marginBottom: 4 }}
          />
          <View style={atRisk > 0 ? styles.riskBadge : null}>
            <Text style={[styles.statValue, { color: atRisk > 0 ? '#e74c3c' : textPri }]}>
              {atRisk}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: textSub }]}>At Risk</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: divider }]} />

        {/* Sessions */}
        <View style={styles.statItem}>
          <Calendar size={13} color={textSub} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: textPri }]}>{cls.session_count}</Text>
          <Text style={[styles.statLabel, { color: textSub }]}>Sessions</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: divider }]} />

        {/* Students */}
        <View style={styles.statItem}>
          <Users size={13} color={textSub} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: textPri }]}>{cls.student_count}</Text>
          <Text style={[styles.statLabel, { color: textSub }]}>Students</Text>
        </View>
      </View>

      {/* No-data hint */}
      {!hasData && (
        <Text style={[styles.noDataHint, { color: textSub }]}>
          No sessions held yet — run a class session to see attendance stats
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ClassListScreen({ navigation, route }) {
  const { token, isDarkMode } = useAuth();
  const { batch_id, batch_name } = route.params ?? {};

  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg = isDarkMode ? '#1a1f2e' : '#ffffff';
  const border   = isDarkMode ? '#2a2f42' : '#eef1f5';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';

  const fetchClasses = useCallback(async () => {
    setError(null);
    try {
      const url = `${API.adminBatchClassesSummary}/${batch_id}/classes/summary`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 404) {
        throw new Error(data.error || `Batch ${batch_id} not found`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load class list');
      }
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Network error — check your connection and try again');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, batch_id]);

  // Initial load
  React.useEffect(() => { fetchClasses(); }, [fetchClasses]);

  // Reload on focus (e.g. coming back from ClassDetail)
  React.useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (!loading) fetchClasses();
    });
    return unsub;
  }, [navigation, loading, fetchClasses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClasses();
  };

  // Summary totals strip
  const classesWithData = classes.filter(c => c.average_attendance_percent !== null);
  const overallAvg = classesWithData.length
    ? Math.round(
        classesWithData.reduce((s, c) => s + c.average_attendance_percent, 0) /
        classesWithData.length
      )
    : null;
  const totalAtRisk = classes.reduce((s, c) => s + (c.at_risk_count ?? 0), 0);
  const totalStudents = classes.reduce((s, c) => s + c.student_count, 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={headerBg}
      />

      {/* Header — back navigation is automatic via the stack */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textPri }]} numberOfLines={1}>
            {batch_name ?? 'Batch Classes'}
          </Text>
          <Text style={[styles.headerSub, { color: textSub }]}>Classes in this batch</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BLUE}
            colors={[BLUE]}
          />
        }
      >
        {/* ── Loading ── */}
        {loading && (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <View style={styles.errorBox}>
            <AlertTriangle size={36} color="#e74c3c" style={{ marginBottom: 12 }} />
            <Text style={[styles.errorTitle, { color: textPri }]}>Couldn't load classes</Text>
            <Text style={[styles.errorSub, { color: textSub }]}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setLoading(true); fetchClasses(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={[styles.backLinkText, { color: textSub }]}>← Go back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Loaded ── */}
        {!loading && !error && (
          <>
            {/* Summary strip */}
            {classes.length > 0 && (
              <View style={styles.summaryStrip}>
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
                  <Text style={[styles.summaryVal, { color: BLUE }]}>{classes.length}</Text>
                  <Text style={[styles.summaryLbl, { color: textSub }]}>Classes</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
                  <Text style={[styles.summaryVal, { color: textPri }]}>{totalStudents}</Text>
                  <Text style={[styles.summaryLbl, { color: textSub }]}>Students</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
                  <Text style={[styles.summaryVal, { color: pctColor(overallAvg, isDarkMode) }]}>
                    {overallAvg !== null ? `${overallAvg}%` : '—'}
                  </Text>
                  <Text style={[styles.summaryLbl, { color: textSub }]}>Avg Attend.</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
                  <Text style={[styles.summaryVal, { color: totalAtRisk > 0 ? '#e74c3c' : '#27ae60' }]}>
                    {totalAtRisk}
                  </Text>
                  <Text style={[styles.summaryLbl, { color: textSub }]}>At Risk</Text>
                </View>
              </View>
            )}

            {/* Count label */}
            {classes.length > 0 && (
              <Text style={[styles.countLabel, { color: textSub }]}>
                {classes.length} class{classes.length !== 1 ? 'es' : ''} linked
              </Text>
            )}

            {/* Class cards */}
            {classes.map(cls => (
              <ClassCard
                key={cls.class_id}
                cls={cls}
                isDarkMode={isDarkMode}
                onPress={() =>
                  navigation.navigate('ClassDetail', {
                    class_id:   cls.class_id,
                    class_name: cls.class_name,
                    batch_id,
                  })
                }
              />
            ))}

            {/* Empty state */}
            {classes.length === 0 && (
              <View style={styles.emptyBox}>
                <BookOpen size={44} color="#aab0be" style={{ marginBottom: 14 }} />
                <Text style={[styles.emptyTitle, { color: textPri }]}>No Classes Linked</Text>
                <Text style={[styles.emptySub, { color: textSub }]}>
                  No classes have been linked to this batch yet.{'\n'}
                  Use Manage Batches to enroll the batch into a class.
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn:      { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '800' },
  headerSub:    { fontSize: 11, marginTop: 1 },

  // Scroll
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  // Summary strip — identical metrics to BatchOverviewScreen
  summaryStrip: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  summaryLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },

  countLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10 },

  // Class card — same structure as BatchCard
  card: {
    borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  classIcon: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitleBlock: { flex: 1 },
  className:    { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  classSubject: { fontSize: 12 },

  // Pill row (sessions · students quick-glance)
  pillRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, marginHorizontal: 16 },

  // Stats row
  statsRow:   { flexDirection: 'row', paddingVertical: 14 },
  statItem:   { flex: 1, alignItems: 'center' },
  statDivider: { width: 1 },
  statValue:  { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  statLabel:  { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  riskBadge: {
    backgroundColor: '#fff0f0', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1,
  },

  noDataHint: {
    fontSize: 11, paddingHorizontal: 16, paddingBottom: 12,
    textAlign: 'center', fontStyle: 'italic',
  },

  // Error state — exact match to BatchOverviewScreen
  errorBox: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32,
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

  // Empty state
  emptyBox:   { alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
