import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, AlertTriangle, GraduationCap, ClipboardList, Calendar, CalendarDays,
  FileText, FileSpreadsheet, FileJson, ChevronLeft, Upload, Hourglass, Download, Check
} from 'lucide-react-native';

const BLUE = '#2952e3';
const GOLD = '#b07d00';

const reportTypes = [
  { key: 'full',     icon: BarChart3, label: 'Full Attendance Report', sub: 'All students, all classes',    color: '#eef2ff', iconColor: BLUE },
  { key: 'atrisk',  icon: AlertTriangle, label: 'At-Risk Students',       sub: 'Students below 60%',           color: '#fff8e6', iconColor: '#f39c12' },
  { key: 'class',   icon: GraduationCap, label: 'Per Class Report',        sub: 'Breakdown by subject',         color: '#edfaf3', iconColor: '#27ae60' },
  { key: 'waiver',  icon: ClipboardList, label: 'Waiver Summary',          sub: 'All submitted waivers',        color: '#fff0f0', iconColor: '#e74c3c' },
  { key: 'weekly',  icon: Calendar, label: 'Weekly Summary',          sub: 'This week attendance stats',   color: '#f3eeff', iconColor: '#7c3aed' },
  { key: 'monthly', icon: CalendarDays, label: 'Monthly Report',          sub: 'Monthly attendance overview',  color: '#e8f4ff', iconColor: '#2980b9' },
];

const formats = [
  { key: 'pdf',   icon: FileText, label: 'PDF',   sub: 'Best for sharing' },
  { key: 'excel', icon: FileSpreadsheet, label: 'Excel', sub: 'Best for data' },
  { key: 'csv',   icon: FileJson, label: 'CSV',   sub: 'Raw data export' },
];

const periods = ['This Week', 'This Month', 'Last Month', 'This Semester', 'Custom Range'];

const recentExports = [
  { icon: FileText, name: 'Full_Report_Oct2024.pdf',    size: '2.4 MB', date: 'Oct 20', color: '#fff0f0', textColor: '#e74c3c' },
  { icon: BarChart3, name: 'AtRisk_Students_Oct.xlsx',   size: '890 KB', date: 'Oct 18', color: '#edfaf3', textColor: '#27ae60' },
  { icon: FileJson, name: 'Weekly_Summary_W42.csv',     size: '340 KB', date: 'Oct 15', color: '#eef2ff', textColor: BLUE },
];

