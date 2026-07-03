import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { ChevronLeft, Info, ChevronUp, ChevronDown, FileText, File, X } from 'lucide-react-native';

const BLUE = '#2952e3';

export default function SubmitWaiverScreen({ navigation }) {
  const { token, isDarkMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [absentSessions, setAbsentSessions] = useState([]);
  const [pastExcuses, setPastExcuses] = useState([]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [reason, setReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const histRes = await fetch(API.attendanceHistory, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const histData = await histRes.json();
      
      if (histRes.ok) {
        const absent = histData.filter(h => h.status === 'Absent');
        setAbsentSessions(absent);
      } else if (histRes.status === 404 && histData.error?.toLowerCase().includes('student profile')) {
        Alert.alert('Error', 'Your student profile is incomplete. Please contact your administrator.');
        return;
      }

      const excRes = await fetch(API.myExcuses, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const excData = await excRes.json();
      if (excRes.ok) {
        setPastExcuses(excData);
      } else if (excRes.status === 404 && excData.error?.toLowerCase().includes('student profile')) {
        Alert.alert('Error', 'Your student profile is incomplete. Please contact your administrator.');
        return;
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleUpload = () => {
    setUploadedFile({
      name: 'medical_certificate.pdf',
      size: '1.2 MB',
    });
  };

  const handleSubmit = async () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please select a session.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for absence.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API.excuseSubmit, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: selectedSession.session_id,
          reason: reason.trim(),
          supporting_doc_path: uploadedFile ? uploadedFile.name : '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Your waiver has been submitted successfully!', [
          { text: 'OK', onPress: () => {
            setSelectedSession(null);
            setReason('');
            setUploadedFile(null);
            fetchData();
          } },
        ]);
      } else {
        Alert.alert('Error', data.error || 'Submission failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#111827' : '#f5f7fa'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={22} color={isDarkMode ? '#ffffff' : '#1a1f36'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Submit Waiver</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
          <Info size={16} color={isDarkMode ? '#7c9dff' : '#3a4a7a'} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: isDarkMode ? '#a0b0e0' : '#3a4a7a' }]}>
            Submit this form to appeal an absence marked by the automated system. All requests require supporting documentation.
          </Text>
        </View>

        {/* Select Date & Class */}
        <Text style={[styles.label, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Select Date & Class</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.8}
        >
          <Text style={[styles.dropdownText, { color: isDarkMode ? '#8a94b8' : '#aab0be' }, selectedSession && { color: isDarkMode ? '#ffffff' : '#1a1f36', fontWeight: '500' }]}>
            {selectedSession ? `${selectedSession.class_name} - ${new Date(selectedSession.start_time).toLocaleDateString()}` : 'Choose the missed session'}
          </Text>
          {dropdownOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={[styles.dropdownMenu, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
            {absentSessions.length === 0 ? (
              <View style={styles.dropdownItem}>
                <Text style={[styles.dropdownItemText, { color: isDarkMode ? '#8a94b8' : '#1a1f36' }]}>No absent sessions found.</Text>
              </View>
            ) : (
              absentSessions.map((session, index) => (
                <TouchableOpacity
                  key={session.session_id || index}
                  style={[styles.dropdownItem, index !== absentSessions.length - 1 && [styles.dropdownItemBorder, { borderBottomColor: isDarkMode ? '#2a2f42' : '#f0f2f5' }]]}
                  onPress={() => { setSelectedSession(session); setDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>
                    {session.class_name} - {new Date(session.start_time).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Reason */}
        <Text style={[styles.label, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Reason for Absence</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0', color: isDarkMode ? '#ffffff' : '#1a1f36' }]}
          placeholder="Briefly explain why you were absent..."
          placeholderTextColor={isDarkMode ? '#5a6080' : '#aab0be'}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Supporting Documents */}
        <Text style={[styles.label, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Supporting Documents</Text>
        <TouchableOpacity style={[styles.uploadBox, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#d0d9f5' }]} onPress={handleUpload} activeOpacity={0.8}>
          <View style={[styles.uploadIconContainer, { backgroundColor: isDarkMode ? '#1e2540' : '#eef2ff' }]}>
            <FileText size={24} color={isDarkMode ? '#7c9dff' : '#1a1f36'} />
          </View>
          <Text style={[styles.uploadTitle, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Tap to upload files</Text>
          <Text style={[styles.uploadSubtitle, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>PDF, JPG or PNG (max. 5MB)</Text>
        </TouchableOpacity>

        {uploadedFile && (
          <View style={[styles.fileCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
            <View style={[styles.fileIconContainer, { backgroundColor: isDarkMode ? '#2e1a1a' : '#fff0f0' }]}>
              <File size={20} color="#e74c3c" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>{uploadedFile.name}</Text>
              <Text style={[styles.fileSize, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>{uploadedFile.size}</Text>
            </View>
            <TouchableOpacity onPress={handleRemoveFile} style={styles.removeButton}>
              <X size={14} color="#8a94a6" />
            </TouchableOpacity>
          </View>
        )}

        {/* Past Excuses */}
        <Text style={[styles.label, { marginTop: 20, color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>Past Excuse Requests</Text>
        {loading ? (
          <ActivityIndicator size="small" color={BLUE} />
        ) : pastExcuses.length === 0 ? (
          <View style={[styles.historyCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
            <Text style={[styles.historyEmptyText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>No past excuse requests.</Text>
          </View>
        ) : (
          pastExcuses.map((excuse) => (
            <View key={excuse.request_id} style={[styles.historyCard, { backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff', borderColor: isDarkMode ? '#2a2f42' : '#e6e9f0' }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyClassText, { color: isDarkMode ? '#ffffff' : '#1a1f36' }]}>{excuse.class_name}</Text>
                <View style={[styles.statusBadge,
                  excuse.status === 'Approved' ? styles.statusApproved :
                  excuse.status === 'Rejected' ? styles.statusRejected :
                  styles.statusPending]}>
                  <Text style={[styles.statusText,
                    excuse.status === 'Approved' ? styles.statusTextApproved :
                    excuse.status === 'Rejected' ? styles.statusTextRejected :
                    styles.statusTextPending]}>{excuse.status}</Text>
                </View>
              </View>
              <Text style={[styles.historyDateText, { color: isDarkMode ? '#8a94b8' : '#8a94a6' }]}>Session Date: {new Date(excuse.session_date).toLocaleDateString()}</Text>
              <Text style={[styles.historyReasonText, { color: isDarkMode ? '#a0b0e0' : '#3a4a7a' }]} numberOfLines={2}>{excuse.reason}</Text>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.submitContainer, { backgroundColor: isDarkMode ? '#111827' : '#f5f7fa' }]}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitText}>Submit Request</Text>}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      <BottomNav navigation={navigation} active="History" />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#f5f7fa',
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#1a1f36',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1f36',
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // Info Banner
  infoBanner: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
    gap: 10,
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3a4a7a',
    lineHeight: 19,
  },

  // Label
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 10,
    marginTop: 4,
  },

  // Dropdown
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dropdownText: {
    fontSize: 14,
    color: '#aab0be',
  },
  dropdownSelected: {
    color: '#1a1f36',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 11,
    color: '#8a94a6',
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#1a1f36',
  },

  // Text Area
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#1a1f36',
    minHeight: 110,
    marginBottom: 22,
  },

  // Upload Box
  uploadBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d0d9f5',
    borderStyle: 'dashed',
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadIcon: {
    fontSize: 24,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#8a94a6',
  },

  // File Card
  fileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fileIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#fff0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileIcon: {
    fontSize: 20,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 11,
    color: '#8a94a6',
  },
  removeButton: {
    padding: 6,
  },
  removeIcon: {
    fontSize: 14,
    color: '#8a94a6',
    fontWeight: '600',
  },

  // Submit Button — paddingBottom lifts the button above the absolute-positioned
  // BottomNav bar (~70px tall). Without this the nav bar covers the button entirely.
  submitContainer: {
    paddingHorizontal: 18,
    paddingBottom: 82,
    backgroundColor: '#f5f7fa',
  },
  submitButton: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // History Card
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    padding: 14,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyClassText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
  },
  historyDateText: {
    fontSize: 12,
    color: '#8a94a6',
    marginBottom: 6,
  },
  historyReasonText: {
    fontSize: 13,
    color: '#3a4a7a',
    lineHeight: 18,
  },
  historyEmptyText: {
    fontSize: 13,
    color: '#8a94a6',
    textAlign: 'center',
    paddingVertical: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPending: {
    backgroundColor: '#fff3e0',
  },
  statusTextPending: {
    color: '#e65100',
  },
  statusApproved: {
    backgroundColor: '#e8f5e9',
  },
  statusTextApproved: {
    color: '#2e7d32',
  },
  statusRejected: {
    backgroundColor: '#ffebee',
  },
  statusTextRejected: {
    color: '#c62828',
  },

});