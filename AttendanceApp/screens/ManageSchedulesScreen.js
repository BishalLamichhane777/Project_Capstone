import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, TextInput, Modal,
  ActivityIndicator, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { BookOpen, Clock, MapPin, User, Timer, Trash2, X, ChevronLeft, Calendar, ChevronDown } from 'lucide-react-native';

const BLUE = '#2952e3';

// ─── Helper: pad to 2 digits ──────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0');

// ─── DatePickerModal ──────────────────────────────────────────────────────────
// Pure RN modal — no external package needed.
// Outputs date as "YYYY-MM-DD" on confirm.
function DatePickerModal({ visible, value, onConfirm, onCancel, isDarkMode }) {
  const today = new Date();
  const initDate = value ? new Date(value + 'T00:00:00') : today;

  const [year,  setYear]  = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth() + 1); // 1-12
  const [day,   setDay]   = useState(initDate.getDate());

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value + 'T00:00:00') : today;
      setYear(d.getFullYear()); setMonth(d.getMonth() + 1); setDay(d.getDate());
    }
  }, [visible, value]);

  const years  = Array.from({ length: 5 }, (_, i) => today.getFullYear() + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Theme colours
  const sheetBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const titleClr  = isDarkMode ? '#ffffff' : '#1a1f36';
  const labelClr  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const scrollBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const scrollBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';
  const itemClr   = isDarkMode ? '#ffffff' : '#1a1f36';
  const cancelBg  = isDarkMode ? '#252b3e' : '#f0f2f8';
  const cancelClr = isDarkMode ? '#8a94b8' : '#8a94a6';

  const handleConfirm = () => {
    const safeDay = Math.min(day, daysInMonth);
    onConfirm(`${year}-${pad2(month)}-${pad2(safeDay)}`);
  };

  if (!visible) return null;
  return (
    <View style={[pickerStyles.overlay, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000, elevation: 1000 }]}>
      <View style={[pickerStyles.sheet, { backgroundColor: sheetBg }]}>
          <Text style={[pickerStyles.title, { color: titleClr }]}>Select Date</Text>
          <View style={pickerStyles.columnsRow}>
            {/* Year */}
            <View style={pickerStyles.col}>
              <Text style={[pickerStyles.colLabel, { color: labelClr }]}>Year</Text>
              <ScrollView style={[pickerStyles.colScroll, { backgroundColor: scrollBg, borderColor: scrollBdr }]} showsVerticalScrollIndicator={false}>
                {years.map(y => (
                  <TouchableOpacity key={y} style={[pickerStyles.item, y === year && pickerStyles.itemActive]}
                    onPress={() => setYear(y)}>
                    <Text style={[pickerStyles.itemText, { color: itemClr }, y === year && pickerStyles.itemTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* Month */}
            <View style={pickerStyles.col}>
              <Text style={[pickerStyles.colLabel, { color: labelClr }]}>Month</Text>
              <ScrollView style={[pickerStyles.colScroll, { backgroundColor: scrollBg, borderColor: scrollBdr }]} showsVerticalScrollIndicator={false}>
                {months.map(m => (
                  <TouchableOpacity key={m} style={[pickerStyles.item, m === month && pickerStyles.itemActive]}
                    onPress={() => setMonth(m)}>
                    <Text style={[pickerStyles.itemText, { color: itemClr }, m === month && pickerStyles.itemTextActive]}>{MON[m-1]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* Day */}
            <View style={pickerStyles.col}>
              <Text style={[pickerStyles.colLabel, { color: labelClr }]}>Day</Text>
              <ScrollView style={[pickerStyles.colScroll, { backgroundColor: scrollBg, borderColor: scrollBdr }]} showsVerticalScrollIndicator={false}>
                {days.map(d => (
                  <TouchableOpacity key={d} style={[pickerStyles.item, d === day && pickerStyles.itemActive]}
                    onPress={() => setDay(d)}>
                    <Text style={[pickerStyles.itemText, { color: itemClr }, d === day && pickerStyles.itemTextActive]}>{pad2(d)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={pickerStyles.btnRow}>
            <TouchableOpacity style={[pickerStyles.cancelBtn, { backgroundColor: cancelBg }]} onPress={onCancel}>
              <Text style={[pickerStyles.cancelText, { color: cancelClr }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pickerStyles.confirmBtn} onPress={handleConfirm}>
              <Text style={pickerStyles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
    </View>
  );
}

// ─── TimePickerModal ──────────────────────────────────────────────────────────
// Outputs time as "HH:MM".
function TimePickerModal({ visible, value, onConfirm, onCancel, isDarkMode }) {
  const parseTime = (v) => {
    if (v && /^\d{2}:\d{2}/.test(v)) {
      const [h, m] = v.split(':').map(Number);
      return { hour: h, minute: m };
    }
    return { hour: 9, minute: 0 };
  };

  const [hour,   setHour]   = useState(parseTime(value).hour);
  const [minute, setMinute] = useState(parseTime(value).minute);

  useEffect(() => {
    if (visible) { const t = parseTime(value); setHour(t.hour); setMinute(t.minute); }
  }, [visible, value]);

  const hours   = Array.from({ length: 24 }, (_, i) => i);
  // All 60 minutes
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Theme colours
  const sheetBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const titleClr  = isDarkMode ? '#ffffff' : '#1a1f36';
  const labelClr  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const scrollBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const scrollBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';
  const itemClr   = isDarkMode ? '#ffffff' : '#1a1f36';
  const cancelBg  = isDarkMode ? '#252b3e' : '#f0f2f8';
  const cancelClr = isDarkMode ? '#8a94b8' : '#8a94a6';

  if (!visible) return null;
  return (
    <View style={[pickerStyles.overlay, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000, elevation: 1000 }]}>
      <View style={[pickerStyles.sheet, { maxWidth: 280, backgroundColor: sheetBg }]}>
          <Text style={[pickerStyles.title, { color: titleClr }]}>Select Time</Text>
          <View style={pickerStyles.columnsRow}>
            {/* Hour */}
            <View style={pickerStyles.col}>
              <Text style={[pickerStyles.colLabel, { color: labelClr }]}>Hour</Text>
              <ScrollView style={[pickerStyles.colScroll, { backgroundColor: scrollBg, borderColor: scrollBdr }]} showsVerticalScrollIndicator={false}>
                {hours.map(h => (
                  <TouchableOpacity key={h} style={[pickerStyles.item, h === hour && pickerStyles.itemActive]}
                    onPress={() => setHour(h)}>
                    <Text style={[pickerStyles.itemText, { color: itemClr }, h === hour && pickerStyles.itemTextActive]}>{pad2(h)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* Minute */}
            <View style={pickerStyles.col}>
              <Text style={[pickerStyles.colLabel, { color: labelClr }]}>Minute</Text>
              <ScrollView style={[pickerStyles.colScroll, { backgroundColor: scrollBg, borderColor: scrollBdr }]} showsVerticalScrollIndicator={false}>
                {minutes.map(m => (
                  <TouchableOpacity key={m} style={[pickerStyles.item, m === minute && pickerStyles.itemActive]}
                    onPress={() => setMinute(m)}>
                    <Text style={[pickerStyles.itemText, { color: itemClr }, m === minute && pickerStyles.itemTextActive]}>{pad2(m)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={pickerStyles.btnRow}>
            <TouchableOpacity style={[pickerStyles.cancelBtn, { backgroundColor: cancelBg }]} onPress={onCancel}>
              <Text style={[pickerStyles.cancelText, { color: cancelClr }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pickerStyles.confirmBtn}
              onPress={() => onConfirm(`${pad2(hour)}:${pad2(minute)}`)}>
              <Text style={pickerStyles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '88%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 10,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#1a1f36', marginBottom: 16, textAlign: 'center' },
  columnsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  col: { flex: 1 },
  colLabel: { fontSize: 10, fontWeight: '700', color: '#8a94a6', textAlign: 'center',
    letterSpacing: 0.5, marginBottom: 6 },
  colScroll: { height: 180, borderRadius: 10, backgroundColor: '#f8f9ff',
    borderWidth: 1.5, borderColor: '#e6e9f0' },
  item: { paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  itemActive: { backgroundColor: BLUE + '22' },
  itemText: { fontSize: 15, color: '#1a1f36', fontWeight: '500' },
  itemTextActive: { color: BLUE, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f0f2f8', alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#8a94a6', fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center' },
  confirmText: { fontSize: 14, color: '#ffffff', fontWeight: '700' },
});

function ClassCard({ item, onDelete, onSetSchedule, isDarkMode }) {
  const cardBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const metaClr  = isDarkMode ? '#8a94b8' : '#6b7280';
  const iconBg   = isDarkMode ? '#1e2540' : '#eef2ff';
  const hasSchedule = item.scheduled_date || item.scheduled_time;
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <BookOpen size={18} color={BLUE} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.subjectText, { color: textPri }]}>{item.subject}</Text>
          <Text style={[styles.codeText, { color: textSub }]}>{item.class_name}</Text>
          <View style={styles.detailRow}>
            <Clock size={11} color={metaClr} />
            <Text style={[styles.detailText, { color: metaClr }]}>{item.schedule_time ? new Date(item.schedule_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}</Text>
            <Text style={[styles.dot, { color: textSub }]}>·</Text>
            <MapPin size={11} color={metaClr} />
            <Text style={[styles.detailText, { color: metaClr }]}>{item.room || 'TBD'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <User size={11} color={metaClr} />
            <Text style={[styles.teacherText, { marginLeft: 4, color: metaClr }]}>{item.teacher_name || 'Unassigned'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Timer size={11} color={metaClr} />
            <Text style={[styles.detailText, { marginLeft: 4, color: metaClr }]}>{item.duration_minutes}min · {item.enrolled_count || 0} students</Text>
          </View>
          {hasSchedule && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
              <Calendar size={11} color={BLUE} />
              <Text style={{ fontSize: 11, color: BLUE, fontWeight: '600' }}>
                {item.scheduled_date || ''}
                {item.scheduled_time ? ` at ${item.scheduled_time.slice(0, 5)}` : ''}
                {item.scheduled_end_time ? ` – ${item.scheduled_end_time.slice(0, 5)}` : ''}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => onSetSchedule && onSetSchedule(item)}>
            <Calendar size={13} color={BLUE} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
            <Trash2 size={13} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function FormModal({ visible, onClose, onSave, teachers, batches, saving, isDarkMode }) {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [teacherId, setTeacherId] = useState(null);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [scheduledDate,    setScheduledDate]    = useState('');
  const [scheduledTime,    setScheduledTime]    = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');

  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  useEffect(() => {
    if (visible) {
      setClassName(''); setSubject(''); setRoom('');
      setScheduleTime(''); setTeacherId(null); setTeacherOpen(false);
      setSelectedBatch(null); setBatchOpen(false);
      setScheduledDate(''); setScheduledTime(''); setScheduledEndTime('');
    }
  }, [visible]);

  const selectedTeacher = teachers.find(t => t.id === teacherId);

  const handleSave = () => {
    if (!className.trim() || !subject.trim()) {
      Alert.alert('Missing Fields', 'Class name and subject are required.');
      return;
    }
    onSave({
      class_name:         className.trim(),
      subject:            subject.trim(),
      room:               room.trim() || null,
      teacher_id:         teacherId,
      schedule_time:      scheduleTime.trim() || null,
      batch_id:           selectedBatch?.batch_id || null,
      scheduled_date:     scheduledDate  || null,
      scheduled_time:     scheduledTime  || null,
      scheduled_end_time: scheduledEndTime || null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Add New Class</Text>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              <X size={13} color="#8a94a6" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>CLASS NAME</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0', color: isDarkMode ? '#ffffff' : '#1a1f36' }]} placeholder="e.g. CS-301 Morning Batch" placeholderTextColor="#aab0be" value={className} onChangeText={setClassName} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>SUBJECT</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0', color: isDarkMode ? '#ffffff' : '#1a1f36' }]} placeholder="e.g. Database Systems" placeholderTextColor="#aab0be" value={subject} onChangeText={setSubject} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>ROOM</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0', color: isDarkMode ? '#ffffff' : '#1a1f36' }]} placeholder="e.g. Room 205" placeholderTextColor="#aab0be" value={room} onChangeText={setRoom} />
            </View>

            {/* Fine-grained schedule — picker buttons */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>SCHEDULE DATE (optional)</Text>
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={16} color="#8a94a6" style={{ marginRight: 8 }} />
                <Text style={[styles.pickerRowText, !scheduledDate && { color: '#aab0be' }, { color: isDarkMode ? (scheduledDate ? '#ffffff' : '#aab0be') : (scheduledDate ? '#1a1f36' : '#aab0be') }]}>
                  {scheduledDate || 'Tap to select date'}
                </Text>
                <ChevronDown size={14} color="#aab0be" />
              </TouchableOpacity>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>START TIME (optional)</Text>
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.7}
              >
                <Clock size={16} color="#8a94a6" style={{ marginRight: 8 }} />
                <Text style={[styles.pickerRowText, { color: isDarkMode ? (scheduledTime ? '#ffffff' : '#aab0be') : (scheduledTime ? '#1a1f36' : '#aab0be') }]}>
                  {scheduledTime || 'Tap to select time'}
                </Text>
                <ChevronDown size={14} color="#aab0be" />
              </TouchableOpacity>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>END TIME (optional)</Text>
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.7}
              >
                <Clock size={16} color="#8a94a6" style={{ marginRight: 8 }} />
                <Text style={[styles.pickerRowText, { color: isDarkMode ? (scheduledEndTime ? '#ffffff' : '#aab0be') : (scheduledEndTime ? '#1a1f36' : '#aab0be') }]}>
                  {scheduledEndTime || 'Tap to select time'}
                </Text>
                <ChevronDown size={14} color="#aab0be" />
              </TouchableOpacity>
            </View>

            {/* Teacher Picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>TEACHER</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setTeacherOpen(!teacherOpen)}
              >
                <Text style={[styles.dropdownValue, { color: isDarkMode ? '#ffffff' : '#1a1f36' }, !selectedTeacher && { color: '#aab0be' }]}>
                  {selectedTeacher ? selectedTeacher.fullname : 'Select a teacher'}
                </Text>
                <Text style={styles.dropdownArrow}>{teacherOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {teacherOpen && (
                <View style={[styles.dropdownMenu, { backgroundColor: isDarkMode ? '#1e2540' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
                  {teachers.length === 0 ? (
                    <View style={styles.dropdownItem}>
                      <Text style={[styles.dropdownItemText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>No teachers found</Text>
                    </View>
                  ) : (
                    teachers.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.dropdownItem, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]}
                        onPress={() => { setTeacherId(t.id); setTeacherOpen(false); }}
                      >
                        <Text style={[styles.dropdownItemText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }, teacherId === t.id && styles.dropdownItemActive]}>
                          {t.fullname} ({t.email})
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Batch Picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>ENROLL BATCH (OPTIONAL)</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setBatchOpen(!batchOpen)}
              >
                <Text style={[styles.dropdownValue, { color: isDarkMode ? '#ffffff' : '#1a1f36' }, !selectedBatch && { color: '#aab0be' }]}>
                  {selectedBatch ? `${selectedBatch.batch_name} (${selectedBatch.student_count} students)` : 'None — enroll students manually'}
                </Text>
                <Text style={styles.dropdownArrow}>{batchOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {batchOpen && (
                <View style={[styles.dropdownMenu, { backgroundColor: isDarkMode ? '#1e2540' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
                  <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]} onPress={() => { setSelectedBatch(null); setBatchOpen(false); }}>
                    <Text style={[styles.dropdownItemText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>None</Text>
                  </TouchableOpacity>
                  {batches.map(b => (
                    <TouchableOpacity key={b.batch_id} style={[styles.dropdownItem, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]}
                      onPress={() => { setSelectedBatch(b); setBatchOpen(false); }}>
                      <Text style={[styles.dropdownItemText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }, selectedBatch?.batch_id === b.batch_id && styles.dropdownItemActive]}>
                        {b.batch_name} — {b.student_count} students
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedBatch && (
                <View style={{ marginTop: 6, backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff', borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 12, color: '#3b5bdb' }}>
                    ✓ {selectedBatch.student_count} students will be enrolled automatically
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Add Class</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      <DatePickerModal
        visible={showDatePicker}
        value={scheduledDate}
        onConfirm={v => { setScheduledDate(v); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
        isDarkMode={isDarkMode}
      />
      <TimePickerModal
        visible={showStartPicker}
        value={scheduledTime}
        onConfirm={v => { setScheduledTime(v); setShowStartPicker(false); }}
        onCancel={() => setShowStartPicker(false)}
        isDarkMode={isDarkMode}
      />
      <TimePickerModal
        visible={showEndPicker}
        value={scheduledEndTime}
        onConfirm={v => { setScheduledEndTime(v); setShowEndPicker(false); }}
        onCancel={() => setShowEndPicker(false)}
        isDarkMode={isDarkMode}
      />
    </Modal>
  );
}

// ─── Schedule Modal (set/update schedule on existing class) ───────────────────
function ScheduleModal({ visible, onClose, onSave, item, saving, isDarkMode }) {
  const [scheduledDate,    setScheduledDate]    = useState('');
  const [scheduledTime,    setScheduledTime]    = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');

  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [showStartPicker,   setShowStartPicker]   = useState(false);
  const [showEndPicker,     setShowEndPicker]     = useState(false);

  useEffect(() => {
    if (visible && item) {
      setScheduledDate(item.scheduled_date || '');
      setScheduledTime(item.scheduled_time ? item.scheduled_time.slice(0, 5) : '');
      setScheduledEndTime(item.scheduled_end_time ? item.scheduled_end_time.slice(0, 5) : '');
    }
  }, [visible, item]);

  const handleSave = () => {
    onSave({
      scheduled_date:     scheduledDate  || null,
      scheduled_time:     scheduledTime  || null,
      scheduled_end_time: scheduledEndTime || null,
    });
  };

  return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Set Schedule</Text>
              <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
                <X size={13} color="#8a94a6" />
              </TouchableOpacity>
            </View>
            {item && (
              <Text style={{ fontSize: 13, color: '#8a94a6', marginBottom: 16 }}>
                {item.subject} — {item.class_name}
              </Text>
            )}

            {/* DATE */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>DATE</Text>
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={16} color="#8a94a6" style={{ marginRight: 8 }} />
                <Text style={[styles.pickerRowText, { color: isDarkMode ? (scheduledDate ? '#ffffff' : '#aab0be') : (scheduledDate ? '#1a1f36' : '#aab0be') }]}>
                  {scheduledDate || 'Tap to select date'}
                </Text>
                <ChevronDown size={14} color="#aab0be" />
              </TouchableOpacity>
            </View>

            {/* START TIME */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>START TIME</Text>
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.7}
              >
                <Clock size={16} color="#8a94a6" style={{ marginRight: 8 }} />
                <Text style={[styles.pickerRowText, { color: isDarkMode ? (scheduledTime ? '#ffffff' : '#aab0be') : (scheduledTime ? '#1a1f36' : '#aab0be') }]}>
                  {scheduledTime || 'Tap to select time'}
                </Text>
                <ChevronDown size={14} color="#aab0be" />
              </TouchableOpacity>
            </View>

            {/* END TIME */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>END TIME</Text>
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.7}
              >
                <Clock size={16} color="#8a94a6" style={{ marginRight: 8 }} />
                <Text style={[styles.pickerRowText, { color: isDarkMode ? (scheduledEndTime ? '#ffffff' : '#aab0be') : (scheduledEndTime ? '#1a1f36' : '#aab0be') }]}>
                  {scheduledEndTime || 'Tap to select time'}
                </Text>
                <ChevronDown size={14} color="#aab0be" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Schedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <DatePickerModal
          visible={showDatePicker}
          value={scheduledDate}
          onConfirm={v => { setScheduledDate(v); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
          isDarkMode={isDarkMode}
        />
        <TimePickerModal
          visible={showStartPicker}
          value={scheduledTime}
          onConfirm={v => { setScheduledTime(v); setShowStartPicker(false); }}
          onCancel={() => setShowStartPicker(false)}
          isDarkMode={isDarkMode}
        />
        <TimePickerModal
          visible={showEndPicker}
          value={scheduledEndTime}
          onConfirm={v => { setScheduledEndTime(v); setShowEndPicker(false); }}
          onCancel={() => setShowEndPicker(false)}
          isDarkMode={isDarkMode}
        />
      </Modal>
  );
}

export default function ManageSchedulesScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduleModalItem, setScheduleModalItem] = useState(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, teacherRes, batchRes] = await Promise.all([
        fetch(API.adminClassList, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API.adminUsers}?role=teacher`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.adminBatches, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const classData = await classRes.json();
      const teacherData = await teacherRes.json();
      const batchData = await batchRes.json();
      if (classRes.ok) setClasses(classData);
      else Alert.alert('Error', classData.error || 'Failed to load classes');
      if (teacherRes.ok) setTeachers(teacherData);
      else console.log('Could not load teachers:', teacherData.error);
      if (batchRes.ok) setBatches(batchData);
      else console.log('Could not load batches:', batchData.error);
    } catch (e) {
      console.log('Fetch error:', e);
      Alert.alert('Error', 'Network error while loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Class', `Remove "${item.subject}"?\n\nThis will also delete all sessions, attendance records, and enrollments for this class.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API.adminClassDelete}/${item.class_id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
              setClasses(prev => prev.filter(c => c.class_id !== item.class_id));
              Alert.alert('Deleted', 'Class removed successfully.');
            } else {
              Alert.alert('Error', data.error || 'Failed to delete class');
            }
          } catch (e) {
            Alert.alert('Error', 'Network error while deleting class');
          }
        }
      },
    ]);
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const res = await fetch(API.adminClassCreate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setModalVisible(false);
        Alert.alert('Success', 'Class created successfully.');
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'Failed to create class');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while creating class');
    } finally {
      setSaving(false);
    }
  };

  const handleSetSchedule = async (form) => {
    if (!scheduleModalItem) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API.adminClassSchedule}/${scheduleModalItem.class_id}/schedule`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setScheduleModalItem(null);
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'Failed to update schedule');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#1a1f2e' : '#ffffff'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={isDarkMode ? '#ffffff' : '#1a1f36'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Manage Schedules</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={[styles.countText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
              {classes.length} class{classes.length !== 1 ? 'es' : ''} total
            </Text>

            {classes.map(item => (
              <ClassCard
                key={item.class_id}
                item={item}
                onDelete={handleDelete}
                onSetSchedule={(cls) => setScheduleModalItem(cls)}
                isDarkMode={isDarkMode}
              />
            ))}

            {classes.length === 0 && (
              <View style={styles.emptyBox}>
                <View style={{ marginBottom: 10 }}>
                  <Calendar size={36} color="#8a94a6" />
                </View>
                <Text style={styles.emptyTitle}>No Classes Yet</Text>
                <Text style={styles.emptySubtitle}>Tap "+ Add" to create your first class.</Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleCreate}
        teachers={teachers}
        batches={batches}
        saving={saving}
        isDarkMode={isDarkMode}
      />

      <ScheduleModal
        visible={scheduleModalItem !== null}
        onClose={() => setScheduleModalItem(null)}
        onSave={handleSetSchedule}
        item={scheduleModalItem}
        saving={saving}
        isDarkMode={isDarkMode}
      />

      <AdminBottomNav navigation={navigation} active="Home" />
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
  addBtn: { backgroundColor: BLUE, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { fontSize: 13, color: '#ffffff', fontWeight: '700' },

  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  countText: { fontSize: 12, color: '#8a94a6', fontWeight: '600', marginBottom: 12 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1, gap: 3 },
  subjectText: { fontSize: 14, fontWeight: '700', color: '#1a1f36' },
  codeText: { fontSize: 12, color: '#8a94a6' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 11, color: '#6b7280' },
  dot: { fontSize: 11, color: '#8a94a6' },
  teacherText: { fontSize: 11, color: '#6b7280' },
  cardActions: { gap: 6 },
  scheduleBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff0f0', justifyContent: 'center', alignItems: 'center' },
  actionIcon: { fontSize: 13 },

  emptyBox: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1f36', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#8a94a6' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1f36' },
  modalCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f2f8', justifyContent: 'center', alignItems: 'center' },
  modalClose: { fontSize: 13, color: '#8a94a6', fontWeight: '700' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f8f9ff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e6e9f0', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1a1f36',
  },
  dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownValue: { fontSize: 14, color: '#1a1f36' },
  dropdownArrow: { fontSize: 10, color: '#8a94a6' },
  dropdownMenu: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6e9f0', marginTop: 4, overflow: 'hidden', maxHeight: 200 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  dropdownItemText: { fontSize: 13, color: '#8a94a6' },
  dropdownItemActive: { color: BLUE, fontWeight: '700' },
  saveBtn: { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pickerRowText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1f36',
    paddingVertical: 10,
  },
});