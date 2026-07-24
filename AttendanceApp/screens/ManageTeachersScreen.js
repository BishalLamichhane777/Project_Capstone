import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView,
  Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  ChevronLeft, Search, User, Edit2, X, Phone, Mail,
  UserPlus, UserCheck, UserX, GraduationCap, Eye, EyeOff,
} from 'lucide-react-native';

const BLUE  = '#2952e3';
const GREEN = '#27ae60';
const RED   = '#e74c3c';
const AMBER = '#f39c12';

// ─── Plain text field (no password toggle) ───────────────────────────────────
function FormField({ label, value, onChange, keyboardType, autoCapitalize,
  placeholder, textPri, textSub, inputBg, inputBdr }) {
  return (
    <>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6,
        color: textSub, marginBottom: 6, marginTop: 14 }}>
        {label}
      </Text>
      <TextInput
        style={{ borderRadius: 12, borderWidth: 1.5, borderColor: inputBdr,
          paddingHorizontal: 14, paddingVertical: 13,
          fontSize: 14, backgroundColor: inputBg, color: textPri }}
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

// ─── Password field with eye button ──────────────────────────────────────────
function PasswordField({ label, value, onChange, placeholder, textPri, textSub, inputBg, inputBdr }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6,
        color: textSub, marginBottom: 6, marginTop: 14 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, borderWidth: 1.5, borderColor: inputBdr,
        backgroundColor: inputBg, paddingHorizontal: 14, marginBottom: 4 }}>
        <TextInput
          style={{ flex: 1, fontSize: 14, paddingVertical: 13, color: textPri }}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || 'Min. 6 characters'}
          placeholderTextColor="#aab0be"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <TouchableOpacity onPress={() => setShow(v => !v)} style={{ padding: 6 }}>
          {show
            ? <EyeOff size={18} color={textSub} />
            : <Eye    size={18} color={textSub} />}
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── Add Teacher Modal ────────────────────────────────────────────────────────
function AddTeacherModal({ visible, onClose, isDarkMode, token, onAdded }) {
  const [fullname, setFullname] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const bg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  const reset = () => { setFullname(''); setEmail(''); setPassword(''); setPhone(''); };

  const handleAdd = async () => {
    if (!fullname.trim()) { Alert.alert('Validation', 'Full name is required.'); return; }
    if (!email.trim())    { Alert.alert('Validation', 'Email is required.'); return; }
    if (!password)        { Alert.alert('Validation', 'Password is required.'); return; }
    if (password.length < 6) { Alert.alert('Validation', 'Password must be at least 6 characters.'); return; }

    setSaving(true);
    try {
      const res = await fetch(API.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullname: fullname.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: 'teacher',
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create teacher');
      Alert.alert('Success', `${fullname.trim()} has been added as a teacher.`);
      onAdded();
      reset();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const fp = { textPri, textSub, inputBg, inputBdr };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: overlay }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 36, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPri }}>Add Teacher</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16,
              backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8',
              justifyContent: 'center', alignItems: 'center' }}>
              <X size={20} color={textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}>
            <FormField label="FULL NAME" value={fullname} onChange={setFullname}
              placeholder="e.g. Rajesh Sharma" {...fp} />
            <FormField label="EMAIL" value={email} onChange={setEmail}
              placeholder="e.g. rajesh@school.edu"
              keyboardType="email-address" autoCapitalize="none" {...fp} />
            <PasswordField label="PASSWORD" value={password} onChange={setPassword}
              placeholder="Min. 6 characters" {...fp} />
            <FormField label="PHONE (optional)" value={phone} onChange={setPhone}
              placeholder="+977 98XXXXXXXX"
              keyboardType="phone-pad" autoCapitalize="none" {...fp} />
            <TouchableOpacity
              style={{ backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
                alignItems: 'center', marginTop: 22, opacity: saving ? 0.7 : 1 }}
              onPress={handleAdd} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={{ fontSize: 15, color: '#ffffff', fontWeight: '700' }}>Add Teacher</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Teacher Modal ───────────────────────────────────────────────────────
