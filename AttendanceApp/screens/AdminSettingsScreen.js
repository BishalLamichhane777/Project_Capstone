import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  Alert, Switch, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../components/AdminBottomNav';
import { useAuth } from '../context/AuthContext';
import {
  User, Lock, Shield, Bell, Mail, AlertTriangle, Calendar,
  Upload, Trash2, RefreshCw, ChevronLeft, LogOut, ChevronRight,
  Moon, Sun, X, Eye, EyeOff, BookOpen, GraduationCap,
} from 'lucide-react-native';
import { API } from '../api';

const BLUE = '#2952e3';
const GOLD = '#b07d00';

// ─── Academic Calendar Page ───────────────────────────────────────────────────
const ACADEMIC_EVENTS = [
  { date: '2026-07-01', label: 'Semester II Begins',        type: 'start'   },
  { date: '2026-07-15', label: 'Course Registration Ends',  type: 'admin'   },
  { date: '2026-08-20', label: 'Mid-Term Examinations',     type: 'exam'    },
  { date: '2026-09-05', label: 'Last Day to Withdraw',      type: 'admin'   },
  { date: '2026-10-10', label: 'Dashain Break Starts',      type: 'holiday' },
  { date: '2026-10-20', label: 'Classes Resume',            type: 'start'   },
  { date: '2026-11-15', label: 'Final Exam Period Begins',  type: 'exam'    },
  { date: '2026-11-30', label: 'Semester II Ends',          type: 'end'     },
  { date: '2026-12-10', label: 'Results Published',         type: 'admin'   },
  { date: '2027-01-10', label: 'Semester III Begins',       type: 'start'   },
];

const EVENT_COLORS = {
  start:   { bg: '#edfaf3', text: '#27ae60', dot: '#27ae60' },
  end:     { bg: '#fff0f0', text: '#e74c3c', dot: '#e74c3c' },
  exam:    { bg: '#fff8e6', text: '#f39c12', dot: '#f39c12' },
  holiday: { bg: '#f3eeff', text: '#7c3aed', dot: '#7c3aed' },
  admin:   { bg: '#eef2ff', text: BLUE,      dot: BLUE      },
};

