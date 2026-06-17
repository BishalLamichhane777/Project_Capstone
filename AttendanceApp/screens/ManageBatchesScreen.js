import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert, TextInput, Modal,
  ActivityIndicator,
} from 'react-native';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { Users, ChevronLeft, Trash2, Eye, X } from 'lucide-react-native';

const BLUE = '#2952e3';

function BatchCard({ item, onDelete, onView }) {
  const createdDate = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : '—';

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.iconBox, { backgroundColor: '#eef2ff' }]}>
          <Users size={18} color={BLUE} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.batchName}>{item.batch_name}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{item.student_count} students</Text>
            </View>
          </View>
          {item.description ? (
            <Text style={styles.descriptionText}>{item.description}</Text>
          ) : (
            <Text style={styles.noDescText}>No description</Text>
          )}
          <Text style={styles.dateText}>Created {createdDate}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => onView(item)}>
          <Eye size={13} color={BLUE} />
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
          <Trash2 size={13} color="#e74c3c" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FormModal({ visible, onClose, onSave, saving }) {
  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible) {
      setBatchName('');
      setDescription('');
    }
  }, [visible]);

  const handleSave = () => {
    if (!batchName.trim()) {
      Alert.alert('Missing Field', 'Batch name is required.');
      return;
    }
    onSave({
      batch_name:  batchName.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Batch</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={13} color="#8a94a6" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>BATCH NAME</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. CS Year 1 Morning"
                placeholderTextColor="#aab0be"
                value={batchName}
                onChangeText={setBatchName}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                placeholder="e.g. First-year Computer Science students"
                placeholderTextColor="#aab0be"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Create Batch</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ManageBatchesScreen({ navigation }) {
  const { token } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API.adminBatches, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setBatches(data);
      else Alert.alert('Error', data.error || 'Failed to load batches');
    } catch (e) {
      Alert.alert('Error', 'Network error while loading batches');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Batch',
      `Remove "${item.batch_name}"?\n\nThis will not affect any existing class enrollments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API.adminBatches}/${item.batch_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok) {
                setBatches(prev => prev.filter(b => b.batch_id !== item.batch_id));
                Alert.alert('Deleted', 'Batch removed successfully.');
              } else {
                Alert.alert('Error', data.error || 'Failed to delete batch');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting batch');
            }
          },
        },
      ],
    );
  };

  const handleCreate = async (form) => {
    console.log('handleCreate called with form:', JSON.stringify(form));
    setSaving(true);
    try {
      const res = await fetch(API.adminBatches, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', JSON.stringify(data));
      if (res.ok) {
        setModalVisible(false);
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'Failed to create batch');
      }
    } catch (e) {
      console.log('Error caught:', e.message);
      Alert.alert('Error', 'Network error while creating batch');
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
        <Text style={styles.headerTitle}>Manage Batches</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.countText}>
              {batches.length} batch{batches.length !== 1 ? 'es' : ''} total
            </Text>

            {batches.map(item => (
              <BatchCard
                key={item.batch_id}
                item={item}
                onDelete={handleDelete}
                onView={(b) => navigation.navigate('ManageBatchDetail', { batch: b })}
              />
            ))}

            {batches.length === 0 && (
              <View style={styles.emptyBox}>
                <View style={{ marginBottom: 10 }}>
                  <Users size={36} color="#8a94a6" />
                </View>
                <Text style={styles.emptyTitle}>No Batches Yet</Text>
                <Text style={styles.emptySubtitle}>Tap "+ Create" to make your first batch.</Text>
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
        saving={saving}
      />

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
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  batchName: { fontSize: 14, fontWeight: '700', color: '#1a1f36', flex: 1 },
  countBadge: {
    backgroundColor: '#eef2ff', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  countBadgeText: { fontSize: 11, color: BLUE, fontWeight: '700' },
  descriptionText: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  noDescText: { fontSize: 12, color: '#aab0be', fontStyle: 'italic', marginBottom: 4 },
  dateText: { fontSize: 11, color: '#aab0be' },
  cardActions: { flexDirection: 'row', gap: 8 },
  viewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#eef2ff', borderRadius: 10, paddingVertical: 9,
  },
  viewBtnText: { fontSize: 13, color: BLUE, fontWeight: '700' },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fff0f0', borderRadius: 10, paddingVertical: 9,
  },
  deleteBtnText: { fontSize: 13, color: '#e74c3c', fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1f36', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#8a94a6' },

  // Modal
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
    alignItems: 'center', marginTop: 8, marginBottom: 20,
  },
  saveBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
});
