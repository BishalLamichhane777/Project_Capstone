import React, { useState, useEffect, useCallback } from 'react';
import BottomNav from '../components/BottomNav';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  ChevronLeft, Info, ChevronUp, ChevronDown,
  FileText, File, X, Clock, AlertTriangle,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

const BLUE   = '#2952e3';
const ORANGE = '#f39c12';

// ─── Date helpers (NPT UTC+5:45) ─────────────────────────────────────────────
const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
function formatDate(iso) {
  if (!iso) return 'Unknown date';
  // Plain YYYY-MM-DD (target_date) needs no offset shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
  }
  const npt = new Date(new Date(iso).getTime() + NPT_OFFSET_MS);
  return `${MONTH_NAMES[npt.getUTCMonth()]} ${npt.getUTCDate()}, ${npt.getUTCFullYear()}`;
}

// Returns today + next 60 days as YYYY-MM-DD strings for the date selector
function buildFutureDates() {
  const dates = [];
  const base  = new Date();
  for (let i = 0; i <= 60; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${dd}`);
  }
  return dates;
}
const FUTURE_DATES = buildFutureDates();

// ─── Shared: document upload box ─────────────────────────────────────────────
function UploadBox({ uploadedFile, onUpload, onRemove, isDarkMode }) {
  return (
    <>
      <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>
        Supporting Document{' '}
        <Text style={{ fontWeight: '400', color: isDarkMode ? '#8a94b8' : '#8a94a6', fontSize: 12 }}>
          (optional)
        </Text>
      </Text>
      <TouchableOpacity
        style={[styles.uploadBox, {
          backgroundColor: isDarkMode ? '#1a1f2e' : '#fff',
          borderColor: isDarkMode ? '#2a2f42' : '#d0d9f5',
        }]}
        onPress={onUpload}
        activeOpacity={0.8}
      >
        <View style={[styles.uploadIconContainer, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
          <FileText size={24} color={isDarkMode ? '#7c9dff' : '#1a1f36'} />
        </View>
        <Text style={[styles.uploadTitle, { color: isDarkMode ? '#fff' : '#1a1f36' }]}>Tap to upload</Text>
        <Text style={[styles.uploadSubtitle, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>PDF, JPG or PNG (max 5 MB)</Text>
      </TouchableOpacity>
      {uploadedFile && (
        <View style={[styles.fileCard, {
          backgroundColor: isDarkMode ? '#1a1f2e' : '#fff',
          borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0',
        }]}>
          <View style={[styles.fileIconContainer, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0' }]}>
            <File size={20} color="#e74c3c" />
          </View>
          <View style={styles.fileInfo}>
            <Text style={[styles.fileName, { color: isDarkMode ? '#fff' : '#1a1f36' }]} numberOfLines={1}>
              {uploadedFile.name}
            </Text>
            <Text style={[styles.fileSize, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{uploadedFile.size}</Text>
          </View>
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <X size={14} color="#8a94a6" />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// ─── History card (past excuses) ─────────────────────────────────────────────
function HistoryCard({ excuse, isDarkMode }) {
  const isPrior      = excuse.waiver_type === 'prior';
  const cardBg       = isDarkMode ? '#1a1f2e' : '#fff';
  const borderColor  = isDarkMode ? '#2a2f42' : '#e6e9f0';
  const textPrimary  = isDarkMode ? '#fff'    : '#1a1f36';
  const textSub      = isDarkMode ? '#8a94b8' : '#8a94a6';
  const statusStyle  =
    excuse.status === 'Approved' ? styles.statusApproved :
    excuse.status === 'Rejected' ? styles.statusRejected : styles.statusPending;
  const statusTxtStyle =
    excuse.status === 'Approved' ? styles.statusTextApproved :
    excuse.status === 'Rejected' ? styles.statusTextRejected : styles.statusTextPending;

  return (
    <View style={[styles.historyCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.historyHeader}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.historyClassText, { color: textPrimary }]}>{excuse.class_name}</Text>
          {isPrior && (
            <View style={styles.priorBadgeSmall}>
              <Clock size={9} color={ORANGE} />
              <Text style={styles.priorBadgeSmallText}>Prior</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, statusStyle]}>
          <Text style={[styles.statusText, statusTxtStyle]}>{excuse.status}</Text>
        </View>
      </View>
      <Text style={[styles.historyDateText, { color: textSub }]}>
        {isPrior
          ? excuse.end_date && excuse.end_date !== excuse.start_date
            ? `${formatDate(excuse.start_date)} → ${formatDate(excuse.end_date)}`
            : `Date: ${formatDate(excuse.start_date || excuse.session_date)}`
          : `Session Date: ${formatDate(excuse.session_date)}`}
      </Text>
      <Text style={[styles.historyReasonText, { color: isDarkMode ? '#a0b0e0' : '#3a4a7a' }]} numberOfLines={2}>
        {excuse.reason}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SubmitWaiverScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();

  // ── shared state ─────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pastExcuses, setPastExcuses] = useState([]);

  // Toggle: 'retroactive' | 'prior'
  const [waiverType, setWaiverType] = useState('retroactive');

  // ── retroactive state ─────────────────────────────────────────────
  const [absentSessions,  setAbsentSessions]  = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [retroDropOpen,   setRetroDropOpen]   = useState(false);

  // ── prior state ───────────────────────────────────────────────────
  const [enrolledClasses,  setEnrolledClasses]  = useState([]);
  const [selectedClass,    setSelectedClass]    = useState(null);   // null = All Classes
  const [classDropOpen,    setClassDropOpen]    = useState(false);
  const [startDate,        setStartDate]        = useState(null);
  const [endDate,          setEndDate]          = useState(null);
  const [startDropOpen,    setStartDropOpen]    = useState(false);
  const [endDropOpen,      setEndDropOpen]      = useState(false);

  // ── shared form state ─────────────────────────────────────────────
  const [reason,       setReason]       = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [histRes, excRes, classRes] = await Promise.all([
        fetch(API.attendanceHistory,  { headers }),
        fetch(API.myExcuses,          { headers }),
        fetch(API.studentClasses,     { headers }),
      ]);
      const [histData, excData, classData] = await Promise.all([
        histRes.json(), excRes.json(), classRes.json(),
      ]);

      if (histRes.ok)  setAbsentSessions(histData.filter(h => h.status === 'Absent'));
      if (excRes.ok)   setPastExcuses(excData);
      if (classRes.ok) setEnrolledClasses(Array.isArray(classData) ? classData : []);
    } catch {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ── document picker ───────────────────────────────────────────────
  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose a file under 5 MB.');
        return;
      }
      const sizeLabel = asset.size
        ? asset.size < 1024 * 1024
          ? `${(asset.size / 1024).toFixed(1)} KB`
          : `${(asset.size / (1024 * 1024)).toFixed(1)} MB`
        : '';
      setUploadedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream', size: sizeLabel });
    } catch {
      Alert.alert('Error', 'Could not open file picker. Please try again.');
    }
  };

  // ── submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (waiverType === 'retroactive') {
      if (!selectedSession) { Alert.alert('Error', 'Please select a session.'); return; }
    } else {
      if (!startDate) { Alert.alert('Error', 'Please select a start date.'); return; }
    }
    if (!reason.trim()) { Alert.alert('Error', 'Please provide a reason.'); return; }

    setSubmitting(true);
    try {
      let res;
      if (uploadedFile) {
        const fd = new FormData();
        if (waiverType === 'prior') {
          fd.append('waiver_type', 'prior');
          if (selectedClass) fd.append('class_id', String(selectedClass.class_id));
          fd.append('start_date', startDate);
          if (endDate && endDate !== startDate) fd.append('end_date', endDate);
        } else {
          fd.append('session_id', selectedSession.session_id);
        }
        fd.append('reason', reason.trim());
        fd.append('document', { uri: uploadedFile.uri, name: uploadedFile.name, type: uploadedFile.mimeType });
        res = await fetch(API.excuseSubmit, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        });
      } else {
        const body = waiverType === 'prior'
          ? {
              waiver_type: 'prior',
              ...(selectedClass ? { class_id: selectedClass.class_id } : {}),
              start_date: startDate,
              ...(endDate && endDate !== startDate ? { end_date: endDate } : {}),
              reason: reason.trim(),
            }
          : { session_id: selectedSession.session_id, reason: reason.trim() };
        res = await fetch(API.excuseSubmit, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Your waiver has been submitted!', [{
          text: 'OK', onPress: () => {
            setSelectedSession(null); setSelectedClass(null); setStartDate(null); setEndDate(null);
            setReason(''); setUploadedFile(null); fetchData();
          },
        }]);
      } else {
        Alert.alert('Error', data.error || 'Submission failed');
      }
    } catch {
      Alert.alert('Error', 'Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── theme shortcuts ───────────────────────────────────────────────
  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg   = isDarkMode ? '#1a1f2e' : '#fff';
  const border   = isDarkMode ? '#2a2f42' : '#e6e9f0';
  const textPri  = isDarkMode ? '#fff'    : '#1a1f36';
  const textMut  = isDarkMode ? '#8a94b8' : '#aab0be';

  const dropStyle  = [styles.dropdown, { backgroundColor: cardBg, borderColor: border }];
  const menuStyle  = [styles.dropdownMenu, { backgroundColor: cardBg, borderColor: border }];

  // ── render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPri }]}>Submit Waiver</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Type toggle ────────────────────────────────────────── */}
        <View style={[styles.toggleRow, { backgroundColor: isDarkMode ? '#1a1f2e' : '#eef2ff' }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, waiverType === 'retroactive' && styles.toggleBtnActive]}
            onPress={() => { setWaiverType('retroactive'); setSelectedClass(null); setStartDate(null); setEndDate(null); }}
            activeOpacity={0.8}
          >
            <AlertTriangle size={13} color={waiverType === 'retroactive' ? '#fff' : (isDarkMode ? '#8a94b8' : '#8a94a6')} />
            <Text style={[styles.toggleText, waiverType === 'retroactive' && styles.toggleTextActive, { color: waiverType === 'retroactive' ? '#fff' : textMut }]}>
              Report Absence
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, waiverType === 'prior' && styles.toggleBtnPrior]}
            onPress={() => { setWaiverType('prior'); setSelectedSession(null); }}
            activeOpacity={0.8}
          >
            <Clock size={13} color={waiverType === 'prior' ? '#fff' : (isDarkMode ? '#8a94b8' : '#8a94a6')} />
            <Text style={[styles.toggleText, { color: waiverType === 'prior' ? '#fff' : textMut }]}>
              Request in Advance
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Info banner ────────────────────────────────────────── */}
        <View style={[styles.infoBanner, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
          <Info size={16} color={isDarkMode ? '#7c9dff' : '#3a4a7a'} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: isDarkMode ? '#a0b0e0' : '#3a4a7a' }]}>
            {waiverType === 'prior'
              ? 'Request an excused absence before the class happens (e.g. medical appointment). The teacher will be notified once approved.'
              : 'Appeal an absence already recorded by the system. Supporting documents are optional.'}
          </Text>
        </View>

        {/* ══════════════════════════════════════════════════════════
            RETROACTIVE FLOW
        ══════════════════════════════════════════════════════════ */}
        {waiverType === 'retroactive' && (<>
          <Text style={[styles.label, { color: textPri }]}>Select Absent Session</Text>
          <TouchableOpacity style={dropStyle} onPress={() => setRetroDropOpen(v => !v)} activeOpacity={0.8}>
            <Text style={[styles.dropdownText, { color: selectedSession ? textPri : textMut }, selectedSession && { fontWeight: '500' }]}>
              {selectedSession ? `${selectedSession.class_name} — ${formatDate(selectedSession.date)}` : 'Choose the missed session'}
            </Text>
            {retroDropOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
          </TouchableOpacity>
          {retroDropOpen && (
            <View style={menuStyle}>
              {absentSessions.length === 0
                ? <View style={styles.dropdownItem}><Text style={[styles.dropdownItemText, { color: textMut }]}>No absent sessions found.</Text></View>
                : absentSessions.map((s, i) => (
                  <TouchableOpacity
                    key={s.session_id || i}
                    style={[styles.dropdownItem, i !== absentSessions.length - 1 && [styles.dropdownItemBorder, { borderBottomColor: isDarkMode ? '#2a2f42' : '#f0f2f5' }]]}
                    onPress={() => { setSelectedSession(s); setRetroDropOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, { color: textPri }]}>
                      {s.class_name} — {formatDate(s.date)}
                    </Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </>)}

        {/* ══════════════════════════════════════════════════════════
            PRIOR FLOW
        ══════════════════════════════════════════════════════════ */}
        {waiverType === 'prior' && (<>
          {/* Class picker — optional */}
          <Text style={[styles.label, { color: textPri }]}>
            Class{' '}
            <Text style={{ fontWeight: '400', color: isDarkMode ? '#8a94b8' : '#8a94a6', fontSize: 12 }}>(optional)</Text>
          </Text>
          <TouchableOpacity style={dropStyle} onPress={() => setClassDropOpen(v => !v)} activeOpacity={0.8}>
            <Text style={[styles.dropdownText, { color: textPri, fontWeight: selectedClass ? '500' : '400' }]}>
              {selectedClass ? `${selectedClass.class_name}${selectedClass.subject ? ' — ' + selectedClass.subject : ''}` : 'All Classes (General Leave)'}
            </Text>
            {classDropOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
          </TouchableOpacity>
          {classDropOpen && (
            <View style={menuStyle}>
              {/* "All Classes" option */}
              <TouchableOpacity
                style={[styles.dropdownItem, styles.dropdownItemBorder, { borderBottomColor: isDarkMode ? '#2a2f42' : '#f0f2f5' }]}
                onPress={() => { setSelectedClass(null); setClassDropOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, { color: ORANGE, fontWeight: '600' }]}>
                  All Classes (General Leave)
                </Text>
              </TouchableOpacity>
              {enrolledClasses.length === 0
                ? <View style={styles.dropdownItem}><Text style={[styles.dropdownItemText, { color: textMut }]}>No enrolled classes found.</Text></View>
                : enrolledClasses.map((c, i) => (
                  <TouchableOpacity
                    key={c.class_id || i}
                    style={[styles.dropdownItem, i !== enrolledClasses.length - 1 && [styles.dropdownItemBorder, { borderBottomColor: isDarkMode ? '#2a2f42' : '#f0f2f5' }]]}
                    onPress={() => { setSelectedClass(c); setClassDropOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, { color: textPri }]}>
                      {c.class_name}{c.subject ? ` — ${c.subject}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}

          {/* Start Date */}
          <Text style={[styles.label, { color: textPri }]}>Start Date</Text>
          <TouchableOpacity style={dropStyle} onPress={() => { setStartDropOpen(v => !v); setEndDropOpen(false); }} activeOpacity={0.8}>
            <Text style={[styles.dropdownText, { color: startDate ? textPri : textMut }, startDate && { fontWeight: '500' }]}>
              {startDate ? formatDate(startDate) : 'Choose start date'}
            </Text>
            {startDropOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
          </TouchableOpacity>
          {startDropOpen && (
            <View style={[menuStyle, { maxHeight: 220 }]}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {FUTURE_DATES.map((d, i) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dropdownItem, i !== FUTURE_DATES.length - 1 && [styles.dropdownItemBorder, { borderBottomColor: isDarkMode ? '#2a2f42' : '#f0f2f5' }]]}
                    onPress={() => {
                      setStartDate(d);
                      // If end date is before new start, reset it
                      if (endDate && endDate < d) setEndDate(d);
                      setStartDropOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: textPri }]}>
                      {i === 0 ? `Today — ${formatDate(d)}` : formatDate(d)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* End Date */}
          <Text style={[styles.label, { color: textPri }]}>
            End Date{' '}
            <Text style={{ fontWeight: '400', color: isDarkMode ? '#8a94b8' : '#8a94a6', fontSize: 12 }}>
              (leave same as start for a single day)
            </Text>
          </Text>
          <TouchableOpacity
            style={[dropStyle, !startDate && { opacity: 0.5 }]}
            onPress={() => { if (startDate) { setEndDropOpen(v => !v); setStartDropOpen(false); } }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownText, { color: endDate ? textPri : textMut }, endDate && { fontWeight: '500' }]}>
              {endDate
                ? endDate === startDate ? `${formatDate(endDate)} (same day)` : formatDate(endDate)
                : startDate ? `${formatDate(startDate)} (same day)` : 'Choose end date (after selecting start)'}
            </Text>
            {endDropOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
          </TouchableOpacity>
          {endDropOpen && startDate && (
            <View style={[menuStyle, { maxHeight: 220 }]}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {FUTURE_DATES.filter(d => d >= startDate).map((d, i, arr) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dropdownItem, i !== arr.length - 1 && [styles.dropdownItemBorder, { borderBottomColor: isDarkMode ? '#2a2f42' : '#f0f2f5' }]]}
                    onPress={() => { setEndDate(d); setEndDropOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, { color: textPri }]}>
                      {d === startDate ? `${formatDate(d)} (same day)` : formatDate(d)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>)}

        {/* ── Reason ─────────────────────────────────────────────── */}
        <Text style={[styles.label, { color: textPri, marginTop: 8 }]}>Reason for Absence</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: cardBg, borderColor: border, color: textPri }]}
          placeholder="Briefly explain why you were absent..."
          placeholderTextColor={textMut}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* ── Document upload ─────────────────────────────────────── */}
        <UploadBox
          uploadedFile={uploadedFile}
          onUpload={handleUpload}
          onRemove={() => setUploadedFile(null)}
          isDarkMode={isDarkMode}
        />

        {/* ── Past requests ───────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 24, color: textPri }]}>Past Excuse Requests</Text>
        {loading ? (
          <ActivityIndicator size="small" color={BLUE} />
        ) : pastExcuses.length === 0 ? (
          <View style={[styles.historyCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.historyEmptyText, { color: textMut }]}>No past excuse requests.</Text>
          </View>
        ) : (
          pastExcuses.map(e => <HistoryCard key={e.request_id} excuse={e} isDarkMode={isDarkMode} />)
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit */}
      <View style={[styles.submitContainer, { backgroundColor: bg }]}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitText}>Submit Request</Text>}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      <BottomNav navigation={navigation} active="History" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  backButton:  { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1f36' },
  scroll:      { flex: 1, paddingHorizontal: 18 },

  // Type toggle
  toggleRow: {
    flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 18, gap: 4,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  toggleBtnActive: { backgroundColor: BLUE },
  toggleBtnPrior:  { backgroundColor: ORANGE },
  toggleText:      { fontSize: 12, fontWeight: '600', color: '#8a94a6' },
  toggleTextActive:{ color: '#fff' },

  // Info banner
  infoBanner: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 10 },
  infoText:   { flex: 1, fontSize: 13, lineHeight: 19 },

  // Labels
  label: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },

  // Dropdown
  dropdown:     { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dropdownText: { fontSize: 14, flex: 1, marginRight: 8 },
  dropdownMenu: { borderRadius: 12, borderWidth: 1.5, marginBottom: 16, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 13 },
  dropdownItemBorder: { borderBottomWidth: 1 },
  dropdownItemText:   { fontSize: 13 },

  // Textarea
  textArea: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, minHeight: 110, marginBottom: 22 },

  // Upload
  uploadBox:           { borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', paddingVertical: 28, alignItems: 'center', marginBottom: 14 },
  uploadIconContainer: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  uploadTitle:         { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  uploadSubtitle:      { fontSize: 12 },

  // File card
  fileCard:          { borderRadius: 12, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  fileIconContainer: { width: 38, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  fileInfo:          { flex: 1 },
  fileName:          { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  fileSize:          { fontSize: 11 },
  removeButton:      { padding: 6 },

  // Submit
  submitContainer: { paddingHorizontal: 18, paddingBottom: 82 },
  submitButton:    { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitText:      { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // History card
  historyCard:      { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  historyHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyClassText: { fontSize: 14, fontWeight: '700' },
  historyDateText:  { fontSize: 12, marginBottom: 6 },
  historyReasonText:{ fontSize: 13, lineHeight: 18 },
  historyEmptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 10 },

  // Prior badge (small, inside history card)
  priorBadgeSmall:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff8e6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  priorBadgeSmallText: { fontSize: 10, fontWeight: '700', color: ORANGE },

  // Status badges
  statusBadge:          { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText:           { fontSize: 11, fontWeight: '700' },
  statusPending:        { backgroundColor: '#fff3e0' },
  statusTextPending:    { color: '#e65100' },
  statusApproved:       { backgroundColor: '#e8f5e9' },
  statusTextApproved:   { color: '#2e7d32' },
  statusRejected:       { backgroundColor: '#ffebee' },
  statusTextRejected:   { color: '#c62828' },
});
