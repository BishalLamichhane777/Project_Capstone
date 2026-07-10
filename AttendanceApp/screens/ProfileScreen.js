import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  Alert, Switch, Modal, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../api';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  User, Bell, Lock, Phone, Check, ChevronDown, ChevronUp,
  ChevronRight, LogOut, Moon, Sun, X, Eye, EyeOff,
} from 'lucide-react-native';

const BLUE = '#2952e3';

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY'];
const chartValues = [72, 78, 65, 85, 82];

function BarChart({ isDarkMode }) {
  const max = Math.max(...chartValues);
  const barBg = isDarkMode ? '#252b3e' : '#eef1f5';
  return (
    <View style={styles.chartWrapper}>
      <View style={styles.barsRow}>
        {chartValues.map((val, i) => (
          <View key={i} style={styles.barCol}>
            <Text style={[styles.barValue, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{val}%</Text>
            <View style={[styles.barBg, { backgroundColor: barBg }]}>
              <View style={[styles.barFill, { height: `${(val / max) * 100}%`, backgroundColor: val === 82 ? BLUE : '#c7d0f8' }]} />
            </View>
            <Text style={[styles.barMonth, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{months[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose, currentData, token, isDarkMode, onSaved }) {
  const [fullname, setFullname] = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (visible) {
      setFullname(currentData?.fullname || '');
      setPhone(currentData?.phone || '');
    }
  }, [visible, currentData]);

  const bg       = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay  = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  const handleSave = async () => {
    if (!fullname.trim()) {
      Alert.alert('Validation', 'Full name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API.updateMe, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullname: fullname.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      Alert.alert('Success', 'Profile updated successfully!');
      onSaved({ fullname: fullname.trim(), phone: phone.trim() || null });
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tappable backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: overlay }}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Sheet sits at the bottom via flex, not position:absolute */}
        <View style={[mStyles.sheet, { backgroundColor: bg }]}>
          <View style={mStyles.sheetHeader}>
            <Text style={[mStyles.sheetTitle, { color: textPri }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
              <X size={20} color={textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Email (read-only) */}
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>EMAIL (cannot be changed)</Text>
            <View style={[mStyles.fieldInput, { backgroundColor: isDarkMode ? '#1a1f2e' : '#f0f2f8', borderColor: inputBdr, opacity: 0.6 }]}>
              <Text style={[mStyles.fieldInputText, { color: textSub }]}>{currentData?.email || '—'}</Text>
            </View>

            {/* Full Name */}
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>FULL NAME</Text>
            <TextInput
              style={[mStyles.fieldInput, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]}
              value={fullname}
              onChangeText={setFullname}
              placeholder="Enter your full name"
              placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
              returnKeyType="next"
            />

            {/* Phone */}
            <Text style={[mStyles.fieldLabel, { color: textSub }]}>PHONE (optional)</Text>
            <TextInput
              style={[mStyles.fieldInput, { backgroundColor: inputBg, borderColor: inputBdr, color: textPri }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +977 98XXXXXXXX"
              placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
              keyboardType="phone-pad"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[mStyles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={mStyles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Reusable password input row — defined OUTSIDE the modal so React
//     never unmounts/remounts it on state changes, which would kill focus.
function PasswordField({ label, value, onChangeText, show, toggleShow, errorMsg, textPri, textSub, inputBg, inputBdr }) {
  return (
    <>
      <Text style={[mStyles.fieldLabel, { color: textSub }]}>{label}</Text>
      <View style={[
        mStyles.passwordRow,
        { backgroundColor: inputBg, borderColor: errorMsg ? '#e74c3c' : inputBdr },
      ]}>
        <TextInput
          style={[mStyles.passwordInput, { color: textPri }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          placeholder="••••••••"
          placeholderTextColor="#aab0be"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="next"
        />
        <TouchableOpacity onPress={toggleShow} style={mStyles.eyeBtn}>
          {show
            ? <EyeOff size={18} color={textSub} />
            : <Eye    size={18} color={textSub} />
          }
        </TouchableOpacity>
      </View>
      {!!errorMsg && (
        <Text style={mStyles.inlineError}>{errorMsg}</Text>
      )}
    </>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose, token, isDarkMode }) {
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  // Inline validation errors
  const [newPwError,  setNewPwError]  = useState('');
  const [confPwError, setConfPwError] = useState('');

  useEffect(() => {
    if (visible) {
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setNewPwError(''); setConfPwError('');
    }
  }, [visible]);

  const bg       = isDarkMode ? '#1a1f2e' : '#ffffff';
  const overlay  = isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const textPri  = isDarkMode ? '#ffffff' : '#1a1f36';
  const textSub  = isDarkMode ? '#8a94b8' : '#8a94a6';
  const inputBg  = isDarkMode ? '#252b3e' : '#f8f9ff';
  const inputBdr = isDarkMode ? '#2a2f42' : '#e6e9f0';

  // Validate new password length live
  const handleNewPwChange = (val) => {
    setNewPw(val);
    if (val.length > 0 && val.length < 6) {
      setNewPwError('Password must be at least 6 characters.');
    } else {
      setNewPwError('');
    }
    // Re-check confirm match if already typed
    if (confirmPw.length > 0) {
      setConfPwError(val !== confirmPw ? 'Passwords do not match.' : '');
    }
  };

  // Validate confirm password match live
  const handleConfirmPwChange = (val) => {
    setConfirmPw(val);
    if (val.length > 0 && val !== newPw) {
      setConfPwError('Passwords do not match.');
    } else {
      setConfPwError('');
    }
  };

  const handleSave = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }
    if (newPw.length < 6) {
      setNewPwError('Password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setConfPwError('Passwords do not match.');
      return;
    }
    if (newPw === currentPw) {
      Alert.alert('Validation', 'New password must differ from the current one.');
      return;
    }
    setSaving(true);
    try {
      const meRes = await fetch(API.currentUser, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) throw new Error('Could not verify current user.');
      const me = await meRes.json();

      const loginRes = await fetch(API.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: me.email, password: currentPw }),
      });
      if (!loginRes.ok) {
        Alert.alert('Error', 'Current password is incorrect.');
        return;
      }

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
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tappable backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: overlay }}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Sheet sits at the bottom via flex, not position:absolute */}
        <View style={[mStyles.sheet, { backgroundColor: bg }]}>
          <View style={mStyles.sheetHeader}>
            <Text style={[mStyles.sheetTitle, { color: textPri }]}>Change Password</Text>
            <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
              <X size={20} color={textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <PasswordField
              label="CURRENT PASSWORD"
              value={currentPw}
              onChangeText={setCurrentPw}
              show={showCur}
              toggleShow={() => setShowCur(v => !v)}
              errorMsg=""
              textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr}
            />
            <PasswordField
              label="NEW PASSWORD"
              value={newPw}
              onChangeText={handleNewPwChange}
              show={showNew}
              toggleShow={() => setShowNew(v => !v)}
              errorMsg={newPwError}
              textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr}
            />
            <PasswordField
              label="RETYPE NEW PASSWORD"
              value={confirmPw}
              onChangeText={handleConfirmPwChange}
              show={showConf}
              toggleShow={() => setShowConf(v => !v)}
              errorMsg={confPwError}
              textPri={textPri} textSub={textSub} inputBg={inputBg} inputBdr={inputBdr}
            />

            <Text style={[mStyles.passwordHint, { color: textSub }]}>
              Minimum 6 characters
            </Text>

            <TouchableOpacity
              style={[mStyles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={mStyles.saveBtnText}>Update Password</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ProfileScreen({ navigation }) {
  const { token, user, logoutState, isDarkMode, toggleDarkMode } = useAuth();
  const [fullProfile, setFullProfile] = useState(null);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('Last 5 Months');
  const periods = ['Last 3 Months', 'Last 5 Months', 'This Year'];
  const [periodOpen, setPeriodOpen] = useState(false);
  const [editProfileVisible,  setEditProfileVisible]  = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const response = await fetch(API.currentUser, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setFullProfile(data);
        }
      } catch (error) {
        console.error('Error fetching full profile:', error);
      }

      try {
        const classRes = await fetch(API.studentClasses, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (classRes.ok) {
          const data = await classRes.json();
          setEnrolledCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching enrolled classes:', error);
      }
    };

    if (token && user?.role === 'student') {
      getProfile();
    } else if (token) {
      // For non-student roles, still fetch the profile but skip studentClasses
      fetch(API.currentUser, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setFullProfile(d); })
        .catch(() => {});
    }
  }, [token]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: () => {
            logoutState();
            navigation.replace('Login');
          } 
        },
      ]
    );
  };

  const displayName = fullProfile?.fullname || user?.fullname || 'Student';
  const displayID = fullProfile?.student_profile?.roll_number 
    ? `Roll No: ${fullProfile.student_profile.roll_number}` 
    : (user ? `User ID: ${user.id}` : '');
  const program = fullProfile?.student_profile?.program || 'Computer Science';
  const yearOfStudy = fullProfile?.student_profile?.year_of_study 
    ? `Year ${fullProfile.student_profile.year_of_study}` 
    : 'Student';

  const displayInitials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#111827' : '#f5f7fa'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Academic Dashboard</Text>
        <TouchableOpacity style={[styles.bellButton, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
          <Bell size={17} color={isDarkMode ? '#ffffff' : '#1a1f36'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayInitials}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Check size={11} color="#ffffff" />
            </View>
          </View>

          <Text style={[styles.profileName, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>{displayName}</Text>
          <Text style={[styles.profileID, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{displayID}</Text>

          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
              <Text style={styles.tagText}>{program}</Text>
            </View>
            <View style={[styles.tag, styles.tagSecondary, { backgroundColor: isDarkMode ? '#2e2a1a' : '#fff4e6' }]}>
              <Text style={[styles.tagText, styles.tagTextSecondary]}>{yearOfStudy}</Text>
            </View>
          </View>

          <View style={[styles.statsRow, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>88%</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>ATTENDANCE</Text>
              <View style={[styles.statBar, { backgroundColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
                <View style={[styles.statBarFill, { width: '88%', backgroundColor: BLUE }]} />
              </View>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>{enrolledCount}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>ACTIVE</Text>
              <Text style={[styles.statSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>subjects</Text>
            </View>
          </View>
        </View>

        {/* Attendance Analytics */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Attendance Analytics</Text>
            <TouchableOpacity
              style={[styles.periodPicker, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}
              onPress={() => setPeriodOpen(!periodOpen)}
            >
              <Text style={[styles.periodText, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>{selectedPeriod}</Text>
              {periodOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
            </TouchableOpacity>
          </View>

          {periodOpen && (
            <View style={[styles.periodDropdown, { backgroundColor: isDarkMode ? '#252b3e' : '#f8f9ff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
              {periods.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodOption, { borderBottomColor: isDarkMode ? '#2a2f42' : '#eef1f5' }]}
                  onPress={() => { setSelectedPeriod(p); setPeriodOpen(false); }}
                >
                  <Text style={[styles.periodOptionText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }, selectedPeriod === p && styles.periodOptionActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <BarChart isDarkMode={isDarkMode} />

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BLUE }]} />
              <Text style={[styles.legendText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Current Month</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c7d0f8' }]} />
              <Text style={[styles.legendText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Previous Months</Text>
            </View>
          </View>
        </View>

        {/* Risk Assessment */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Risk Assessment</Text>
          <Text style={[styles.riskSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Based on your current attendance record</Text>

          <View style={[styles.riskCardActive, { backgroundColor: isDarkMode ? '#1a2e1e' : '#edfaf3' }]}>
            <View style={styles.riskLeft}>
              <View style={[styles.riskDot, { backgroundColor: '#27ae60' }]} />
              <View>
                <Text style={[styles.riskLabelActive, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Low Risk (Current)</Text>
                <Text style={[styles.riskRange, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Attendance 80% — 100%</Text>
              </View>
            </View>
            <View style={styles.riskBadge}>
              <Text style={styles.riskBadgeText}>88%</Text>
            </View>
          </View>

          <View style={styles.thresholdRow}>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#f39c12' }]} />
              <Text style={[styles.thresholdText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Mid Risk: 60–79%</Text>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#e74c3c' }]} />
              <Text style={[styles.thresholdText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>High Risk: Below 60%</Text>
            </View>
          </View>

          <View style={styles.riskProgressBg}>
            <View style={[styles.riskProgressFill, { width: '88%' }]} />
            <View style={[styles.riskMarker, { left: '60%' }]} />
            <View style={[styles.riskMarker, { left: '79%' }]} />
          </View>
          <View style={styles.riskProgressLabels}>
            <Text style={[styles.riskProgressLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>0%</Text>
            <Text style={[styles.riskProgressLabel, { color: '#f39c12' }]}>60%</Text>
            <Text style={[styles.riskProgressLabel, { color: '#27ae60' }]}>80%</Text>
            <Text style={[styles.riskProgressLabel, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>100%</Text>
          </View>
        </View>

        {/* Dark Mode Toggle */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36', marginBottom: 14 }]}>Appearance</Text>
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              {isDarkMode ? <Moon size={17} color="#7c8ccc" /> : <Sun size={17} color="#b07d00" />}
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Dark Mode</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                {isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#e0e4f0', true: '#3a4a8a' }}
              thumbColor={isDarkMode ? '#7c8ccc' : '#aab0be'}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Settings</Text>

          {/* Edit Profile */}
          <TouchableOpacity
            style={[styles.settingsRow, styles.settingsBorder, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]}
            onPress={() => setEditProfileVisible(true)}
          >
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              <User size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Edit Profile</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Update your personal information</Text>
            </View>
            <ChevronRight size={22} color={isDarkMode ? '#3a4060' : '#8a94a6'} />
          </TouchableOpacity>

          {/* Notifications toggle */}
          <View
            style={[styles.settingsRow, styles.settingsBorder, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]}
          >
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              <Bell size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Notifications</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                {notificationsEnabled ? 'Alerts are enabled' : 'Alerts are disabled'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={v => setNotificationsEnabled(v)}
              trackColor={{ false: isDarkMode ? '#2a2f42' : '#e0e4f0', true: '#c7d0f8' }}
              thumbColor={notificationsEnabled ? BLUE : '#aab0be'}
            />
          </View>

          {/* Change Password */}
          <TouchableOpacity
            style={[styles.settingsRow, styles.settingsBorder, { borderBottomColor: isDarkMode ? '#252b3e' : '#f0f2f5' }]}
            onPress={() => setChangePasswordVisible(true)}
          >
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              <Lock size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Change Password</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Update your account password</Text>
            </View>
            <ChevronRight size={22} color={isDarkMode ? '#3a4060' : '#8a94a6'} />
          </TouchableOpacity>

          {/* Contact Support */}
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingsIcon, { backgroundColor: isDarkMode ? '#252b3e' : '#f0f2f8' }]}>
              <Phone size={17} color={isDarkMode ? '#8a94b8' : '#1a1f36'} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Contact Support</Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>
                iimscollege.edu.np
              </Text>
              <Text style={[styles.settingsSub, { color: BLUE, marginTop: 1 }]}>
                info@iimscollege.edu.np
              </Text>
              <Text style={[styles.settingsSub, { color: isDarkMode ? '#8a94b8' : '#8a94a6', marginTop: 1 }]}>
                +977-01-4362154
              </Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0', borderColor: isDarkMode ? '#4a2020' : '#ffd0d0' }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Profile" />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        currentData={{ fullname: displayName, email: fullProfile?.email || user?.email, phone: fullProfile?.phone }}
        token={token}
        isDarkMode={isDarkMode}
        onSaved={(updated) => setFullProfile(prev => ({ ...prev, ...updated }))}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        token={token}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1f36',
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  bellIcon: { fontSize: 17 },

  scroll: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d0d7f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: BLUE,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: BLUE,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  verifiedIcon: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1f36',
    marginBottom: 4,
  },
  profileID: {
    fontSize: 12,
    color: '#8a94a6',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tag: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagSecondary: {
    backgroundColor: '#fff4e6',
  },
  tagText: {
    fontSize: 12,
    color: BLUE,
    fontWeight: '600',
  },
  tagTextSecondary: {
    color: '#e67e22',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#f8f9ff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e6e9f0',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1f36',
  },
  statLabel: {
    fontSize: 9,
    color: '#8a94a6',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statSub: {
    fontSize: 10,
    color: '#8a94a6',
  },
  statBar: {
    width: 50,
    height: 4,
    backgroundColor: '#e6e9f0',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1f36',
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  // Period Picker
  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f2f8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  periodText: {
    fontSize: 11,
    color: '#1a1f36',
    fontWeight: '600',
  },
  periodArrow: {
    fontSize: 9,
    color: '#8a94a6',
  },
  periodDropdown: {
    backgroundColor: '#f8f9ff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e6e9f0',
  },
  periodOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  periodOptionText: {
    fontSize: 13,
    color: '#8a94a6',
  },
  periodOptionActive: {
    color: BLUE,
    fontWeight: '700',
  },

  // Chart
  chartWrapper: {
    marginTop: 10,
    marginBottom: 12,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  barValue: {
    fontSize: 9,
    color: '#8a94a6',
    fontWeight: '600',
  },
  barBg: {
    width: 30,
    height: 70,
    backgroundColor: '#eef1f5',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barMonth: {
    fontSize: 10,
    color: '#8a94a6',
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#8a94a6',
  },

  // Risk Assessment
  riskSub: {
    fontSize: 12,
    color: '#8a94a6',
    marginBottom: 14,
  },
  riskCardActive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#edfaf3',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#27ae60',
    marginBottom: 14,
  },
  riskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  riskLabelActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 2,
  },
  riskRange: {
    fontSize: 11,
    color: '#8a94a6',
  },
  riskBadge: {
    backgroundColor: '#27ae60',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  riskBadgeText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '800',
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  thresholdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thresholdText: {
    fontSize: 11,
    color: '#8a94a6',
  },
  riskProgressBg: {
    height: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  riskProgressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  riskMarker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#ffffff',
  },
  riskProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskProgressLabel: {
    fontSize: 10,
    color: '#8a94a6',
    fontWeight: '600',
  },

  // Settings
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  settingsBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0f2f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsIconText: { fontSize: 17 },
  settingsContent: { flex: 1 },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 2,
  },
  settingsSub: {
    fontSize: 11,
    color: '#8a94a6',
  },
  settingsArrow: {
    fontSize: 22,
    color: '#8a94a6',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff0f0',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#ffd0d0',
  },
  logoutIcon: { fontSize: 18 },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e74c3c',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#aab0be',
    marginBottom: 10,
  },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  overlay: {
    // kept for any legacy reference, but no longer used directly
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 22,
  },
  sheetTitle: {
    fontSize: 18, fontWeight: '800',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0f2f8',
    justifyContent: 'center', alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.6,
    marginBottom: 6, marginTop: 4,
  },
  fieldInput: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, marginBottom: 14,
  },
  fieldInputText: {
    fontSize: 14,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, marginBottom: 14,
  },
  passwordInput: {
    flex: 1, fontSize: 14, paddingVertical: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  passwordHint: {
    fontSize: 12, marginBottom: 18, marginTop: -6,
  },
  inlineError: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: -8,
    marginBottom: 10,
    marginLeft: 2,
  },
  saveBtn: {
    backgroundColor: BLUE, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15, color: '#ffffff', fontWeight: '700',
  },
});
