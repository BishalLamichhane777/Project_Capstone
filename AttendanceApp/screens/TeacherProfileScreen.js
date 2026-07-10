import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Switch, Modal, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeacherBottomNav from '../components/TeacherBottomNav';
import { useAuth } from '../context/AuthContext';
import {
  Edit2, Key, Moon, Sun, Bell, Camera, Save,
  HelpCircle, FileText, Clipboard, ChevronRight, ChevronLeft,
  LogOut, Phone, Building, Calendar, X, Eye, EyeOff, Mail,
} from 'lucide-react-native';
import { API } from '../api';

const BLUE = '#2952e3';

const TEACHER = {
  name: 'Dr Ramesh Sharma',
  initials: 'RS',
  role: 'Lecturer',
  department: 'Computer Science',
  employeeId: 'EMP-2024-041',
  email: 'ramesh@mytimes.com',
  phone: '+977-01-4362154',
  joinDate: 'August 2021',
  classes: 3,
};

// ─── Help & FAQ Page ──────────────────────────────────────────────────────────
function HelpFAQPage({ onBack, isDarkMode }) {
  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';

  const faqs = [
    { q: 'How do I start a class session?', a: 'Go to Classes, select your class, then tap "Start Class". The camera will open to detect student faces automatically.' },
    { q: 'How does face attendance work?', a: 'The app uses AI face recognition to identify enrolled students. Point the camera at students and the system marks them present automatically.' },
    { q: 'How do I view attendance reports?', a: 'Tap the Reports tab in the bottom navigation. You can view per-class summaries, at-risk students, and export reports.' },
    { q: 'How do I review waiver requests?', a: 'Waiver requests submitted by students appear in your notifications. Admins manage final approval.' },
    { q: 'How do I send alerts to students?', a: 'Alerts are managed by the admin. Contact your administrator to send bulk notifications.' },
    { q: 'What if the camera cannot detect a face?', a: 'Ensure adequate lighting. The student can manually be marked present by the admin after class.' },
    { q: 'How do I end a class session?', a: 'On the Start Class screen, tap "End Session". Attendance is saved automatically.' },
    { q: 'How do I update my password?', a: 'Go to Profile → Change Password, enter your current password and choose a new one.' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <View style={[styles.subHeader, { backgroundColor: cardBg, borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <Text style={[styles.subHeaderTitle, { color: textPri }]}>Help & FAQ</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.helpIntro, { color: textSub }]}>
          Everything you need to know about using the Attendance App as a teacher.
        </Text>
        {faqs.map((item, i) => (
          <View key={i} style={[styles.faqCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.faqQ, { color: textPri }]}>{item.q}</Text>
            <Text style={[styles.faqA, { color: textSub }]}>{item.a}</Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Privacy Policy Page ──────────────────────────────────────────────────────
function PrivacyPolicyPage({ onBack, isDarkMode }) {
  const bg      = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#6b7280';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <View style={[styles.subHeader, { backgroundColor: cardBg, borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <Text style={[styles.subHeaderTitle, { color: textPri }]}>Privacy Policy</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.policyCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.policyTitle, { color: textPri }]}>Data Collection</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            We collect facial biometric data solely for automated attendance marking. This data is stored securely on-premises and is never shared with third parties.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>How We Use Your Data</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            Your data is used exclusively to operate the attendance system — marking students present, generating reports, and sending attendance alerts. No data is used for marketing or profiling.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>Data Retention</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            Attendance records are retained for the duration of the academic year and archived for up to 3 years in accordance with institutional policy.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>Your Rights</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            You have the right to request access to your data, correction of inaccuracies, and deletion upon leaving the institution. Contact the administrator to exercise these rights.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>Contact</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            For privacy concerns, contact us at info@iimscollege.edu.np or call +977-01-4362154.
          </Text>
          <Text style={[styles.policyMeta, { color: isDarkMode ? '#5a6080' : '#aab0be' }]}>Last updated: January 2025</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Terms of Service Page ────────────────────────────────────────────────────
function TermsPage({ onBack, isDarkMode }) {
  const bg      = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg  = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#6b7280';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <View style={[styles.subHeader, { backgroundColor: cardBg, borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={22} color={textPri} />
        </TouchableOpacity>
        <Text style={[styles.subHeaderTitle, { color: textPri }]}>Terms of Service</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.policyCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.policyTitle, { color: textPri }]}>Acceptance of Terms</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            By using the Attendance App, you agree to these terms. The app is provided exclusively for authorised staff and students of the institution.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>Authorised Use</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            The app must only be used for legitimate academic attendance purposes. Any misuse, including falsifying attendance records, is strictly prohibited and may result in disciplinary action.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>Account Security</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            You are responsible for keeping your login credentials confidential. Do not share your account with others. Report suspicious activity to the administrator immediately.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>Limitation of Liability</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            The institution is not liable for technical failures, data loss, or attendance disputes arising from system errors. Manual override processes exist for dispute resolution.
          </Text>
          <Text style={[styles.policyTitle, { color: textPri }]}>Changes to Terms</Text>
          <Text style={[styles.policyText, { color: textSub }]}>
            These terms may be updated periodically. Continued use of the app constitutes acceptance of the revised terms.
          </Text>
          <Text style={[styles.policyMeta, { color: isDarkMode ? '#5a6080' : '#aab0be' }]}>Last updated: January 2025</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Standalone password field — defined OUTSIDE modals so it never
//     unmounts on state change (which kills keyboard focus).
function TeacherPwField({ label, value, onChange, show, toggle, textPri, textSub, inputBg, inputBdr, errorMsg }) {
  return (
    <>
      <Text style={[mStyles.fieldLabel, { color: textSub }]}>{label}</Text>
      <View style={[mStyles.pwRow, { backgroundColor: inputBg, borderColor: errorMsg ? '#e74c3c' : inputBdr }]}>
        <TextInput
          style={[mStyles.pwInput, { color: textPri }]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder="••••••••"
          placeholderTextColor="#aab0be"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="next"
        />
        <TouchableOpacity onPress={toggle} style={mStyles.eyeBtn}>
          {show ? <EyeOff size={18} color={textSub} /> : <Eye size={18} color={textSub} />}
        </TouchableOpacity>
      </View>
      {!!errorMsg && <Text style={mStyles.inlineError}>{errorMsg}</Text>}
    </>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose, isDarkMode, token }) {
  const [fullname, setFullname] = useState(TEACHER.name);
  const [phone, setPhone]       = useState(TEACHER.phone);
  const [saving, setSaving]     = useState(false);

  const bg       = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay  = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

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
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: overlay }} activeOpacity={1} onPress={onClose} />
        <View style={[mStyles.sheet, { backgroundColor: bg }]}>
          <View style={mStyles.sheetHeader}>
            <Text style={[mStyles.sheetTitle, { color: textPri }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={[mStyles.closeBtn, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              <X size={20} color={textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>EMAIL (cannot be changed)</Text>
            <View style={[mStyles.fieldStatic, { backgroundColor: isDarkMode ? '#1a1f2e' : '#f0f2f8', borderColor: inputBdr }]}>
              <Text style={[mStyles.fieldStaticText, { color: textSub }]}>{TEACHER.email}</Text>
            </View>
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>FULL NAME</Text>
            <TextInput
              style={[mStyles.fieldInput, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]}
              value={fullname} onChangeText={setFullname}
              placeholder="Full name" placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
              returnKeyType="next"
            />
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>PHONE (optional)</Text>
            <TextInput
              style={[mStyles.fieldInput, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]}
              value={phone} onChangeText={setPhone}
              placeholder="+977 XXXXXXXXXX" placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
              keyboardType="phone-pad" returnKeyType="done"
            />
            <TouchableOpacity style={[mStyles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={mStyles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  const [newPwErr,  setNewPwErr]  = useState('');
  const [confPwErr, setConfPwErr] = useState('');

  const bg       = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay  = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  const handleNewChange = (val) => {
    setNewPw(val);
    setNewPwErr(val.length > 0 && val.length < 6 ? 'Minimum 6 characters.' : '');
    if (confirmPw.length > 0) setConfPwErr(val !== confirmPw ? 'Passwords do not match.' : '');
  };
  const handleConfChange = (val) => {
    setConfirmPw(val);
    setConfPwErr(val.length > 0 && val !== newPw ? 'Passwords do not match.' : '');
  };

  const handleSave = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Validation', 'Please fill in all fields.'); return; }
    if (newPw.length < 6) { setNewPwErr('Minimum 6 characters.'); return; }
    if (newPw !== confirmPw) { setConfPwErr('Passwords do not match.'); return; }
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
      if (!patchRes.ok) { const err = await patchRes.json(); throw new Error(err.error || 'Failed to update password'); }
      Alert.alert('Success', 'Password updated successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setNewPwErr(''); setConfPwErr('');
      onClose();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: overlay }} activeOpacity={1} onPress={onClose} />
        <View style={[mStyles.sheet, { backgroundColor: bg }]}>
          <View style={mStyles.sheetHeader}>
            <Text style={[mStyles.sheetTitle, { color: textPri }]}>Change Password</Text>
            <TouchableOpacity onPress={onClose} style={[mStyles.closeBtn, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              <X size={20} color={textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
            <TeacherPwField label="CURRENT PASSWORD" value={currentPw} onChange={setCurrentPw}
              show={showCur} toggle={() => setShowCur(v => !v)} errorMsg=""
              textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr} />
            <TeacherPwField label="NEW PASSWORD" value={newPw} onChange={handleNewChange}
              show={showNew} toggle={() => setShowNew(v => !v)} errorMsg={newPwErr}
              textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr} />
            <TeacherPwField label="RETYPE NEW PASSWORD" value={confirmPw} onChange={handleConfChange}
              show={showConf} toggle={() => setShowConf(v => !v)} errorMsg={confPwErr}
              textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr} />
            <Text style={[mStyles.hint, { color: textSub }]}>Minimum 6 characters</Text>
            <TouchableOpacity style={[mStyles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={mStyles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, isDarkMode }) {
  const textPri = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub = isDarkMode ? '#8a94b8' : '#8a94a6';
  const border  = isDarkMode ? '#252b3e' : '#f5f7fa';
  return (
    <View style={[styles.infoRow, { borderBottomColor: border }]}>
      <View style={styles.infoIcon}>
        <Icon size={18} color={isDarkMode ? '#5a6080' : '#8a94a6'} />
      </View>
      <View style={styles.infoBody}>
        <Text style={[styles.infoLabel, { color: textSub }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: textPri }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Section Row (with chevron, toggle, or value) ────────────────────────────
function SectionRow({ icon: Icon, label, sub, onPress, toggle, toggleVal, onToggle,
                      isDarkMode, isLast, textPri, textSub, iconBg, border }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && { borderBottomWidth: 1, borderBottomColor: border }]}
      onPress={toggle ? undefined : onPress}
      activeOpacity={toggle ? 1 : 0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
          <Icon size={16} color={isDarkMode ? '#8a94b8' : '#1a1f36'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuLabel, { color: textPri }]}>{label}</Text>
          {sub ? <Text style={[styles.menuSub, { color: textSub }]}>{sub}</Text> : null}
        </View>
      </View>
      {toggle ? (
        <Switch value={toggleVal} onValueChange={onToggle}
          trackColor={{ false: isDarkMode ? '#2a2f42' : '#e6e9f0', true: `${BLUE}55` }}
          thumbColor={toggleVal ? BLUE : '#aab0be'} />
      ) : (
        <ChevronRight size={20} color={isDarkMode ? '#3a4060' : '#aab0be'} />
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherProfileScreen({ navigation }) {
  const { isDarkMode, toggleDarkMode, token } = useAuth();
  const [toggles, setToggles] = useState({ push: true, email: true, sms: false, autoCamera: true, autoSave: true });
  const [subPage,  setSubPage]  = useState(null); // 'help' | 'privacy' | 'terms'
  const [editProfileVisible,    setEditProfileVisible]    = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  const bg       = isDarkMode ? '#111827' : '#f5f7fa';
  const cardBg   = isDarkMode ? '#1a1f2e' : '#ffffff';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const border   = isDarkMode ? '#252b3e' : '#f5f7fa';
  const iconBg   = isDarkMode ? '#252b3e' : '#f5f7fa';

  const tog = (key, val) => setToggles(p => ({ ...p, [key]: val }));

  // Sub-pages rendered as full overlays
  if (subPage === 'help')    return <HelpFAQPage       onBack={() => setSubPage(null)} isDarkMode={isDarkMode} />;
  if (subPage === 'privacy') return <PrivacyPolicyPage onBack={() => setSubPage(null)} isDarkMode={isDarkMode} />;
  if (subPage === 'terms')   return <TermsPage         onBack={() => setSubPage(null)} isDarkMode={isDarkMode} />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={bg} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{TEACHER.initials}</Text>
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          <Text style={styles.heroName}>{TEACHER.name}</Text>
          <Text style={styles.heroRole}>{TEACHER.role} · {TEACHER.department}</Text>
          <Text style={styles.heroId}>ID: {TEACHER.employeeId}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{TEACHER.classes}</Text>
              <Text style={styles.heroStatLabel}>Classes</Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>Contact Information</Text>
          <InfoRow icon={Mail}     label="Email"      value={TEACHER.email}      isDarkMode={isDarkMode} />
          <InfoRow icon={Phone}    label="Phone"      value={TEACHER.phone}      isDarkMode={isDarkMode} />
          <InfoRow icon={Building} label="Department" value={TEACHER.department} isDarkMode={isDarkMode} />
          <InfoRow icon={Calendar} label="Joined"     value={TEACHER.joinDate}   isDarkMode={isDarkMode} />
        </View>

        {/* Appearance */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>Appearance</Text>
          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
                {isDarkMode ? <Moon size={16} color="#7c8ccc" /> : <Sun size={16} color="#b07d00" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: textPri }]}>Dark Mode</Text>
                <Text style={[styles.menuSub, { color: textSub }]}>{isDarkMode ? 'Dark theme on' : 'Light theme on'}</Text>
              </View>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleDarkMode}
              trackColor={{ false: '#e0e4f0', true: '#3a4a8a' }}
              thumbColor={isDarkMode ? '#7c8ccc' : '#aab0be'} />
          </View>
        </View>

        {/* Account */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>Account</Text>
          <SectionRow icon={Edit2} label="Edit Profile" sub="Update name and phone"
            onPress={() => setEditProfileVisible(true)}
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
          <SectionRow icon={Key} label="Change Password" sub="Update your login credentials"
            onPress={() => setChangePasswordVisible(true)} isLast
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
        </View>

        {/* Notifications */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>Notifications</Text>
          <SectionRow icon={Bell} label="Push Notifications" sub="Alerts on your device"
            toggle toggleVal={toggles.push} onToggle={v => tog('push', v)} isLast
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
        </View>

        {/* Settings */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>Settings</Text>
          <SectionRow icon={Camera} label="Auto-Open Camera" sub="Launch camera when starting class"
            toggle toggleVal={toggles.autoCamera} onToggle={v => tog('autoCamera', v)}
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
          <SectionRow icon={Save} label="Auto-Save Attendance" sub="Save records when session ends"
            toggle toggleVal={toggles.autoSave} onToggle={v => tog('autoSave', v)} isLast
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
        </View>

        {/* Support */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textSub }]}>Support</Text>
          <SectionRow icon={HelpCircle} label="Help & FAQ" sub="How to use the app"
            onPress={() => setSubPage('help')}
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
          <SectionRow icon={FileText} label="Privacy Policy" sub="How we handle your data"
            onPress={() => setSubPage('privacy')}
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
          <SectionRow icon={Clipboard} label="Terms of Service" sub="Usage terms and conditions"
            onPress={() => setSubPage('terms')} isLast
            isDarkMode={isDarkMode} textPri={textPri} textSub={textSub} iconBg={iconBg} border={border} />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0', borderColor: isDarkMode ? '#4a2020' : '#fdd' }]}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#e74c3c" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TeacherBottomNav navigation={navigation} active="Profile" />

      <EditProfileModal    visible={editProfileVisible}    onClose={() => setEditProfileVisible(false)}    isDarkMode={isDarkMode} token={token} />
      <ChangePasswordModal visible={changePasswordVisible} onClose={() => setChangePasswordVisible(false)} isDarkMode={isDarkMode} token={token} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 18 },

  // Sub-page header
  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  subHeaderTitle: { fontSize: 17, fontWeight: '800' },

  // FAQ / Policy
  helpIntro: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  faqCard: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  faqQ: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  faqA: { fontSize: 13, lineHeight: 20 },
  policyCard: {
    borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  policyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  policyText:  { fontSize: 13, lineHeight: 21 },
  policyMeta:  { fontSize: 11, marginTop: 20, textAlign: 'center' },

  // Hero Card
  heroCard: {
    backgroundColor: BLUE, borderRadius: 24, padding: 24,
    alignItems: 'center', marginTop: 16, marginBottom: 14,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  onlineIndicator: {
    position: 'absolute', top: 2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#4ade80', borderWidth: 2, borderColor: BLUE,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  heroRole: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  heroId:   { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  heroStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 30,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Card
  card: {
    borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 14,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  infoIcon: { width: 28, alignItems: 'center' },
  infoBody: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },

  // Menu rows
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600' },
  menuSub:   { fontSize: 11, marginTop: 1 },
  menuValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13 },

  // Logout
  logoutBtn: {
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 14, borderWidth: 1.5,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#e74c3c' },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  overlay: {}, // no longer used — backdrop is a flex TouchableOpacity
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 22,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  fieldStatic: {
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14,
    paddingVertical: 13, marginBottom: 14, opacity: 0.6,
  },
  fieldStaticText: { fontSize: 14 },
  fieldInput: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, marginBottom: 14,
  },
  pwRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, marginBottom: 14,
  },
  pwInput: { flex: 1, fontSize: 14, paddingVertical: 13 },
  eyeBtn:  { padding: 6 },
  hint:    { fontSize: 12, marginBottom: 18, marginTop: -6 },
  inlineError: { fontSize: 12, color: '#e74c3c', marginTop: -8, marginBottom: 10, marginLeft: 2 },
  saveBtn: {
    backgroundColor: BLUE, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
});
