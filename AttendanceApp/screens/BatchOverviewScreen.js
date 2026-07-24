import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { triggerExport } from '../utils/exportHelper';
import { ChevronLeft, ChevronRight, Users, BookOpen, AlertTriangle, BarChart2, Download } from 'lucide-react-native';

const BLUE = '#2952e3';

// ─── Batch Card ───────────────────────────────────────────────────────────────
function BatchCard({ batch, onPress, onExport, exportingId, isDarkMode }) {
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const divider = isDarkMode ? '#252b3e' : '#f0f2f5';
  const metaBg  = isDarkMode ? '#252b3e' : '#f8f9ff';

  const hasData  = batch.average_attendance_percent !== null;
  const avgPct   = hasData ? batch.average_attendance_percent : null;
  const atRisk   = batch.at_risk_count ?? 0;
  const isExporting = exportingId === batch.batch_id;

  const pctColor = !hasData
    ? (isDarkMode ? '#5a6080' : '#aab0be')
    : avgPct >= 75 ? '#27ae60'
    : avgPct >= 50 ? '#f39c12'
    : '#e74c3c';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top row: icon + name + export + chevron */}
      <View style={styles.cardTop}>
        <View style={[styles.batchIcon, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
          <BarChart2 size={20} color={BLUE} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.batchName, { color: textPri }]} numberOfLines={1}>
            {batch.batch_name}
          </Text>
          {batch.description ? (
            <Text style={[styles.batchDesc, { color: textSub }]} numberOfLines={1}>
              {batch.description}
            </Text>
          ) : null}
        </View>
        {/* Export button — stops event propagation so it doesn't navigate */}
        <TouchableOpacity
          style={[styles.exportIconBtn, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}
          onPress={(e) => { e.stopPropagation?.(); onExport(batch); }}
          activeOpacity={0.75}
          disabled={isExporting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isExporting
            ? <ActivityIndicator size="small" color={BLUE} />
            : <Download size={14} color={BLUE} />
          }
        </TouchableOpacity>
        <ChevronRight size={18} color={isDarkMode ? '#5a6080' : '#c0c6d4'} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: divider }]} />

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: metaBg }]}>
        {/* Students */}
        <View style={styles.statItem}>
          <Users size={13} color={textSub} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: textPri }]}>{batch.student_count}</Text>
          <Text style={[styles.statLabel, { color: textSub }]}>Students</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: divider }]} />

        {/* Classes */}
        <View style={styles.statItem}>
          <BookOpen size={13} color={textSub} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: textPri }]}>{batch.class_count}</Text>
          <Text style={[styles.statLabel, { color: textSub }]}>Classes</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: divider }]} />

        {/* Avg attendance */}
        <View style={styles.statItem}>
          <BarChart2 size={13} color={textSub} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: pctColor }]}>
            {hasData ? `${avgPct}%` : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: textSub }]}>Avg Attend.</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: divider }]} />

        {/* At-risk */}
        <View style={styles.statItem}>
          <AlertTriangle size={13} color={atRisk > 0 ? '#e74c3c' : textSub} style={{ marginBottom: 4 }} />
          <View style={atRisk > 0 ? styles.riskBadge : null}>
            <Text style={[
              styles.statValue,
              { color: atRisk > 0 ? '#e74c3c' : textPri },
            ]}>
              {atRisk}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: textSub }]}>At Risk</Text>
        </View>
      </View>

      {/* No-data hint */}
      {!hasData && (
        <Text style={[styles.noDataHint, { color: textSub }]}>
          No attendance data yet — link classes and run sessions to see stats
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BatchOverviewScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();

  const [batches,    setBatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [exportingId, setExportingId] = useState(null); // batch_id currently exporting

  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg = isDarkMode ? '#1a1f2e' : '#ffffff';
  const border   = isDarkMode ? '#2a2f42' : '#eef1f5';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';

  const fetchBatches = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(API.adminBatchSummary, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load batch summary');
      setBatches(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Network error — check your connection and try again');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Initial load
  React.useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // Reload when navigating back to this screen
  React.useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (!loading) fetchBatches();
    });
    return unsub;
  }, [navigation, loading, fetchBatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  const handleExport = (batch) => {
    Alert.alert(
      'Export Batch Report',
      `Export attendance report for "${batch.batch_name}" (${batch.student_count} students, ${batch.class_count} classes)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export Excel',
          onPress: () => triggerExport({
            token,
            reportType: 'batch',
            format:     'excel',
            batchId:    batch.batch_id,
            label:      `Batch_${batch.batch_name}_${batch.student_count}_students`,
            onStart:    () => setExportingId(batch.batch_id),
            onEnd:      () => setExportingId(null),
          }),
        },
        {
          text: 'Export CSV',
          onPress: () => triggerExport({
            token,
            reportType: 'batch',
            format:     'csv',
            batchId:    batch.batch_id,
            label:      `Batch_${batch.batch_name}_${batch.student_count}_students`,
            onStart:    () => setExportingId(batch.batch_id),
            onEnd:      () => setExportingId(null),
          }),
        },
      ]
    );
  };

  // Summary totals for the header strip
  const totalStudents  = batches.reduce((s, b) => s + b.student_count, 0);
  const totalAtRisk    = batches.reduce((s, b) => s + b.at_risk_count, 0);
  const batchesWithData = batches.filter(b => b.average_attendance_percent !== null);
  const overallAvg     = batchesWithData.length
    ? Math.round(batchesWithData.reduce((s, b) => s + b.average_attendance_percent, 0) / batchesWithData.length)
    : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={headerBg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textPri }]}>Batch Analytics</Text>
          <Text style={[styles.headerSub, { color: textSub }]}>Overview by batch</Text>
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
        {/* ── Loading state ── */}
        {loading && (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        )}

        {/* ── Error state ── */}
        {!loading && error && (
          <View style={styles.errorBox}>
            <AlertTriangle size={36} color="#e74c3c" style={{ marginBottom: 12 }} />
            <Text style={[styles.errorTitle, { color: textPri }]}>Couldn't load batches</Text>
            <Text style={[styles.errorSub, { color: textSub }]}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setLoading(true); fetchBatches(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Loaded ── */}
        {!loading && !error && (
          <>
            {/* Summary strip */}
            {batches.length > 0 && (
              <View style={styles.summaryStrip}>
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
                  <Text style={[styles.summaryVal, { color: BLUE }]}>{batches.length}</Text>
                  <Text style={[styles.summaryLbl, { color: textSub }]}>Batches</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
                  <Text style={[styles.summaryVal, { color: textPri }]}>{totalStudents}</Text>
                  <Text style={[styles.summaryLbl, { color: textSub }]}>Students</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
                  <Text style={[styles.summaryVal, { color: overallAvg !== null ? '#27ae60' : textSub }]}>
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

            {/* Batch count label */}
            {batches.length > 0 && (
              <Text style={[styles.countLabel, { color: textSub }]}>
                {batches.length} batch{batches.length !== 1 ? 'es' : ''}
              </Text>
            )}

            {/* Batch cards */}
            {batches.map(batch => (
              <BatchCard
                key={batch.batch_id}
                batch={batch}
                isDarkMode={isDarkMode}
                exportingId={exportingId}
                onExport={handleExport}
                onPress={() =>
                  navigation.navigate('ClassList', {
                    batch_id:   batch.batch_id,
                    batch_name: batch.batch_name,
                  })
                }
              />
            ))}

            {/* Empty state */}
            {batches.length === 0 && (
              <View style={styles.emptyBox}>
                <BarChart2 size={44} color="#aab0be" style={{ marginBottom: 14 }} />
                <Text style={[styles.emptyTitle, { color: textPri }]}>No Batches Yet</Text>
                <Text style={[styles.emptySub, { color: textSub }]}>
                  Create batches from Manage Batches to see analytics here
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
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub:   { fontSize: 11, marginTop: 1 },

  // Scroll
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  // Summary strip
  summaryStrip: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  summaryLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },

  countLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10 },

  // Batch card
  card: {
    borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  batchIcon: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitleBlock: { flex: 1 },
  batchName: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  batchDesc: { fontSize: 12 },

  divider: { height: 1, marginHorizontal: 16 },

  // Stats row
  statsRow: {
    flexDirection: 'row', paddingVertical: 14,
  },
  statItem: {
    flex: 1, alignItems: 'center',
  },
  statDivider: { width: 1 },
  statValue: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  riskBadge: {
    backgroundColor: '#fff0f0', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1,
  },

  exportIconBtn: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 4,
  },

  noDataHint: {
    fontSize: 11, paddingHorizontal: 16, paddingBottom: 12,
    textAlign: 'center', fontStyle: 'italic',
  },

  // Loading / error / empty
  errorBox: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32,
  },
  errorTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  errorSub:   { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  retryBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  retryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
