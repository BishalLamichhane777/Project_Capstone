import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  ChevronLeft, Search, User, Trash2, Edit2, X, GraduationCap,
  Phone, Mail, BookOpen, UserPlus,
} from 'lucide-react-native';

const BLUE = '#2952e3';

// ─── Edit Student Field — defined OUTSIDE modal to prevent keyboard dismiss ──
function EditField({ label, value, onChange, keyboardType, autoCapitalize, placeholder, textPri, textSub, inputBg, inputBdr }) {
  return (
    <>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: textSub, marginBottom: 6, marginTop: 14 }}>
        {label}
      </Text>
      <TextInput
        style={{
          borderRadius: 12, borderWidth: 1.5, borderColor: inputBdr,
          paddingHorizontal: 14, paddingVertical: 13,
          fontSize: 14, backgroundColor: inputBg, color: textPri,
        }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#aab0be"
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'words'}
        autoCorrect={false}
        returnKeyType="next"
      />
    </>
  );
}

// ─── Edit Student Modal ───────────────────────────────────────────────────────
function EditStudentModal({ visible, onClose, student, isDarkMode, token, onSaved }) {
  const [fullname,    setFullname]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [rollNumber,  setRollNumber]  = useState('');
  const [program,     setProgram]     = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [saving,      setSaving]      = useState(false);

  const bg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  useEffect(() => {
    if (visible && student) {
      setFullname(student.fullname || '');
      setEmail(student.email || '');
      setPhone(student.phone || '');
      setRollNumber(student.roll_number || '');
      setProgram(student.program || '');
      setYearOfStudy(student.year_of_study ? String(student.year_of_study) : '');
    }
  }, [visible, student]);

  const handleSave = async () => {
    if (!fullname.trim()) { Alert.alert('Validation', 'Full name cannot be empty.'); return; }
    if (!email.trim())    { Alert.alert('Validation', 'Email cannot be empty.'); return; }
    if (!rollNumber.trim()) { Alert.alert('Validation', 'Roll number cannot be empty.'); return; }

    setSaving(true);
    try {
      const body = {
        fullname:     fullname.trim(),
        email:        email.trim().toLowerCase(),
        phone:        phone.trim() || null,
        roll_number:  rollNumber.trim().toUpperCase(),
        program:      program.trim() || null,
        year_of_study: yearOfStudy ? parseInt(yearOfStudy, 10) : null,
      };

      const res = await fetch(`${API.adminStudentUpdate}/${student.student_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      Alert.alert('Success', 'Student updated successfully!');
      onSaved(data);
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = { textPri, textSub, inputBg, inputBdr };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: overlay }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '88%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPri }}>Edit Student</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16,
              backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8', justifyContent: 'center', alignItems: 'center' }}>
              <X size={20} color={textSub} />
            </TouchableOpacity>
          </View>
          {student && (
            <Text style={{ fontSize: 12, color: textSub, marginBottom: 8 }}>
              {student.roll_number}
            </Text>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
            <EditField label="FULL NAME" value={fullname} onChange={setFullname}
              placeholder="e.g. Aarav Thapa" {...fieldProps} />
            <EditField label="EMAIL" value={email} onChange={setEmail}
              placeholder="e.g. aarav@example.com"
              keyboardType="email-address" autoCapitalize="none" {...fieldProps} />
            <EditField label="PHONE (optional)" value={phone} onChange={setPhone}
              placeholder="+977 98XXXXXXXX"
              keyboardType="phone-pad" autoCapitalize="none" {...fieldProps} />
            <EditField label="ROLL NUMBER" value={rollNumber} onChange={setRollNumber}
              placeholder="e.g. CS-2024-001"
              autoCapitalize="characters" {...fieldProps} />
            <EditField label="PROGRAM (optional)" value={program} onChange={setProgram}
              placeholder="e.g. Computer Science" {...fieldProps} />
            <EditField label="YEAR OF STUDY (optional)" value={yearOfStudy} onChange={setYearOfStudy}
              placeholder="e.g. 1"
              keyboardType="numeric" autoCapitalize="none" {...fieldProps} />

            <TouchableOpacity
              style={{ backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
                marginTop: 22, opacity: saving ? 0.7 : 1 }}
              onPress={handleSave} disabled={saving} activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={{ fontSize: 15, color: '#ffffff', fontWeight: '700' }}>Save Changes</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Student Card ─────────────────────────────────────────────────────────────
function StudentCard({ student, onEdit, onDelete, isDarkMode }) {
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#6b7280';
  const iconBg  = isDarkMode ? '#1e2540' : '#eef2ff';

  const initials = (student.fullname || '??')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardTop}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#252b3e' : '#eef2ff' }]}>
          <Text style={[styles.avatarText, { color: BLUE }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.studentName, { color: textPri }]} numberOfLines={1}>
            {student.fullname}
          </Text>
          <View style={styles.metaRow}>
            <BookOpen size={11} color={textSub} />
            <Text style={[styles.metaText, { color: textSub }]}>{student.roll_number}</Text>
          </View>
          {student.program ? (
            <View style={styles.metaRow}>
              <GraduationCap size={11} color={textSub} />
              <Text style={[styles.metaText, { color: textSub }]}>{student.program}{student.year_of_study ? ` · Year ${student.year_of_study}` : ''}</Text>
            </View>
          ) : null}
          {student.email ? (
            <View style={styles.metaRow}>
              <Mail size={11} color={textSub} />
              <Text style={[styles.metaText, { color: textSub }]} numberOfLines={1}>{student.email}</Text>
            </View>
          ) : null}
          {student.phone ? (
            <View style={styles.metaRow}>
              <Phone size={11} color={textSub} />
              <Text style={[styles.metaText, { color: textSub }]}>{student.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: iconBg }]}
          onPress={() => onEdit(student)}
          activeOpacity={0.75}
        >
          <Edit2 size={13} color={BLUE} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0' }]}
          onPress={() => onDelete(student)}
          activeOpacity={0.75}
        >
          <Trash2 size={13} color="#e74c3c" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManageStudentsScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();

  const [students,      setStudents]      = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [editStudent,   setEditStudent]   = useState(null);
  const [editVisible,   setEditVisible]   = useState(false);

  const bg          = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg    = isDarkMode ? '#1a1f2e' : '#ffffff';
  const borderColor = isDarkMode ? '#2a2f42' : '#eef1f5';
  const textPrimary = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub     = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg     = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr    = isDarkMode ? '#2a2f42' : '#e6e9f0';

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API.adminStudentsList, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setStudents(data);
        setFiltered(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to load students');
      }
    } catch {
      Alert.alert('Error', 'Network error while loading students');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Live search filter
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setFiltered(students); return; }
    setFiltered(students.filter(s =>
      (s.fullname || '').toLowerCase().includes(q) ||
      (s.roll_number || '').toLowerCase().includes(q) ||
      (s.program || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    ));
  }, [searchQuery, students]);

  const handleDelete = (student) => {
    Alert.alert(
      'Delete Student',
      `Remove "${student.fullname}"?\n\nThis will permanently delete their account, attendance records, and face data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API.adminStudentDelete}/${student.student_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok) {
                setStudents(prev => prev.filter(s => s.student_id !== student.student_id));
                Alert.alert('Deleted', `${student.fullname} has been removed.`);
              } else {
                Alert.alert('Error', data.error || 'Failed to delete student');
              }
            } catch {
              Alert.alert('Error', 'Network error while deleting student');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (student) => {
    setEditStudent(student);
    setEditVisible(true);
  };

  const handleSaved = (updatedData) => {
    // Merge updated data back into the list
    setStudents(prev => prev.map(s =>
      s.student_id === editStudent.student_id
        ? { ...s, ...updatedData }
        : s
    ));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={headerBg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Manage Students</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddStudentFace')}
          activeOpacity={0.85}
        >
          <UserPlus size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: inputBdr }]}>
          <Search size={16} color={textSub} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search by name, roll no, program…"
            placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={textSub} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Count */}
            <Text style={[styles.countText, { color: textSub }]}>
              {filtered.length} student{filtered.length !== 1 ? 's' : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ' total'}
            </Text>

            {/* List */}
            {filtered.map(student => (
              <StudentCard
                key={student.student_id}
                student={student}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDarkMode={isDarkMode}
              />
            ))}

            {/* Empty state */}
            {filtered.length === 0 && !loading && (
              <View style={styles.emptyBox}>
                <User size={40} color="#aab0be" style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                  {searchQuery ? 'No students found' : 'No Students Yet'}
                </Text>
                <Text style={[styles.emptySub, { color: textSub }]}>
                  {searchQuery
                    ? 'Try a different name or roll number'
                    : 'Tap the + button to register the first student'}
                </Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Home" />

      <EditStudentModal
        visible={editVisible}
        onClose={() => { setEditVisible(false); setEditStudent(null); }}
        student={editStudent}
        isDarkMode={isDarkMode}
        token={token}
        onSaved={handleSaved}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center',
  },

  // Search
  searchWrap: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Scroll
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  countText: { fontSize: 12, fontWeight: '600', marginBottom: 12 },

  // Card
  card: {
    borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  cardInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaText: { fontSize: 12, flex: 1 },

  // Actions
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 9,
  },
  editBtnText: { fontSize: 13, color: BLUE, fontWeight: '700' },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 9,
  },
  deleteBtnText: { fontSize: 13, color: '#e74c3c', fontWeight: '700' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: 'center' },
});
