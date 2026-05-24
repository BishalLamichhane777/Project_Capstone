import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert, TextInput, Modal,
} from 'react-native';
import AdminBottomNav from '../components/AdminBottomNav';

const BLUE = '#2952e3';

const initialClasses = [
  { id: '1', subject: 'Database Systems',  code: 'CS-301', day: 'Monday',    time: '10:00 AM', room: 'Room 205', teacher: 'Prof. Sharma', duration: '1h 30m', color: '#eef2ff', iconColor: BLUE,      icon: '🗄️' },
  { id: '2', subject: 'DAML',              code: 'CS-302', day: 'Tuesday',   time: '09:00 AM', room: 'Room 201', teacher: 'Prof. Karki',  duration: '1h 30m', color: '#f3eeff', iconColor: '#7c3aed', icon: '📊' },
  { id: '3', subject: 'Networks',          code: 'CS-401', day: 'Wednesday', time: '10:00 AM', room: 'Room 301', teacher: 'Prof. Rai',    duration: '1h 30m', color: '#e8f4ff', iconColor: '#2980b9', icon: '🌐' },
  { id: '4', subject: 'Operating Systems', code: 'CS-303', day: 'Thursday',  time: '09:00 AM', room: 'Room 102', teacher: 'Prof. Bista',  duration: '1h 00m', color: '#edfaf3', iconColor: '#27ae60', icon: '💻' },
  { id: '5', subject: 'Mathematics III',   code: 'MA-201', day: 'Friday',    time: '12:30 PM', room: 'Room 101', teacher: 'Prof. Thapa',  duration: '1h 00m', color: '#fff4e6', iconColor: '#e67e22', icon: 'Σ'  },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const shortDay = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };
const emptyForm = { subject: '', code: '', day: 'Monday', time: '', room: '', teacher: '', duration: '' };

function ClassCard({ item, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.iconBox, { backgroundColor: item.color }]}>
          <Text style={[styles.iconText, { color: item.iconColor }]}>{item.icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.subjectText}>{item.subject}</Text>
          <Text style={styles.codeText}>{item.code} · {shortDay[item.day] || item.day}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>🕐 {item.time}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.detailText}>📍 {item.room}</Text>
          </View>
          <Text style={styles.teacherText}>👤 {item.teacher}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function FormModal({ visible, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [dayOpen, setDayOpen] = useState(false);

  React.useEffect(() => { setForm(initial || emptyForm); }, [initial, visible]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!form.subject.trim() || !form.code.trim() || !form.time.trim() || !form.room.trim() || !form.teacher.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{initial?.id ? 'Edit Class' : 'Add New Class'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key: 'subject',  label: 'Subject Name', placeholder: 'e.g. Database Systems' },
              { key: 'code',     label: 'Course Code',  placeholder: 'e.g. CS-301' },
              { key: 'time',     label: 'Time',         placeholder: 'e.g. 10:00 AM' },
              { key: 'room',     label: 'Room',         placeholder: 'e.g. Room 205' },
              { key: 'teacher',  label: 'Teacher',      placeholder: 'e.g. Prof. Sharma' },
              { key: 'duration', label: 'Duration',     placeholder: 'e.g. 1h 30m' },
            ].map(field => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={field.placeholder}
                  placeholderTextColor="#aab0be"
                  value={form[field.key]}
                  onChangeText={val => update(field.key, val)}
                />
              </View>
            ))}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Day</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.dropdownTrigger]}
                onPress={() => setDayOpen(!dayOpen)}
              >
                <Text style={styles.dropdownValue}>{form.day}</Text>
                <Text style={styles.dropdownArrow}>{dayOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {dayOpen && (
                <View style={styles.dropdownMenu}>
                  {days.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={styles.dropdownItem}
                      onPress={() => { update('day', d); setDayOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, form.day === d && styles.dropdownItemActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{initial?.id ? 'Save Changes' : 'Add Class'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ManageSchedulesScreen({ navigation }) {
  const [classes, setClasses]         = useState(initialClasses);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [activeDay, setActiveDay]     = useState('All');

  const filtered = activeDay === 'All' ? classes : classes.filter(c => c.day === activeDay);

  const handleEdit   = (item) => { setEditTarget(item); setModalVisible(true); };
  const handleAdd    = ()     => { setEditTarget(null); setModalVisible(true); };

  const handleDelete = (item) => {
    Alert.alert('Delete Class', `Remove ${item.subject}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setClasses(prev => prev.filter(c => c.id !== item.id)) },
    ]);
  };

  const handleSave = (form) => {
    if (editTarget?.id) {
      setClasses(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...form } : c));
    } else {
      setClasses(prev => [...prev, { ...form, id: Date.now().toString(), color: '#eef2ff', iconColor: BLUE, icon: '📚' }]);
    }
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Schedules</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Compact Day Filter */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {['All', ...days].map(d => {
            const label = d === 'All' ? 'All' : shortDay[d];
            const isActive = activeDay === d;
            const count = d === 'All' ? classes.length : classes.filter(c => c.day === d).length;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dayPill, isActive && styles.dayPillActive]}
                onPress={() => setActiveDay(d)}
              >
                <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                  {label}
                </Text>
                <View style={[styles.dayPillCount, isActive && styles.dayPillCountActive]}>
                  <Text style={[styles.dayPillCountText, isActive && styles.dayPillCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.countText}>
          {filtered.length} class{filtered.length !== 1 ? 'es' : ''}
          {activeDay !== 'All' ? ` on ${shortDay[activeDay]}` : ' total'}
        </Text>

        {filtered.map(item => (
          <ClassCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No classes for {activeDay}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        initial={editTarget}
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

  // Compact filter
  filterWrapper: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  filterContent: { paddingHorizontal: 16, gap: 6 },
  dayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 20, backgroundColor: '#f0f2f8',
    borderWidth: 1, borderColor: 'transparent',
  },
  dayPillActive: {
    backgroundColor: '#eef2ff',
    borderColor: BLUE,
  },
  dayPillText: { fontSize: 12, color: '#8a94a6', fontWeight: '600' },
  dayPillTextActive: { color: BLUE, fontWeight: '700' },
  dayPillCount: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#e0e4f0',
    justifyContent: 'center', alignItems: 'center',
  },
  dayPillCountActive: { backgroundColor: BLUE },
  dayPillCountText: { fontSize: 9, color: '#8a94a6', fontWeight: '700' },
  dayPillCountTextActive: { color: '#ffffff' },

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
  editBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff0f0', justifyContent: 'center', alignItems: 'center' },
  actionIcon: { fontSize: 13 },

  emptyBox: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#8a94a6', fontWeight: '600' },

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
  dropdownMenu: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6e9f0', marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  dropdownItemText: { fontSize: 13, color: '#8a94a6' },
  dropdownItemActive: { color: BLUE, fontWeight: '700' },
  saveBtn: { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
});