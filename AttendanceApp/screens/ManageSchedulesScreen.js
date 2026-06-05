import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert, TextInput, Modal,
  ActivityIndicator,
} from 'react-native';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { BookOpen, Clock, MapPin, User, Timer, Trash2, X, ChevronLeft, Calendar } from 'lucide-react-native';

const BLUE = '#2952e3';

function ClassCard({ item, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.iconBox, { backgroundColor: '#eef2ff' }]}>
          <BookOpen size={18} color={BLUE} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.subjectText}>{item.subject}</Text>
          <Text style={styles.codeText}>{item.class_name}</Text>
          <View style={styles.detailRow}>
            <Clock size={11} color="#6b7280" />
            <Text style={styles.detailText}>{item.schedule_time ? new Date(item.schedule_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}</Text>
            <Text style={styles.dot}>·</Text>
            <MapPin size={11} color="#6b7280" />
            <Text style={styles.detailText}>{item.room || 'TBD'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <User size={11} color="#6b7280" />
            <Text style={[styles.teacherText, { marginLeft: 4 }]}>{item.teacher_name || 'Unassigned'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Timer size={11} color="#6b7280" />
            <Text style={[styles.detailText, { marginLeft: 4 }]}>{item.duration_minutes}min · {item.enrolled_count || 0} students</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
            <Trash2 size={13} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function FormModal({ visible, onClose, onSave, teachers, saving }) {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [duration, setDuration] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [teacherId, setTeacherId] = useState(null);
  const [teacherOpen, setTeacherOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setClassName('');
      setSubject('');
      setRoom('');
      setDuration('');
      setScheduleTime('');
      setTeacherId(null);
      setTeacherOpen(false);
    }
  }, [visible]);

  const selectedTeacher = teachers.find(t => t.id === teacherId);

  const handleSave = () => {
    if (!className.trim() || !subject.trim() || !duration.trim()) {
      Alert.alert('Missing Fields', 'Class name, subject, and duration are required.');
      return;
    }
    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur <= 0) {
      Alert.alert('Invalid Duration', 'Duration must be a positive number (minutes).');
      return;
    }
    onSave({
      class_name: className.trim(),
      subject: subject.trim(),
      room: room.trim() || null,
      duration_minutes: dur,
      teacher_id: teacherId,
      schedule_time: scheduleTime.trim() || null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Class</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={13} color="#8a94a6" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CLASS NAME</Text>
              <TextInput style={styles.fieldInput} placeholder="e.g. CS-301 Morning Batch" placeholderTextColor="#aab0be" value={className} onChangeText={setClassName} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SUBJECT</Text>
              <TextInput style={styles.fieldInput} placeholder="e.g. Database Systems" placeholderTextColor="#aab0be" value={subject} onChangeText={setSubject} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ROOM</Text>
              <TextInput style={styles.fieldInput} placeholder="e.g. Room 205" placeholderTextColor="#aab0be" value={room} onChangeText={setRoom} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DURATION (MINUTES)</Text>
              <TextInput style={styles.fieldInput} placeholder="e.g. 90" placeholderTextColor="#aab0be" value={duration} onChangeText={setDuration} keyboardType="numeric" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SCHEDULE TIME (ISO 8601, optional)</Text>
              <TextInput style={styles.fieldInput} placeholder="e.g. 2026-06-02T10:00:00" placeholderTextColor="#aab0be" value={scheduleTime} onChangeText={setScheduleTime} />
            </View>

            {/* Teacher Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TEACHER</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.dropdownTrigger]}
                onPress={() => setTeacherOpen(!teacherOpen)}
              >
                <Text style={[styles.dropdownValue, !selectedTeacher && { color: '#aab0be' }]}>
                  {selectedTeacher ? selectedTeacher.fullname : 'Select a teacher'}
                </Text>
                <Text style={styles.dropdownArrow}>{teacherOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {teacherOpen && (
                <View style={styles.dropdownMenu}>
                  {teachers.length === 0 ? (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.dropdownItemText}>No teachers found</Text>
                    </View>
                  ) : (
                    teachers.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.dropdownItem}
                        onPress={() => { setTeacherId(t.id); setTeacherOpen(false); }}
                      >
                        <Text style={[styles.dropdownItemText, teacherId === t.id && styles.dropdownItemActive]}>
                          {t.fullname} ({t.email})
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
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
    </Modal>
  );
}

export default function ManageSchedulesScreen({ navigation }) {
  const { token } = useAuth();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, teacherRes] = await Promise.all([
        fetch(API.adminClassList, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API.adminUsers}?role=teacher`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const classData = await classRes.json();
      const teacherData = await teacherRes.json();
      if (classRes.ok) setClasses(classData);
      else Alert.alert('Error', classData.error || 'Failed to load classes');
      if (teacherRes.ok) setTeachers(teacherData);
      else console.log('Could not load teachers:', teacherData.error);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Schedules</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.countText}>
              {classes.length} class{classes.length !== 1 ? 'es' : ''} total
            </Text>

            {classes.map(item => (
              <ClassCard key={item.class_id} item={item} onDelete={handleDelete} />
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
        saving={saving}
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
});