export default function ExportReportsScreen({ navigation }) {
  const { isDarkMode } = useAuth();
  const [selectedReport, setSelectedReport] = useState('full');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [exporting, setExporting] = useState(false);

  // ── Theme colours ────────────────────────────────────────────────────────
  const bg          = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg    = isDarkMode ? '#1a1f2e' : '#ffffff';
  const borderColor = isDarkMode ? '#2a2f42' : '#eef1f5';
  const cardBg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPrimary = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub     = isDarkMode ? '#8a94b8' : '#8a94a6';
  const chipBg      = isDarkMode ? '#1a1f2e' : '#f0f2f8';
  const rowBorder   = isDarkMode ? '#252b3e' : '#f0f2f5';

  const handleExport = () => {
    const report = reportTypes.find(r => r.key === selectedReport);
    const format = formats.find(f => f.key === selectedFormat);
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      Alert.alert(
        '✅ Export Complete',
        `${report.label} exported as ${format.label} successfully.`,
      );
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={headerBg} />

      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Export Reports</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Report Type */}
        <Text style={[styles.sectionLabel, { color: textSub }]}>REPORT TYPE</Text>
        <View style={styles.reportGrid}>
          {reportTypes.map(r => {
            const isActive = selectedReport === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.reportCard, { backgroundColor: isDarkMode ? '#1a1f2e' : r.color }, isActive && { borderColor: r.iconColor, borderWidth: 2 }]}
                onPress={() => setSelectedReport(r.key)}
                activeOpacity={0.8}
              >
                <View style={{ marginBottom: 6 }}>
                  <r.icon size={22} color={r.iconColor} />
                </View>
                <Text style={[styles.reportLabel, { color: isActive ? r.iconColor : textPrimary }]}>{r.label}</Text>
                <Text style={[styles.reportSub, { color: textSub }]}>{r.sub}</Text>
                {isActive && (
                  <View style={[styles.checkDot, { backgroundColor: r.iconColor }]}>
                    <Check size={10} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time Period */}
        <Text style={[styles.sectionLabel, { color: textSub }]}>TIME PERIOD</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodRow} contentContainerStyle={styles.periodContent}>
          {periods.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, { backgroundColor: chipBg }, selectedPeriod === p && styles.periodChipActive]}
              onPress={() => setSelectedPeriod(p)}
            >
              <Text style={[styles.periodText, { color: textSub }, selectedPeriod === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Format */}
        <Text style={[styles.sectionLabel, { color: textSub }]}>FILE FORMAT</Text>
        <View style={styles.formatRow}>
          {formats.map(f => {
            const isActive = selectedFormat === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.formatCard, { backgroundColor: isActive ? (isDarkMode ? '#1e2540' : '#eef2ff') : cardBg, borderColor: isActive ? BLUE : (isDarkMode ? '#2a2f42' : '#e6e9f0') }]}
                onPress={() => setSelectedFormat(f.key)}
                activeOpacity={0.8}
              >
                <View style={{ marginBottom: 6 }}>
                  <f.icon size={22} color={isActive ? BLUE : '#8a94a6'} />
                </View>
                <Text style={[styles.formatLabel, { color: isActive ? BLUE : textSub }]}>{f.label}</Text>
                <Text style={[styles.formatSub, { color: textSub }]}>{f.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary Preview */}
        <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.summaryTitle, { color: textPrimary }]}>Export Summary</Text>
          <View style={[styles.summaryRow, { borderBottomColor: rowBorder }]}>
            <Text style={[styles.summaryKey, { color: textSub }]}>Report</Text>
            <Text style={[styles.summaryVal, { color: textPrimary }]}>{reportTypes.find(r => r.key === selectedReport)?.label}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomColor: rowBorder }]}>
            <Text style={[styles.summaryKey, { color: textSub }]}>Period</Text>
            <Text style={[styles.summaryVal, { color: textPrimary }]}>{selectedPeriod}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.summaryKey, { color: textSub }]}>Format</Text>
            <Text style={[styles.summaryVal, { color: textPrimary }]}>{formats.find(f => f.key === selectedFormat)?.label}</Text>
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnLoading]}
          onPress={handleExport}
          activeOpacity={0.85}
          disabled={exporting}
        >
          {exporting ? <Hourglass size={18} color="#ffffff" /> : <Upload size={18} color="#ffffff" />}
          <Text style={styles.exportText}>{exporting ? 'Exporting...' : 'Export Report'}</Text>
        </TouchableOpacity>

        {/* Recent Exports */}
        <Text style={[styles.sectionLabel, { color: textSub }]}>RECENT EXPORTS</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {recentExports.map((ex, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.recentRow, i !== recentExports.length - 1 && [styles.recentBorder, { borderBottomColor: rowBorder }]]}
              onPress={() => Alert.alert('Download', `Downloading ${ex.name}...`)}
            >
              <View style={[styles.fileIcon, { backgroundColor: isDarkMode ? '#252b3e' : ex.color }]}>
                <ex.icon size={18} color={ex.textColor} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: textPrimary }]}>{ex.name}</Text>
                <Text style={[styles.fileMeta, { color: textSub }]}>{ex.size} · {ex.date}</Text>
              </View>
              <View style={[styles.downloadBtn, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
                <Download size={14} color={BLUE} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Reports" />
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
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.8, marginBottom: 10, marginLeft: 2 },

  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  reportCard: {
    width: '47%', borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  reportIcon: { fontSize: 22, marginBottom: 6 },
  reportLabel: { fontSize: 12, fontWeight: '700', color: '#1a1f36', marginBottom: 3 },
  reportSub: { fontSize: 10, color: '#8a94a6', lineHeight: 14 },
  checkDot: {
    position: 'absolute', top: 10, right: 10,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  checkDotText: { fontSize: 10, color: '#ffffff', fontWeight: '800' },

  periodRow: { marginBottom: 22 },
  periodContent: { gap: 8, paddingRight: 8 },
  periodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f2f8' },
  periodChipActive: { backgroundColor: BLUE },
  periodText: { fontSize: 12, color: '#8a94a6', fontWeight: '600' },
  periodTextActive: { color: '#ffffff', fontWeight: '700' },

  formatRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  formatCard: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 14,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e6e9f0',
  },
  formatCardActive: { borderColor: BLUE, backgroundColor: '#eef2ff' },
  formatIcon: { fontSize: 22, marginBottom: 6 },
  formatLabel: { fontSize: 13, fontWeight: '700', color: '#8a94a6', marginBottom: 2 },
  formatLabelActive: { color: BLUE },
  formatSub: { fontSize: 10, color: '#aab0be', textAlign: 'center' },

  summaryCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#1a1f36', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  summaryKey: { fontSize: 13, color: '#8a94a6', fontWeight: '500' },
  summaryVal: { fontSize: 13, color: '#1a1f36', fontWeight: '700' },

  exportBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginBottom: 24,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  exportBtnLoading: { opacity: 0.7 },
  exportIcon: { fontSize: 18 },
  exportText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  recentBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  fileIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  fileIconText: { fontSize: 18 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '600', color: '#1a1f36', marginBottom: 2 },
  fileMeta: { fontSize: 11, color: '#8a94a6' },
  downloadBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  downloadIcon: { fontSize: 14 },
});