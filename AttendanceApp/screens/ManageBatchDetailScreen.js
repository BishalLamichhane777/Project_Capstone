import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, TextInput, Modal,
  ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { Users, ChevronLeft, Pencil, X, Check } from 'lucide-react-native';

const BLUE = '#2952e3';

const avatarColors = [
  '#d0d7f5', '#fde8d8', '#d4f4e2', '#fde2e2',
  '#e8d5f5', '#d5edf5', '#f5f0d5', '#f5d5e8',
];

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function StudentRow({ student, index, onRemove }) {
  const color = avatarColors[index % avatarColors.length];
  return (
    <View style={styles.studentRow}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{getInitials(student.fullname)}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.fullname}</Text>
        <Text style={styles.studentMeta}>{student.roll_number}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() =>
          Alert.alert(
            'Remove Student',
            `Remove ${student.fullname} from this batch?\n\nThis will not affect their class enrollments.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => onRemove(student) },
            ],
          )
        }
      >
        <X size={14} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  );
}

function EditModal({ visible, onClose, onSave, initialName, initialDesc, saving }) {
  const [batchName, setBatchName] = useState(initialName || '');
  const [description, setDescription] = useState(initialDesc || '');

  useEffect(() => {
    if (visible) {
      setBatchName(initialName || '');
      setDescription(initialDesc || '');
    }
  }, [visible, initialName, initialDesc]);

  const handleSave = () => {
    if (!batchName.trim()) {
      Alert.alert('Missing Field', 'Batch name is required.');
      return;
    }
    onSave({ batch_name: batchName.trim(), description: description.trim() || null });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Batch</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={13} color="#8a94a6" />
            </TouchableOpacity>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>BATCH NAME</Text>
            <TextInput
              style={styles.fieldInput}
              value={batchName}
              onChangeText={setBatchName}
              placeholderTextColor="#aab0be"
              placeholder="Batch name"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#aab0be"
              placeholder="Optional description"
              multiline
              numberOfLines={3}
            />
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
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AddStudentsModal({ visible, onClose, onAdd, allStudents, currentStudentIds, saving }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setSelected([]);
    }
  }, [visible]);

  const available = allStudents.filter(
    s => !currentStudentIds.includes(s.student_id),
  );

  const filtered = available.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.fullname || '').toLowerCase().includes(q) ||
      (s.roll_number || '').toLowerCase().includes(q)
    );
  });

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { maxHeight: '90%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Students</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={13} color="#8a94a6" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.fieldInput, { marginBottom: 12 }]}
            placeholder="Search by name or roll number..."
            placeholderTextColor="#aab0be"
            value={search}
            onChangeText={setSearch}
          />

          {filtered.length === 0 ? (
            <Text style={styles.emptyAddText}>
              {available.length === 0
                ? 'All students are already in this batch.'
                : 'No students match your search.'}
            </Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.student_id)}
              style={{ maxHeight: 340 }}
              renderItem={({ item, index }) => {
                const isSelected = selected.includes(item.student_id);
                const color = avatarColors[index % avatarColors.length];
                return (
                  <TouchableOpacity
                    style={[styles.addStudentRow, isSelected && styles.addStudentRowSelected]}
                    onPress={() => toggle(item.student_id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatar, { backgroundColor: color }]}>
                      <Text style={styles.avatarText}>{getInitials(item.fullname)}</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{item.fullname}</Text>
                      <Text style={styles.studentMeta}>{item.roll_number}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check size={12} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.saveBtn, selected.length === 0 && styles.saveBtnDisabled]}
            onPress={() => onAdd(selected)}
            disabled={selected.length === 0 || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>
                Add Selected ({selected.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ManageBatchDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const [batch, setBatch] = useState(route?.params?.batch || null);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Enroll-batch-to-class state ───────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  const batchId = batch?.batch_id;

  const fetchBatch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [batchRes, studentsRes] = await Promise.all([
        fetch(`${API.adminBatchDetail}/${batchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(API.adminStudentsList, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const batchData = await batchRes.json();
      const studentsData = await studentsRes.json();

      if (batchRes.ok) {
        setBatch(batchData);
        setStudents(batchData.students || []);
      } else {
        Alert.alert('Error', batchData.error || 'Failed to load batch');
      }
      if (studentsRes.ok) setAllStudents(studentsData);
    } catch (e) {
      Alert.alert('Error', 'Network error while loading batch');
    } finally {
      setLoading(false);
    }
  }, [batchId, token]);

  useEffect(() => {
    fetchBatch();
    fetchClasses();
  }, [fetchBatch]);

  const fetchClasses = async () => {
    try {
      const res = await fetch(API.adminClassList, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (e) {
      console.error('Failed to fetch classes:', e);
    }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      const res = await fetch(`${API.adminBatchDetail}/${batchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setEditVisible(false);
        fetchBatch();
      } else {
        Alert.alert('Error', data.error || 'Failed to update batch');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating batch');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (student) => {
    Alert.alert(
      'Remove Student',
      `Remove ${student.fullname} from this batch? They will also be unenrolled from all associated classes.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(
                `${API.adminBatchStudents}/${batchId}/students/${student.student_id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              const data = await res.json();
              if (res.ok) {
                Alert.alert(
                  'Removed',
                  `${student.fullname} removed from batch and unenrolled from ${data.unenrolled_from_classes} class(es).`,
                );
                fetchBatch();
              } else {
                Alert.alert('Error', data.error || 'Failed to remove student.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleAddStudents = async (selectedIds) => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${API.adminBatchStudents}/${batchId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ student_ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddVisible(false);
        fetchBatch();
      } else {
        Alert.alert('Error', data.error || 'Failed to add students');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while adding students');
    } finally {
      setSaving(false);
    }
  };

  const handleEnrollToClass = async () => {
    if (!selectedClassId) {
      Alert.alert('Select a class', 'Please select a class to enroll this batch into.');
      return;
    }
    setEnrolling(true);
    try {
      const res = await fetch(
        `${API.adminEnrollBatch}/${selectedClassId}/enroll-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ batch_id: batchId }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          'Success',
          `Batch enrolled into class successfully! ${data.enrolled ?? ''} student(s) enrolled.`,
        );
        setEnrollModalVisible(false);
        setSelectedClassId(null);
      } else {
        Alert.alert('Error', data.error || 'Failed to enroll batch into class.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const currentStudentIds = students.map(s => s.student_id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {batch?.batch_name || 'Batch Detail'}
        </Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)}>
          <Pencil size={18} color={BLUE} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Batch info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoName}>{batch?.batch_name}</Text>
            {batch?.description ? (
              <Text style={styles.infoDesc}>{batch.description}</Text>
            ) : null}
            <View style={styles.infoRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{batch?.student_count || 0} students</Text>
              </View>
            </View>
          </View>

          {/* Students section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Students</Text>
            <Text style={styles.sectionCount}>{students.length}</Text>
          </View>

          {students.length === 0 ? (
            <View style={styles.emptyBox}>
              <Users size={32} color="#8a94a6" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>No students in this batch yet</Text>
              <Text style={styles.emptySubtitle}>Tap "Add Students" below to get started.</Text>
            </View>
          ) : (
            <View style={styles.studentsCard}>
              {students.map((student, index) => (
                <StudentRow
                  key={student.student_id}
                  student={student}
                  index={index}
                  onRemove={handleRemove}
                />
              ))}
            </View>
          )}

          {/* Enroll Batch to Class button */}
          <TouchableOpacity
            style={styles.enrollBatchBtn}
            onPress={() => setEnrollModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.enrollBatchBtnText}>Enroll Batch to Class</Text>
          </TouchableOpacity>

          {/* Add Students button */}
          <TouchableOpacity
            style={styles.addStudentsBtn}
            onPress={() => setAddVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.addStudentsBtnText}>+ Add Students</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <EditModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSave={handleEdit}
        initialName={batch?.batch_name}
        initialDesc={batch?.description}
        saving={saving}
      />

      <AddStudentsModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddStudents}
        allStudents={allStudents}
        currentStudentIds={currentStudentIds}
        saving={saving}
      />

      {/* ── Enroll Batch to Class Modal ───────────────────────────────── */}
      <Modal
        visible={enrollModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEnrollModalVisible(false)}
      >
        <View style={styles.enrollModalOverlay}>
          <View style={styles.enrollModalCard}>
            <Text style={styles.enrollModalTitle}>Enroll Batch to Class</Text>
            <Text style={styles.enrollModalSubtitle}>
              Select a class to enroll all students in this batch
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {classes.length === 0 ? (
                <Text style={styles.enrollEmptyText}>No classes available</Text>
              ) : (
                classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.class_id || cls.id}
                    onPress={() => setSelectedClassId(cls.class_id || cls.id)}
                    style={[
                      styles.classRow,
                      selectedClassId === (cls.class_id || cls.id) && styles.classRowSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.className}>
                        {cls.class_name || cls.name || 'Unnamed Class'}
                      </Text>
                      {cls.subject ? (
                        <Text style={styles.classSubject}>{cls.subject}</Text>
                      ) : null}
                    </View>
                    {selectedClassId === (cls.class_id || cls.id) && (
                      <Text style={styles.classCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={handleEnrollToClass}
              disabled={!selectedClassId || enrolling}
              style={[
                styles.enrollConfirmBtn,
                (!selectedClassId || enrolling) && styles.enrollConfirmBtnDisabled,
              ]}
              activeOpacity={0.85}
            >
              {enrolling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.enrollConfirmBtnText}>Enroll Batch</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setEnrollModalVisible(false); setSelectedClassId(null); }}
              style={styles.enrollCancelBtn}
            >
              <Text style={styles.enrollCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminBottomNav navigation={navigation} active="Batches" />
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1f36', flex: 1, textAlign: 'center' },
  editBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },

  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  infoCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  infoName: { fontSize: 18, fontWeight: '800', color: '#1a1f36', marginBottom: 4 },
  infoDesc: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  countBadge: {
    backgroundColor: '#eef2ff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  countBadgeText: { fontSize: 12, color: BLUE, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1f36' },
  sectionCount: {
    fontSize: 12, color: BLUE, fontWeight: '700',
    backgroundColor: '#eef2ff', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },

  studentsCard: {
    backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f2f5',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#1a1f36' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  studentMeta: { fontSize: 11, color: '#8a94a6' },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff0f0', justifyContent: 'center', alignItems: 'center',
  },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a1f36', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#8a94a6', textAlign: 'center' },

  addStudentsBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginBottom: 12,
  },
  addStudentsBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1f36' },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f0f2f8', justifyContent: 'center', alignItems: 'center',
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#8a94a6',
    letterSpacing: 0.5, marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#f8f9ff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e6e9f0', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1a1f36',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 8, marginBottom: 8,
  },
  saveBtnDisabled: { backgroundColor: '#aab0be' },
  saveBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },

  // Add students modal list
  addStudentRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f0f2f5',
    borderRadius: 10,
  },
  addStudentRowSelected: { backgroundColor: '#f0f4ff' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#c8ccd8', justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: BLUE, borderColor: BLUE },
  emptyAddText: { fontSize: 13, color: '#8a94a6', textAlign: 'center', paddingVertical: 20 },

  // Enroll batch to class
  enrollBatchBtn: {
    backgroundColor: '#2952e3', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginBottom: 10,
  },
  enrollBatchBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
  enrollModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  enrollModalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '70%',
  },
  enrollModalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1f36', marginBottom: 4 },
  enrollModalSubtitle: { fontSize: 13, color: '#8a94a6', marginBottom: 16 },
  enrollEmptyText: { color: '#8a94a6', textAlign: 'center', marginTop: 20 },
  classRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 10, marginBottom: 8, backgroundColor: '#f8f9ff',
    borderWidth: 1.5, borderColor: '#e6e9f0',
  },
  classRowSelected: { backgroundColor: '#e8f4fd', borderColor: '#3498DB' },
  className: { fontSize: 15, fontWeight: '700', color: '#1a1f36' },
  classSubject: { fontSize: 12, color: '#8a94a6', marginTop: 2 },
  classCheckmark: { fontSize: 20, color: '#3498DB', fontWeight: '700' },
  enrollConfirmBtn: {
    backgroundColor: '#27AE60', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  enrollConfirmBtnDisabled: { backgroundColor: '#95A5A6' },
  enrollConfirmBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  enrollCancelBtn: { alignItems: 'center', marginTop: 12 },
  enrollCancelBtnText: { color: '#8a94a6', fontSize: 14 },
});
