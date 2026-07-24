import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, StatusBar,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { triggerExport } from '../utils/exportHelper';
import {
  ChevronLeft, Search, X, AlertTriangle, Users,
  Calendar, CheckCircle, XCircle, BarChart2, Download,
} from 'lucide-react-native';

const BLUE  = '#2952e3';
const PAGE_SIZE = 25;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pctColor(pct, isDarkMode) {
  if (pct === null || pct === undefined) return isDarkMode ? '#5a6080' : '#aab0be';
  if (pct >= 75) return '#27ae60';
  if (pct >= 50) return '#f39c12';
  return '#e74c3c';
}

// ─── Student Row ─────────────────────────────────────────────────────────────
function StudentRow({ student, onPress, isDarkMode }) {
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#6b7280';
  const divBg   = isDarkMode ? '#252b3e' : '#f0f2f5';

  const hasData  = student.attendance_percent !== null && student.attendance_percent !== undefined;
  const pct      = student.attendance_percent;
  const color    = pctColor(pct, isDarkMode);
  const initials = (student.fullname || '??')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Avatar + name block */}
      <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#252b3e' : '#eef2ff' }]}>
        <Text style={[styles.avatarText, { color: BLUE }]}>{initials}</Text>
      </View>

      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text style={[styles.rowName, { color: textPri }]} numberOfLines={1}>
            {student.fullname}
          </Text>
          {student.is_at_risk && (
            <View style={styles.atRiskBadge}>
              <AlertTriangle size={9} color="#e74c3c" style={{ marginRight: 3 }} />
              <Text style={styles.atRiskText}>At Risk</Text>
            </View>
          )}
        </View>
        <Text style={[styles.rollText, { color: textSub }]}>{student.roll_number}</Text>

        {/* Present / absent mini pills */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: isDarkMode ? '#1a2e1e' : '#edfaf3' }]}>
            <CheckCircle size={10} color="#27ae60" style={{ marginRight: 3 }} />
            <Text style={[styles.pillText, { color: '#27ae60' }]}>{student.present_count}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0' }]}>
            <XCircle size={10} color="#e74c3c" style={{ marginRight: 3 }} />
            <Text style={[styles.pillText, { color: '#e74c3c' }]}>{student.absent_count}</Text>
          </View>
        </View>
      </View>

      {/* Attendance % */}
      <View style={styles.pctBlock}>
        <Text style={[styles.pctValue, { color }]}>
          {hasData ? `${pct}%` : '—'}
        </Text>
        <Text style={[styles.pctLabel, { color: textSub }]}>
          {hasData ? 'attend.' : 'no data'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter / Sort chip row ───────────────────────────────────────────────────
function ChipRow({ value, options, onChange, isDarkMode }) {
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inactBg = isDarkMode ? '#252b3e' : '#f0f2f5';
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              active
                ? { backgroundColor: BLUE }
                : { backgroundColor: inactBg },
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.chipText,
              { color: active ? '#ffffff' : textSub },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ClassDetailScreen({ navigation, route }) {
  const { token, isDarkMode } = useAuth();
  const { class_id, class_name, batch_id } = route.params ?? {};

  // ── Server-side state ────────────────────────────────────────────
  const [students,    setStudents]    = useState([]);
  const [meta,        setMeta]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [exporting,   setExporting]   = useState(false);

  // ── Filter / sort state ──────────────────────────────────────────
  const [searchInput,  setSearchInput]  = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');   // debounced
  const [riskFilter,   setRiskFilter]   = useState('all');
  const [sortOrder,    setSortOrder]    = useState('attendance_asc');

  // Debounce search — fire API 450ms after typing stops
  const debounceRef = useRef(null);
  const handleSearchChange = (text) => {
    setSearchInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(text.trim()), 450);
  };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Theme ────────────────────────────────────────────────────────
  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg = isDarkMode ? '#1a1f2e' : '#ffffff';
  const border   = isDarkMode ? '#2a2f42' : '#eef1f5';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  // ── Fetch (reset to page 1) ───────────────────────────────────────
  const fetchRoster = useCallback(async (reset = true) => {
    const targetPage = reset ? 1 : page + 1;
    if (!reset) setLoadingMore(true);
    else { setLoading(true); setError(null); }

    try {
      const params = new URLSearchParams({
        page:      String(targetPage),
        page_size: String(PAGE_SIZE),
        sort:      sortOrder,
        risk:      riskFilter,
      });
      if (searchQuery) params.set('search', searchQuery);

      const url = `${API.adminClassRoster}/${class_id}/students?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (res.status === 404) throw new Error(data.error || `Class ${class_id} not found`);
      if (!res.ok)            throw new Error(data.error || 'Failed to load roster');

      const incoming = data.students ?? [];
      setMeta({
        class_name:    data.class_name,
        subject:       data.subject,
        session_count: data.session_count,
        total_count:   data.total_count,
        at_risk_threshold: data.at_risk_threshold_percent,
      });

      if (reset) {
        setStudents(incoming);
        setPage(1);
      } else {
        setStudents(prev => [...prev, ...incoming]);
        setPage(targetPage);
      }
      setHasMore((reset ? incoming.length : students.length + incoming.length) < data.total_count);
    } catch (e) {
      setError(e.message || 'Network error — check your connection');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [token, class_id, searchQuery, riskFilter, sortOrder, page, students.length]);

  // Re-fetch whenever filters / sort change (reset to page 1)
  useEffect(() => { fetchRoster(true); }, [searchQuery, riskFilter, sortOrder]);

  const onRefresh   = () => { setRefreshing(true); fetchRoster(true); };
  const onLoadMore  = () => { if (!loadingMore && hasMore) fetchRoster(false); };

  // ── Export — sends current search/risk filters to backend ────────
  const handleExport = () => {
    const filterDesc = riskFilter !== 'all'
      ? ` (${riskFilter === 'at_risk' ? 'at-risk' : 'good standing'})`
      : '';
    const countDesc  = `${totalCount} student${totalCount !== 1 ? 's' : ''}`;
    const label      = `${displayName}${filterDesc}_${countDesc}`;

    Alert.alert(
      'Export Class Report',
      `Export "${displayName}"${filterDesc}?\n${countDesc} will be included.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export Excel',
          onPress: () => triggerExport({
            token,
            reportType: 'class_roster',
            format:     'excel',
            classId:    class_id,
            risk:       riskFilter,
            search:     searchQuery,
            label,
            onStart: () => setExporting(true),
            onEnd:   () => setExporting(false),
          }),
        },
        {
          text: 'Export CSV',
          onPress: () => triggerExport({
            token,
            reportType: 'class_roster',
            format:     'csv',
            classId:    class_id,
            risk:       riskFilter,
            search:     searchQuery,
            label,
            onStart: () => setExporting(true),
            onEnd:   () => setExporting(false),
          }),
        },
      ]
    );
  };

  const displayName = meta?.class_name ?? class_name ?? 'Class Roster';
  const subject     = meta?.subject    ?? '';
  const sessionCount = meta?.session_count ?? 0;
  const totalCount   = meta?.total_count   ?? 0;

  // ── Render helpers ────────────────────────────────────────────────
  const renderStudent = ({ item }) => (
    <StudentRow
      student={item}
      isDarkMode={isDarkMode}
      onPress={() => navigation.navigate('StudentDetail', {
        student_id: item.student_id,
        fullname:   item.fullname,
        class_id,
      })}
    />
  );

  const renderFooter = () => {
    if (loadingMore) return <ActivityIndicator color={BLUE} style={{ marginVertical: 16 }} />;
    if (hasMore) return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore} activeOpacity={0.8}>
        <Text style={styles.loadMoreText}>Load more</Text>
      </TouchableOpacity>
    );
    return null;
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyBox}>
        <Users size={44} color="#aab0be" style={{ marginBottom: 14 }} />
        <Text style={[styles.emptyTitle, { color: textPri }]}>
          {searchQuery || riskFilter !== 'all' ? 'No students match' : 'No Students Enrolled'}
        </Text>
        <Text style={[styles.emptySub, { color: textSub }]}>
          {searchQuery || riskFilter !== 'all'
            ? 'Try adjusting your search or filter'
            : 'No students are enrolled in this class yet'}
        </Text>
      </View>
    );
  };

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
          <Text style={[styles.headerSub, { color: textSub }]}>
            {subject}{subject && sessionCount > 0 ? '  ·  ' : ''}
            {sessionCount > 0 ? `${sessionCount} session${sessionCount !== 1 ? 's' : ''}` : subject ? '' : 'No sessions yet'}
          </Text>
        </View>
        {/* Export button — label reflects current filtered count */}
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExport}
          disabled={exporting || loading}
          activeOpacity={0.75}
        >
          {exporting
            ? <ActivityIndicator size="small" color={BLUE} />
            : <Download size={18} color={loading ? (isDarkMode ? '#5a6080' : '#c0c6d4') : BLUE} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Controls ── */}
      <View style={[styles.controls, { backgroundColor: headerBg, borderBottomColor: border }]}>
        {/* Search box */}
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: inputBdr }]}>
          <Search size={15} color={textSub} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: textPri }]}
            placeholder="Search name or roll number…"
            placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
            value={searchInput}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearchQuery(''); }}>
              <X size={15} color={textSub} />
            </TouchableOpacity>
          )}
        </View>

        {/* Risk filter chips */}
        <ChipRow
          value={riskFilter}
          onChange={setRiskFilter}
          isDarkMode={isDarkMode}
          options={[
            { label: 'All',     value: 'all' },
            { label: 'At Risk', value: 'at_risk' },
            { label: 'Good',    value: 'good' },
          ]}
        />

        {/* Sort chips */}
        <ChipRow
          value={sortOrder}
          onChange={setSortOrder}
          isDarkMode={isDarkMode}
          options={[
            { label: '↑ Attend.',  value: 'attendance_asc' },
            { label: '↓ Attend.',  value: 'attendance_desc' },
            { label: 'A→Z Name',   value: 'name_asc' },
          ]}
        />
      </View>

      {/* ── Loading ── */}
      {loading && <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />}

      {/* ── Error ── */}
      {!loading && error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={36} color="#e74c3c" style={{ marginBottom: 12 }} />
          <Text style={[styles.errorTitle, { color: textPri }]}>Couldn't load roster</Text>
          <Text style={[styles.errorSub, { color: textSub }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchRoster(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backLinkText, { color: textSub }]}>← Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Roster list ── */}
      {!loading && !error && (
        <>
          {/* Count bar */}
          <View style={[styles.countBar, { backgroundColor: headerBg, borderBottomColor: border }]}>
            <View style={styles.countLeft}>
              <BarChart2 size={13} color={textSub} style={{ marginRight: 5 }} />
              <Text style={[styles.countText, { color: textSub }]}>
                {totalCount} student{totalCount !== 1 ? 's' : ''}
                {riskFilter !== 'all' ? ` · ${riskFilter === 'at_risk' ? 'at-risk' : 'good standing'}` : ''}
              </Text>
            </View>
            <View style={styles.countRight}>
              <Calendar size={12} color={textSub} style={{ marginRight: 4 }} />
              <Text style={[styles.countText, { color: textSub }]}>
                {sessionCount} session{sessionCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <FlatList
            data={students}
            keyExtractor={s => String(s.student_id)}
            renderItem={renderStudent}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BLUE}
                colors={[BLUE]}
              />
            }
          />
        </>
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

  controls: {
    paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14 },

  chipRow:  { flexDirection: 'row', gap: 6 },
  chip:     { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: '700' },

  countBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  countLeft:  { flexDirection: 'row', alignItems: 'center' },
  countRight: { flexDirection: 'row', alignItems: 'center' },
  countText:  { fontSize: 12, fontWeight: '600' },

  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 100 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '800' },

  rowInfo:    { flex: 1, minWidth: 0 },
  rowNameLine:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  rowName:    { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  rollText:   { fontSize: 11, marginBottom: 4 },

  atRiskBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff0f0', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  atRiskText: { fontSize: 9, color: '#e74c3c', fontWeight: '800' },

  pillRow: { flexDirection: 'row', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },
  pillText: { fontSize: 10, fontWeight: '700' },

  pctBlock:  { alignItems: 'center', minWidth: 52 },
  pctValue:  { fontSize: 18, fontWeight: '800' },
  pctLabel:  { fontSize: 9, fontWeight: '700', marginTop: 1 },

  loadMoreBtn: {
    alignSelf: 'center', marginVertical: 14,
    backgroundColor: BLUE, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 10,
  },
  loadMoreText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

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

  emptyBox:   { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
