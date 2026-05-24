import React, { useState } from 'react';
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
} from 'react-native';

const BLUE = '#2952e3';

const sessions = [
  'Monday - Room 205 - Database',
  'Tuesday - Room 201 - DAML',
  'Wednesday - Room 301 - Networks',
  'Thursday - Room 102 - OS',
  'Friday - Room 204 - Math',
];

export default function SubmitWaiverScreen({ navigation }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState('');
  const [reason, setReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState({
    name: 'medical_certificate_oct12.pdf',
    size: '1.2 MB',
  });

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleUpload = () => {
    Alert.alert('Upload', 'File picker would open here.');
  };

  const handleSubmit = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please select a session.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for absence.');
      return;
    }
    Alert.alert('Success', 'Your waiver has been submitted successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Waiver</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>ℹ️</Text>
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
            {selectedSession || 'Choose the missed session'}
          </Text>
          <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {sessions.map((session, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  index !== sessions.length - 1 && styles.dropdownItemBorder,
                ]}
                onPress={() => {
                  setSelectedSession(session);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{session}</Text>
              </TouchableOpacity>
            ))}
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
            <Text style={styles.uploadIcon}>📄</Text>
          </View>
          <Text style={styles.uploadTitle}>Tap to upload files</Text>
          <Text style={styles.uploadSubtitle}>PDF, JPG or PNG (max. 5MB)</Text>
        </TouchableOpacity>

        {/* Uploaded File */}
        {uploadedFile && (
          <View style={styles.fileCard}>
            <View style={styles.fileIconContainer}>
              <Text style={styles.fileIcon}>📕</Text>
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{uploadedFile.name}</Text>
              <Text style={styles.fileSize}>{uploadedFile.size}</Text>
            </View>
            <TouchableOpacity onPress={handleRemoveFile} style={styles.removeButton}>
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitText}>Submit Request</Text>
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

  // Submit Button
  submitContainer: {
    paddingHorizontal: 18,
    paddingBottom: 10,
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

});