function AcademicCalendarPage({ onBack, isDarkMode }) {
  const bg      = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const hdrBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const hdrBdr  = isDarkMode ? '#2a2f42' : '#eef1f5';
  const rowBdr  = isDarkMode ? '#252b3e' : '#f0f2f5';

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = ACADEMIC_EVENTS.filter(e => e.date >= today);
  const past     = ACADEMIC_EVENTS.filter(e => e.date < today);

  const formatDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[m-1]} ${d}, ${y}`;
  };

  const EventRow = ({ event, isLast }) => {
    const cfg = EVENT_COLORS[event.type] || EVENT_COLORS.admin;
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
        !isLast && { borderBottomWidth: 1, borderBottomColor: rowBdr }]}>
        <View style={[{ width: 10, height: 10, borderRadius: 5, marginRight: 14 }, { backgroundColor: cfg.dot }]} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: textPri, marginBottom: 2 }}>{event.label}</Text>
          <Text style={{ fontSize: 12, color: textSub }}>{formatDate(event.date)}</Text>
        </View>
        <View style={[{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.text }}>
            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={hdrBg} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 18, paddingVertical: 14, backgroundColor: hdrBg, borderBottomWidth: 1, borderBottomColor: hdrBdr }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, justifyContent: 'center', alignItems: 'center' }}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: textPri }}>Academic Calendar</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        {upcoming.length > 0 && (
          <View style={[{ borderRadius: 16, padding: 16, marginBottom: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
            { backgroundColor: cardBg }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: BLUE, letterSpacing: 0.5,
              textTransform: 'uppercase', marginBottom: 12 }}>Upcoming Events</Text>
            {upcoming.map((e, i) => <EventRow key={e.date} event={e} isLast={i === upcoming.length - 1} />)}
          </View>
        )}
        {past.length > 0 && (
          <View style={[{ borderRadius: 16, padding: 16, marginBottom: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
            { backgroundColor: cardBg }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: textSub, letterSpacing: 0.5,
              textTransform: 'uppercase', marginBottom: 12 }}>Past Events</Text>
            {past.map((e, i) => <EventRow key={e.date} event={e} isLast={i === past.length - 1} />)}
          </View>
        )}
        {/* Legend */}
        <View style={[{ borderRadius: 14, padding: 14, marginBottom: 16 }, { backgroundColor: cardBg }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: textSub, marginBottom: 10 }}>LEGEND</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(EVENT_COLORS).map(([type, cfg]) => (
              <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.dot }} />
                <Text style={{ fontSize: 11, color: textSub, textTransform: 'capitalize' }}>{type}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose, isDarkMode, token, currentData, onSaved }) {
  const [fullname, setFullname] = useState(currentData?.fullname || '');
  const [phone,    setPhone]    = useState(currentData?.phone || '');
  const [saving,   setSaving]   = useState(false);

  const bg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  React.useEffect(() => {
    if (visible) { setFullname(currentData?.fullname || ''); setPhone(currentData?.phone || ''); }
  }, [visible, currentData]);

  const handleSave = async () => {
    if (!fullname.trim()) { Alert.alert('Validation', 'Full name cannot be empty.'); return; }
    setSaving(true);
    try {
      const res = await fetch(API.updateMe, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullname: fullname.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      Alert.alert('Success', 'Profile updated!');
      onSaved?.({ fullname: fullname.trim(), phone: phone.trim() || null });
      onClose();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: overlay }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: textPri }}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16,
            backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8', justifyContent: 'center', alignItems: 'center' }}>
            <X size={20} color={textSub} />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: textSub, marginBottom: 6 }}>EMAIL (cannot be changed)</Text>
        <View style={{ borderRadius: 12, borderWidth: 1.5, borderColor: inputBdr, paddingHorizontal: 14,
          paddingVertical: 13, marginBottom: 14, backgroundColor: isDarkMode ? '#1a1f2e' : '#f0f2f8', opacity: 0.6 }}>
          <Text style={{ fontSize: 14, color: textSub }}>{currentData?.email || '—'}</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: textSub, marginBottom: 6 }}>FULL NAME</Text>
        <TextInput style={{ borderRadius: 12, borderWidth: 1.5, borderColor: inputBdr, paddingHorizontal: 14,
          paddingVertical: 13, fontSize: 14, marginBottom: 14, backgroundColor: inputBg, color: textPri }}
          value={fullname} onChangeText={setFullname}
          placeholder="Full name" placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'} />
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: textSub, marginBottom: 6 }}>PHONE (optional)</Text>
        <TextInput style={{ borderRadius: 12, borderWidth: 1.5, borderColor: inputBdr, paddingHorizontal: 14,
          paddingVertical: 13, fontSize: 14, marginBottom: 20, backgroundColor: inputBg, color: textPri }}
          value={phone} onChangeText={setPhone}
          placeholder="+977 XXXXXXXXXX" placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
          keyboardType="phone-pad" />
        <TouchableOpacity style={{ backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
          alignItems: 'center', opacity: saving ? 0.7 : 1 }}
          onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={{ fontSize: 15, color: '#ffffff', fontWeight: '700' }}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose, isDarkMode, token }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  const bg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  React.useEffect(() => {
    if (visible) { setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
  }, [visible]);

  const handleSave = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Validation', 'Please fill in all fields.'); return; }
    if (newPw.length < 6) { Alert.alert('Validation', 'New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Validation', 'Passwords do not match.'); return; }
    if (newPw === currentPw) { Alert.alert('Validation', 'New password must differ from current.'); return; }
    setSaving(true);
    try {
      const meRes = await fetch(API.currentUser, { headers: { Authorization: `Bearer ${token}` } });
      if (!meRes.ok) throw new Error('Could not verify user.');
      const me = await meRes.json();
      const loginRes = await fetch(API.login, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: me.email, password: currentPw }),
      });
      if (!loginRes.ok) { Alert.alert('Error', 'Current password is incorrect.'); return; }
      const patchRes = await fetch(API.updateMe, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPw }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json();
        throw new Error(err.error || 'Failed to update password');
      }
      Alert.alert('Success', 'Password updated successfully!');
      onClose();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const PwField = ({ label, value, onChange, show, toggle }) => (
    <>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: textSub, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5,
        borderColor: inputBdr, paddingHorizontal: 14, marginBottom: 14, backgroundColor: inputBg }}>
        <TextInput style={{ flex: 1, fontSize: 14, paddingVertical: 13, color: textPri }}
          value={value} onChangeText={onChange} secureTextEntry={!show}
          placeholder="••••••••" placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'} />
        <TouchableOpacity onPress={toggle} style={{ padding: 6 }}>
          {show ? <EyeOff size={18} color={textSub} /> : <Eye size={18} color={textSub} />}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: overlay }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: textPri }}>Change Password</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16,
            backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8', justifyContent: 'center', alignItems: 'center' }}>
            <X size={20} color={textSub} />
          </TouchableOpacity>
        </View>
        <PwField label="CURRENT PASSWORD" value={currentPw} onChange={setCurrentPw} show={showCur} toggle={() => setShowCur(v => !v)} />
        <PwField label="NEW PASSWORD"     value={newPw}     onChange={setNewPw}     show={showNew} toggle={() => setShowNew(v => !v)} />
        <PwField label="RETYPE NEW PASSWORD" value={confirmPw} onChange={setConfirmPw} show={showConf} toggle={() => setShowConf(v => !v)} />
        <Text style={{ fontSize: 12, color: textSub, marginBottom: 18, marginTop: -6 }}>Minimum 6 characters</Text>
        <TouchableOpacity style={{ backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
          alignItems: 'center', opacity: saving ? 0.7 : 1 }}
          onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={{ fontSize: 15, color: '#ffffff', fontWeight: '700' }}>Update Password</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminSettingsScreen({ navigation }) {
  const { isDarkMode, toggleDarkMode, token, user } = useAuth();
  const [toggles, setToggles] = useState({ push: true, email: true, risk: false });
  const [subPage,  setSubPage]  = useState(null); // 'calendar'
  const [editProfileVisible,    setEditProfileVisible]    = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const bg          = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg      = isDarkMode ? '#1a1f2e' : '#ffffff';
  const headerBg    = isDarkMode ? '#1a1f2e' : '#ffffff';
  const borderColor = isDarkMode ? '#2a2f42' : '#eef1f5';
  const textPrimary = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub     = isDarkMode ? '#8a94b8' : '#8a94a6';
  const iconBg      = isDarkMode ? '#252b3e' : '#f0f2f8';
  const rowBorder   = isDarkMode ? '#252b3e' : '#f0f2f5';

  // Sub-page: calendar
  if (subPage === 'calendar') {
    return <AcademicCalendarPage onBack={() => setSubPage(null)} isDarkMode={isDarkMode} />;
  }

  const handleDanger = (item) => {
    Alert.alert(item.label, `Are you sure you want to ${item.label.toLowerCase()}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: item.label, style: 'destructive', onPress: () => Alert.alert('Done', `${item.label} completed.`) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('Login') },
    ]);
  };

  const SettingRow = ({ icon: Icon, label, sub, type, toggleKey, onPress, isDanger, isLast }) => (
    <TouchableOpacity
      style={[styles.settingRow, !isLast && { borderBottomWidth: 1, borderBottomColor: rowBorder }]}
      onPress={type === 'toggle' ? undefined : onPress}
      activeOpacity={type === 'toggle' ? 1 : 0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: isDanger ? (isDarkMode ? '#2e1a1a' : '#fff0f0') : iconBg }]}>
        <Icon size={18} color={isDanger ? '#e74c3c' : (isDarkMode ? '#8a94b8' : '#1a1f36')} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: isDanger ? '#e74c3c' : textPrimary }]}>{label}</Text>
        {sub ? <Text style={[styles.settingSub, { color: textSub }]}>{sub}</Text> : null}
      </View>
      {type === 'toggle' ? (
        <Switch
          value={toggles[toggleKey]}
          onValueChange={() => toggle(toggleKey)}
          trackColor={{ false: isDarkMode ? '#2a2f42' : '#e0e4f0', true: '#c7d0f8' }}
          thumbColor={toggles[toggleKey] ? BLUE : '#aab0be'}
        />
      ) : (
        <ChevronRight size={20} color={isDanger ? '#e74c3c' : (isDarkMode ? '#3a4060' : '#c0c8d8')} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={headerBg} />

      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Admin Info Card */}
        <View style={[styles.adminCard, { backgroundColor: cardBg }]}>
          <View style={styles.adminAvatar}>
            <Text style={styles.adminAvatarText}>AD</Text>
          </View>
          <View style={styles.adminInfo}>
            <Text style={[styles.adminName, { color: textPrimary }]}>{user?.fullname || 'Admin User'}</Text>
            <Text style={[styles.adminEmail, { color: textSub }]}>{user?.email || 'admin@attendance.edu'}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Shield size={11} color={GOLD} style={{ marginRight: 4 }} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>APPEARANCE</Text>
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <View style={[styles.settingRow]}>
              <View style={[styles.settingIcon, { backgroundColor: isDarkMode ? '#1e2540' : '#f0f2f8' }]}>
                {isDarkMode ? <Moon size={18} color="#7c8ccc" /> : <Sun size={18} color={GOLD} />}
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: textPrimary }]}>Dark Mode</Text>
                <Text style={[styles.settingSub, { color: textSub }]}>{isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}</Text>
              </View>
              <Switch value={isDarkMode} onValueChange={toggleDarkMode}
                trackColor={{ false: '#e0e4f0', true: '#3a4a8a' }}
                thumbColor={isDarkMode ? '#7c8ccc' : '#aab0be'} />
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>ACCOUNT</Text>
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <SettingRow icon={User}  label="Edit Profile"    sub="Update name and phone"          onPress={() => setEditProfileVisible(true)}    isDarkMode={isDarkMode} />
            <SettingRow icon={Lock}  label="Change Password" sub="Update your login credentials"  onPress={() => setChangePasswordVisible(true)} isDarkMode={isDarkMode} isLast />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>NOTIFICATIONS</Text>
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <SettingRow icon={Bell}          label="Push Notifications" sub="Alerts on your device"               type="toggle" toggleKey="push"  isDarkMode={isDarkMode} />
            <SettingRow icon={Mail}          label="Email Alerts"       sub="Receive reports via email"           type="toggle" toggleKey="email" isDarkMode={isDarkMode} />
            <SettingRow icon={AlertTriangle} label="At-Risk Alerts"     sub="Notify when student drops below 60%" type="toggle" toggleKey="risk"  isDarkMode={isDarkMode} isLast />
          </View>
        </View>

        {/* System */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>SYSTEM</Text>
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <SettingRow icon={Calendar} label="Academic Calendar" sub="View semester events & dates"
              onPress={() => setSubPage('calendar')} isDarkMode={isDarkMode} isLast />
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>DATA</Text>
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <SettingRow icon={Upload}   label="Export Data"   sub="Download reports and records" onPress={() => navigation.navigate('ExportReports')} isDarkMode={isDarkMode} />
            <SettingRow icon={Trash2}   label="Clear Cache"   sub="Free up storage space"        onPress={() => handleDanger({ label: 'Clear Cache' })}   isDanger isDarkMode={isDarkMode} />
            <SettingRow icon={RefreshCw} label="Reset System" sub="Restore default settings"     onPress={() => handleDanger({ label: 'Reset System' })}  isDanger isDarkMode={isDarkMode} isLast />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0', borderColor: isDarkMode ? '#4a2020' : '#ffd0d0' }]}
          onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNav navigation={navigation} active="Settings" />

      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        isDarkMode={isDarkMode}
        token={token}
        currentData={{ fullname: user?.fullname || '', email: user?.email || '', phone: user?.phone || '' }}
        onSaved={() => {}}
      />
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        isDarkMode={isDarkMode}
        token={token}
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
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  adminCard: {
    borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center',
    marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  adminAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff8e6', borderWidth: 2, borderColor: GOLD,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  adminAvatarText: { fontSize: 16, fontWeight: '800', color: GOLD },
  adminInfo: { flex: 1 },
  adminName:  { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  adminEmail: { fontSize: 12 },
  adminBadge: {
    backgroundColor: '#fff8e6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#f0d080', flexDirection: 'row', alignItems: 'center',
  },
  adminBadgeText: { fontSize: 11, color: GOLD, fontWeight: '700' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },

  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingSub:   { fontSize: 11 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15, marginBottom: 14, borderWidth: 1.5,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#e74c3c' },
});
