import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { ChevronLeft, Search, X } from 'lucide-react-native';

const BLUE = '#2952e3';
const GOLD = '#b07d00';

// Classes and students will be fetched from the backend

const riskConfig = {
  High: { bg: '#fff0f0', text: '#e74c3c', bar: '#e74c3c' },
  Mid:  { bg: '#fff8e6', text: '#f39c12', bar: '#f39c12' },
  Low:  { bg: '#edfaf3', text: '#27ae60', bar: '#27ae60' },
};

function AttendanceBar({ percentage, risk }) {
  const config = riskConfig[risk];
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: config.bar }]} />
    </View>
  );
}

function StudentCard({ student, onPress, isDarkMode }) {
  const config = riskConfig[student.risk];
  const cardBg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPrimary = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub     = isDarkMode ? '#8a94b8' : '#8a94a6';
  const avatarBg    = isDarkMode ? '#1e2540' : '#eef2ff';
  const barBgColor  = isDarkMode ? '#252b3e' : '#f0f2f5';

  return (
    <TouchableOpacity style={[styles.studentCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{student.initials}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: textPrimary }]}>{student.name}</Text>
          <Text style={[styles.studentMeta, { color: textSub }]}>{student.id} · {student.course}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.riskText, { color: config.text }]}>{student.risk} Risk</Text>
        </View>
      </View>
      <View style={[styles.barBg, { backgroundColor: barBgColor }]}>
        <View style={[styles.barFill, { width: `${student.attendance}%`, backgroundColor: config.bar }]} />
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: config.bar }]}>{student.attendance}%</Text>
          <Text style={[styles.statLbl, { color: textSub }]}>Attendance</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: '#27ae60' }]}>{student.present}</Text>
          <Text style={[styles.statLbl, { color: textSub }]}>Present</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: '#e74c3c' }]}>{student.absent}</Text>
          <Text style={[styles.statLbl, { color: textSub }]}>Absent</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: GOLD }]}>{student.waivers}</Text>
          <Text style={[styles.statLbl, { color: textSub }]}>Waivers</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function StudentAnalyticsScreen({ navigation, route }) {
  const { user, token, isDarkMode } = useAuth();
  const studentId = route.params?.student_id || null;
  const isSingleView = studentId || user?.role === 'student';

  const [search, setSearch]         = useState('');
  const [activeClass, setActiveClass] = useState('All Classes');
  const [activeRisk, setActiveRisk]   = useState('All');

  const [data, setData] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classList, setClassList] = useState(['All Classes']);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let url = API.attendanceAnalytics;
        if (studentId) url += `?student_id=${studentId}`;

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const json = await res.json();
          if (isSingleView) {
            setData(json);
          } else {
            setStudentsList(json);
            const uniqueClasses = ['All Classes', ...new Set(json.map(s => s.course))];
            setClassList(uniqueClasses);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  const filtered = studentsList.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        (s.id && s.id.includes(search));
    const matchClass  = activeClass === 'All Classes' || s.course === activeClass;
    const matchRisk   = activeRisk  === 'All'         || s.risk   === activeRisk;
    return matchSearch && matchClass && matchRisk;
  });

  const highCount = studentsList.filter(s => s.risk === 'High').length;
  const midCount  = studentsList.filter(s => s.risk === 'Mid').length;
  const avgAttendance = studentsList.length > 0 
    ? Math.round(studentsList.reduce((a, s) => a + s.attendance, 0) / studentsList.length)
    : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#1a1f2e' : '#ffffff'} />

      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={isDarkMode ? '#ffffff' : '#1a1f36'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>{isSingleView ? (data ? data.name : 'Student Analytics') : 'Student Analytics'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
        ) : isSingleView && data ? (
          // Single Student View
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
                <Text style={[styles.summaryVal, { color: BLUE }]}>{data.percentage}%</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Attendance</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a2e1e' : '#edfaf3' }]}>
                <Text style={[styles.summaryVal, { color: '#27ae60' }]}>{data.present}</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Present</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0' }]}>
                <Text style={[styles.summaryVal, { color: '#e74c3c' }]}>{data.absent}</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Absent</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e6' }]}>
                <Text style={[styles.summaryVal, { color: '#f39c12' }]}>{data.late || 0}</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Late/Partial</Text>
              </View>
            </View>

            <Text style={[styles.headerTitle, { marginTop: 20, marginBottom: 10, fontSize: 16, color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Breakdown by Class</Text>
            {data.classes && data.classes.map(cls => (
              <StudentCard key={cls.id} student={{
                name: cls.course,
                id: cls.id,
                course: 'Attendance',
                attendance: cls.attendance,
                present: cls.present,
                absent: cls.absent,
                waivers: cls.waivers,
                risk: cls.risk,
                initials: cls.course.substring(0,2)
              }} onPress={() => {}} isDarkMode={isDarkMode} />
            ))}
          </>
        ) : (
          // Admin List View
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
                <Text style={[styles.summaryVal, { color: BLUE }]}>{studentsList.length}</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Total</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0' }]}>
                <Text style={[styles.summaryVal, { color: '#e74c3c' }]}>{highCount}</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>High Risk</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e6' }]}>
                <Text style={[styles.summaryVal, { color: '#f39c12' }]}>{midCount}</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Mid Risk</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1a2e1e' : '#edfaf3' }]}>
                <Text style={[styles.summaryVal, { color: '#27ae60' }]}>{avgAttendance}%</Text>
                <Text style={[styles.summaryLbl, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Avg</Text>
              </View>
            </View>

            <View style={[styles.searchBox, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
              <Search size={16} color="#8a94a6" />
              <TextInput
                style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}
                placeholder="Search by name or ID..."
                placeholderTextColor="#aab0be"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color="#8a94a6" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
              {classList.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.filterChip, { backgroundColor: isDarkMode ? '#1a1f2e' : '#f0f2f8' }, activeClass === c && styles.filterChipActive]}
                  onPress={() => setActiveClass(c)}
                >
                  <Text style={[styles.filterChipText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }, activeClass === c && styles.filterChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.riskFilterRow}>
              {['All', 'High', 'Mid', 'Low'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.riskChip, { backgroundColor: isDarkMode ? '#1a1f2e' : '#f0f2f8' },
                    activeRisk === r && r === 'All'  && styles.riskChipAllActive,
                    activeRisk === r && r === 'High' && styles.riskChipHighActive,
                    activeRisk === r && r === 'Mid'  && styles.riskChipMidActive,
                    activeRisk === r && r === 'Low'  && styles.riskChipLowActive,
                  ]}
                  onPress={() => setActiveRisk(r)}
                >
                  <Text style={[styles.riskChipText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' },
                    activeRisk === r && r === 'All'  && { color: '#ffffff' },
                    activeRisk === r && r === 'High' && { color: '#ffffff' },
                    activeRisk === r && r === 'Mid'  && { color: '#ffffff' },
                    activeRisk === r && r === 'Low'  && { color: '#ffffff' },
                  ]}>{r === 'All' ? 'All Risks' : `${r} Risk`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.resultCount, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</Text>

            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={{ marginBottom: 10 }}>
                  <Search size={36} color="#8a94a6" />
                </View>
                <Text style={[styles.emptyText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>No students match your search</Text>
              </View>
            ) : (
              filtered.map(s => (
                <StudentCard key={s.student_id} student={s} onPress={() => navigation.push('StudentAnalytics', { student_id: s.student_id })} isDarkMode={isDarkMode} />
              ))
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {user?.role !== 'student' && <AdminBottomNav navigation={navigation} active="Reports" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eef1f5',
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#1a1f36', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1f36' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  summaryLbl: { fontSize: 9, color: '#8a94a6', fontWeight: '700', letterSpacing: 0.4 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#e6e9f0', paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1f36' },
  clearIcon: { fontSize: 14, color: '#8a94a6', fontWeight: '700' },

  filterRow: { marginBottom: 10 },
  filterContent: { gap: 8, paddingRight: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f0f2f8' },
  filterChipActive: { backgroundColor: BLUE },
  filterChipText: { fontSize: 12, color: '#8a94a6', fontWeight: '600' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '700' },

  riskFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  riskChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f2f8' },
  riskChipAllActive:  { backgroundColor: '#1a1f36' },
  riskChipHighActive: { backgroundColor: '#e74c3c' },
  riskChipMidActive:  { backgroundColor: '#f39c12' },
  riskChipLowActive:  { backgroundColor: '#27ae60' },
  riskChipText: { fontSize: 11, color: '#8a94a6', fontWeight: '700' },

  resultCount: { fontSize: 12, color: '#8a94a6', fontWeight: '600', marginBottom: 12 },

  studentCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: BLUE },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  studentMeta: { fontSize: 11, color: '#8a94a6' },
  riskBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  riskText: { fontSize: 10, fontWeight: '700' },

  barBg: { height: 6, backgroundColor: '#f0f2f5', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  barFill: { height: '100%', borderRadius: 3 },

  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#f0f2f5' },
  statVal: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  statLbl: { fontSize: 9, color: '#8a94a6', fontWeight: '600', letterSpacing: 0.3 },

  emptyBox: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#8a94a6', fontWeight: '600' },
});