function EditTeacherModal({ visible, onClose, teacher, isDarkMode, token, onSaved }) {
  const [fullname,  setFullname]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [saving,    setSaving]    = useState(false);

  const bg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  useEffect(() => {
    if (visible && teacher) {
      setFullname(teacher.fullname || '');
      setEmail(teacher.email || '');
      setPhone(teacher.phone || '');
      setPassword('');
    }
  }, [visible, teacher]);

  const handleSave = async () => {
    if (!fullname.trim()) { Alert.alert('Validation', 'Full name cannot be empty.'); return; }
    if (!email.trim())    { Alert.alert('Validation', 'Email cannot be empty.'); return; }
    if (password && password.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters.'); return;
    }
    setSaving(true);
    try {
      const body = {
        fullname: fullname.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
      };
      if (password) body.password = password;

      const res = await fetch(`${API.adminUserUpdate}/${teacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update teacher');
      Alert.alert('Success', 'Teacher updated successfully.');
      onSaved(data);
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const fp = { textPri, textSub, inputBg, inputBdr };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: overlay }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 36, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPri }}>Edit Teacher</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16,
              backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8',
              justifyContent: 'center', alignItems: 'center' }}>
              <X size={20} color={textSub} />
            </TouchableOpacity>
          </View>
          {teacher && (
            <Text style={{ fontSize: 12, color: textSub, marginBottom: 8 }}>{teacher.email}</Text>
          )}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}>
            <FormField label="FULL NAME" value={fullname} onChange={setFullname}
              placeholder="e.g. Rajesh Sharma" {...fp} />
            <FormField label="EMAIL" value={email} onChange={setEmail}
              placeholder="e.g. rajesh@school.edu"
              keyboardType="email-address" autoCapitalize="none" {...fp} />
            <FormField label="PHONE (optional)" value={phone} onChange={setPhone}
              placeholder="+977 98XXXXXXXX"
              keyboardType="phone-pad" autoCapitalize="none" {...fp} />
            <PasswordField label="NEW PASSWORD (leave blank to keep current)"
              value={password} onChange={setPassword}
              placeholder="Min. 6 characters" {...fp} />
            <TouchableOpacity
              style={{ backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
                alignItems: 'center', marginTop: 22, opacity: saving ? 0.7 : 1 }}
              onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={{ fontSize: 15, color: '#ffffff', fontWeight: '700' }}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Teacher Card ─────────────────────────────────────────────────────────────
function TeacherCard({ teacher, onEdit, onToggleActive, isDarkMode }) {
  const isActive  = teacher.is_active !== false;
  // Inactive cards are visually muted
  const cardBg    = isDarkMode
    ? (isActive ? '#1a1f2e' : '#161b28')
    : (isActive ? '#ffffff' : '#f5f5f7');
  const textPri   = isDarkMode
    ? (isActive ? '#ffffff' : '#6b7280')
    : (isActive ? '#1a1f36' : '#9ca3af');
  const textSub   = isDarkMode ? '#8a94b8' : '#6b7280';
  const iconBg    = isDarkMode ? '#1e2540' : '#eef2ff';
  const initials  = (teacher.fullname || '??')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: cardBg },
      !isActive && styles.cardInactive]}>
      <View style={styles.cardTop}>
        {/* Avatar */}
        <View style={[styles.avatar, {
          backgroundColor: isActive
            ? (isDarkMode ? '#252b3e' : '#eef2ff')
            : (isDarkMode ? '#1e2028' : '#e9eaec'),
        }]}>
          <Text style={[styles.avatarText, { color: isActive ? BLUE : '#9ca3af' }]}>
            {initials}
          </Text>
        </View>
        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={[styles.teacherName, { color: textPri }]} numberOfLines={1}>
              {teacher.fullname}
            </Text>
            {/* Active / Inactive badge */}
            <View style={[styles.statusBadge,
              isActive ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusText,
                { color: isActive ? GREEN : '#9ca3af' }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          {teacher.email ? (
            <View style={styles.metaRow}>
              <Mail size={11} color={textSub} />
              <Text style={[styles.metaText, { color: textSub }]} numberOfLines={1}>
                {teacher.email}
              </Text>
            </View>
          ) : null}
          {teacher.phone ? (
            <View style={styles.metaRow}>
              <Phone size={11} color={textSub} />
              <Text style={[styles.metaText, { color: textSub }]}>{teacher.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {/* Actions — only show edit for active teachers; always show toggle */}
      <View style={styles.cardActions}>
        {isActive && (
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: iconBg }]}
            onPress={() => onEdit(teacher)}
            activeOpacity={0.75}>
            <Edit2 size={13} color={BLUE} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.toggleBtn, {
            backgroundColor: isActive
              ? (isDarkMode ? '#2e1a1a' : '#fff0f0')
              : (isDarkMode ? '#1a2e1e' : '#edfaf3'),
            flex: isActive ? 1 : undefined, minWidth: isActive ? undefined : 120,
          }]}
          onPress={() => onToggleActive(teacher)}
          activeOpacity={0.75}>
          {isActive
            ? <><UserX size={13} color={RED} /><Text style={[styles.toggleBtnText, { color: RED }]}>Deactivate</Text></>
            : <><UserCheck size={13} color={GREEN} /><Text style={[styles.toggleBtnText, { color: GREEN }]}>Reactivate</Text></>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManageTeachersScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();

  const [teachers,       setTeachers]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [showInactive,   setShowInactive]   = useState(false);
  const [addVisible,     setAddVisible]     = useState(false);
  const [editTeacher,    setEditTeacher]    = useState(null);
  const [editVisible,    setEditVisible]    = useState(false);

  const bg          = isDarkMode ? '#111827' : '#f5f7fa';
  const headerBg    = isDarkMode ? '#1a1f2e' : '#ffffff';
  const borderColor = isDarkMode ? '#2a2f42' : '#eef1f5';
  const textPrimary = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub     = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg     = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr    = isDarkMode ? '#2a2f42' : '#e6e9f0';
  const chipActive  = isDarkMode ? '#252b3e' : '#eef2ff';

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API.adminTeachersList, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTeachers(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to load teachers');
      }
    } catch {
      Alert.alert('Error', 'Network error while loading teachers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const onRefresh = () => { setRefreshing(true); fetchTeachers(); };

  // ── Derived filtered list ──────────────────────────────────────────
  const filtered = teachers.filter(t => {
    if (!showInactive && t.is_active === false) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (t.fullname || '').toLowerCase().includes(q) ||
           (t.email    || '').toLowerCase().includes(q) ||
           (t.phone    || '').toLowerCase().includes(q);
  });

  const activeCount   = teachers.filter(t => t.is_active !== false).length;
  const inactiveCount = teachers.filter(t => t.is_active === false).length;

  // ── Deactivate / Reactivate ────────────────────────────────────────
  const handleToggleActive = (teacher) => {
    const isActive = teacher.is_active !== false;
    if (isActive) {
      Alert.alert(
        'Deactivate Teacher',
        `Deactivate "${teacher.fullname}"?\n\nThey will no longer be able to log in, but all their classes, sessions, and attendance history will be preserved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                const res = await fetch(`${API.adminUserDeactivate}/${teacher.id}/deactivate`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to deactivate');
                setTeachers(prev => prev.map(t =>
                  t.id === teacher.id ? { ...t, is_active: false } : t
                ));
                Alert.alert('Deactivated', `${teacher.fullname} can no longer log in.`);
              } catch (e) {
                Alert.alert('Error', e.message);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Reactivate Teacher',
        `Reactivate "${teacher.fullname}"? They will be able to log in again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reactivate',
            onPress: async () => {
              try {
                const res = await fetch(`${API.adminUserReactivate}/${teacher.id}/reactivate`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to reactivate');
                setTeachers(prev => prev.map(t =>
                  t.id === teacher.id ? { ...t, is_active: true } : t
                ));
                Alert.alert('Reactivated', `${teacher.fullname} can now log in again.`);
              } catch (e) {
                Alert.alert('Error', e.message);
              }
            },
          },
        ]
      );
    }
  };

  const handleEdit = (teacher) => { setEditTeacher(teacher); setEditVisible(true); };

  const handleSaved = (updatedData) => {
    setTeachers(prev => prev.map(t =>
      t.id === editTeacher.id ? { ...t, ...updatedData } : t
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Manage Teachers</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddVisible(true)}
          activeOpacity={0.85}>
          <UserPlus size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: inputBdr }]}>
          <Search size={16} color={textSub} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search by name, email, phone…"
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

        {/* Show inactive toggle chip */}
        <TouchableOpacity
          style={[styles.chip, { backgroundColor: showInactive ? AMBER + '22' : chipActive }]}
          onPress={() => setShowInactive(v => !v)}
          activeOpacity={0.75}>
          <UserX size={12} color={showInactive ? AMBER : textSub} style={{ marginRight: 4 }} />
          <Text style={[styles.chipText, { color: showInactive ? AMBER : textSub }]}>
            {showInactive ? `Showing inactive (${inactiveCount})` : `Show inactive (${inactiveCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          tintColor={BLUE} colors={[BLUE]} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Summary count */}
            <Text style={[styles.countText, { color: textSub }]}>
              {filtered.length} teacher{filtered.length !== 1 ? 's' : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ` · ${activeCount} active`}
              {inactiveCount > 0 && !searchQuery ? `, ${inactiveCount} inactive` : ''}
            </Text>

            {/* Teacher cards */}
            {filtered.map(teacher => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                isDarkMode={isDarkMode}
              />
            ))}

            {/* Empty state */}
            {filtered.length === 0 && (
              <View style={styles.emptyBox}>
                <GraduationCap size={40} color="#aab0be" style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                  {searchQuery ? 'No teachers found' : 'No Teachers Yet'}
                </Text>
                <Text style={[styles.emptySub, { color: textSub }]}>
                  {searchQuery
                    ? 'Try a different name or email'
                    : 'Tap the + button to add the first teacher'}
                </Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Home" />

      <AddTeacherModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        isDarkMode={isDarkMode}
        token={token}
        onAdded={fetchTeachers}
      />
      <EditTeacherModal
        visible={editVisible}
        onClose={() => { setEditVisible(false); setEditTeacher(null); }}
        teacher={editTeacher}
        isDarkMode={isDarkMode}
        token={token}
        onSaved={handleSaved}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center',
  },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },

  chip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  scroll:    { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  countText: { fontSize: 12, fontWeight: '600', marginBottom: 12 },

  card: {
    borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardInactive: { opacity: 0.75 },
  cardTop:  { flexDirection: 'row', marginBottom: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText:  { fontSize: 15, fontWeight: '800' },
  cardInfo:    { flex: 1 },
  teacherName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaText:    { fontSize: 12, flex: 1 },

  statusBadge: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  statusActive:   { backgroundColor: '#edfaf3' },
  statusInactive: { backgroundColor: '#f0f2f5' },
  statusText:     { fontSize: 10, fontWeight: '700' },

  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 9,
  },
  editBtnText: { fontSize: 13, color: BLUE, fontWeight: '700' },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12,
  },
  toggleBtnText: { fontSize: 13, fontWeight: '700' },

  emptyBox:  { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:{ fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub:  { fontSize: 14, textAlign: 'center' },
});
