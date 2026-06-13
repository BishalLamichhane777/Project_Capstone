import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { ChevronLeft, Info, ChevronUp, ChevronDown, FileText, File, X } from 'lucide-react-native';

const BLUE = '#2952e3';

export default function SubmitWaiverScreen({ navigation }) {
  const { token } = useAuth();
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
      }

      const excRes = await fetch(API.myExcuses, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const excData = await excRes.json();
      if (excRes.ok) {
        setPastExcuses(excData);
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Waiver</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={16} color="#3a4a7a" style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            Submit this form to appeal an absence marked by the automated system. All requests require supporting documentation.
          </Text>
        </View>

        {/* Select Date & Class */}
        <Text style={styles.label}>Select Date & Class</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.8}
        >
          <Text style={[styles.dropdownText, selectedSession ? styles.dropdownSelected : null]}>
            {selectedSession ? `${selectedSession.class_name} - ${new Date(selectedSession.start_time).toLocaleDateString()}` : 'Choose the missed session'}
          </Text>
          {dropdownOpen ? <ChevronUp size={11} color="#8a94a6" /> : <ChevronDown size={11} color="#8a94a6" />}
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {absentSessions.length === 0 ? (
              <View style={styles.dropdownItem}>
                <Text style={styles.dropdownItemText}>No absent sessions found.</Text>
              </View>
            ) : (
              absentSessions.map((session, index) => (
                <TouchableOpacity
                  key={session.session_id || index}
                  style={[
                    styles.dropdownItem,
                    index !== absentSessions.length - 1 && styles.dropdownItemBorder,
                  ]}
                  onPress={() => {
                    setSelectedSession(session);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>
                    {session.class_name} - {new Date(session.start_time).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Reason for Absence */}
        <Text style={styles.label}>Reason for Absence</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Briefly explain why you were absent (e.g., medical emergency, family matter)..."
          placeholderTextColor="#aab0be"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Supporting Documents */}
        <Text style={styles.label}>Supporting Documents</Text>

        {/* Upload Box */}
        <TouchableOpacity style={styles.uploadBox} onPress={handleUpload} activeOpacity={0.8}>
          <View style={styles.uploadIconContainer}>
            <FileText size={24} color="#1a1f36" />
          </View>
          <Text style={styles.uploadTitle}>Tap to upload files</Text>
          <Text style={styles.uploadSubtitle}>PDF, JPG or PNG (max. 5MB)</Text>
        </TouchableOpacity>

        {/* Uploaded File */}
        {uploadedFile && (
          <View style={styles.fileCard}>
            <View style={styles.fileIconContainer}>
              <File size={20} color="#e74c3c" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{uploadedFile.name}</Text>
              <Text style={styles.fileSize}>{uploadedFile.size}</Text>
            </View>
            <TouchableOpacity onPress={handleRemoveFile} style={styles.removeButton}>
              <X size={14} color="#8a94a6" />
            </TouchableOpacity>
          </View>
        )}

        {/* Past Excuses History */}
        <Text style={[styles.label, { marginTop: 20 }]}>Past Excuse Requests</Text>
        {loading ? (
          <ActivityIndicator size="small" color={BLUE} />
        ) : pastExcuses.length === 0 ? (
          <View style={styles.historyCard}>
            <Text style={styles.historyEmptyText}>No past excuse requests.</Text>
          </View>
        ) : (
          pastExcuses.map((excuse) => (
            <View key={excuse.request_id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyClassText}>{excuse.class_name}</Text>
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
              <Text style={styles.historyDateText}>Session Date: {new Date(excuse.session_date).toLocaleDateString()}</Text>
              <Text style={styles.historyReasonText} numberOfLines={2}>{excuse.reason}</Text>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>

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