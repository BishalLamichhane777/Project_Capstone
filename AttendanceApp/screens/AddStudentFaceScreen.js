/**
 * AddStudentFaceScreen.js
 *
 * Unified student registration screen for admins.
 * Collects student details + 3-10 face photos and submits everything
 * to POST /api/admin/register-student in a single multipart/form-data call.
 *
 * The backend atomically creates the User, Student, and face embedding
 * — or rolls back everything on failure.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';

// ── Design tokens (matches AdminDashboardScreen) ──────────────────────────
const BLUE    = '#2952e3';
const GREEN   = '#27AE60';
const GRAY    = '#95A5A6';
const LABEL   = '#2C3E50';
const BG      = '#f5f7fa';
const CARD_BG = '#ffffff';

// ─────────────────────────────────────────────────────────────────────────

export default function AddStudentFaceScreen({ navigation }) {
  // ── Form state ──────────────────────────────────────────────────────
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [program,    setProgram]    = useState('');
  const [phone,      setPhone]      = useState('');

  // ── Photo state ─────────────────────────────────────────────────────
  // Each item: { uri: string, assetId: string|null }
  const [photos, setPhotos] = useState([]);

  // ── UI state ────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);

  // ── Auth ────────────────────────────────────────────────────────────
  const { token } = useAuth();

  // Set the navigation header title
  useEffect(() => {
    navigation.setOptions({ title: 'Add New Student' });
  }, [navigation]);

  // ── Derived flags ────────────────────────────────────────────────────
  const hasRequiredFields =
    fullName.trim() !== '' &&
    email.trim()    !== '' &&
    password        !== '' &&
    rollNumber.trim() !== '';

  const hasEnoughPhotos = photos.length >= 3;
  const canSubmit = hasRequiredFields && hasEnoughPhotos && !isLoading;

  // ── Photo picker ─────────────────────────────────────────────────────
  const handleAddPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('Permission status:', status);
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library to select student photos.',
      );
      return;
    }

    const remaining = 10 - photos.length;
    console.log('Remaining slots:', remaining);
    if (remaining <= 0) {
      Alert.alert('Limit reached', 'Maximum 10 photos allowed. Remove some to add new ones.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    console.log('Picker result canceled:', result.canceled);
    console.log('Picker result assets:', result.assets);

    if (!result.canceled && result.assets.length > 0) {
      const converted = await Promise.all(result.assets.map(async (asset) => {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        console.log('Converted asset uri:', manipulated.uri);
        return {
          ...asset,
          uri: manipulated.uri,
          mimeType: 'image/jpeg',
          fileName: asset.fileName?.replace(/\.heic$/i, '.jpg') || 'photo.jpg',
        };
      }));

      setPhotos(prev => {
        const updated = [...prev, ...converted].slice(0, 10);
        console.log('Updated photos count:', updated.length);
        return updated;
      });
    }
  };

  // Remove a single photo by index
  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ── Form reset ────────────────────────────────────────────────────────
  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRollNumber('');
    setProgram('');
    setPhone('');
    setPhotos([]);
  };

  // ── Submission ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsLoading(true);

    try {
      // Build multipart/form-data body
      const formData = new FormData();

      // Text fields — names must match backend exactly
      formData.append('full_name',   fullName.trim());
      formData.append('email',       email.trim().toLowerCase());
      formData.append('password',    password);
      formData.append('roll_number', rollNumber.trim().toUpperCase());
      if (program.trim()) formData.append('program', program.trim());
      if (phone.trim())   formData.append('phone',   phone.trim());

      // Image files — field name must be 'images' (plural)
      // DO NOT set Content-Type manually — fetch sets it with the correct boundary
      photos.forEach((image, index) => {
        formData.append('images', {
          uri:  image.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        });
        console.log('Appending image:', index, image.uri);
      });

      const response = await fetch(API.adminRegisterStudent, {
        method: 'POST',
        headers: {
          // NOTE: Content-Type is intentionally omitted so fetch can
          // attach the multipart boundary automatically. Setting it
          // manually breaks image parsing on the backend.
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 201) {
        // Success — show confirmation and navigate back
        Alert.alert(
          'Success',
          `Student registered successfully! Face enrolled with ${data.images_processed} photo${data.images_processed !== 1 ? 's' : ''}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                navigation.goBack();
              },
            },
          ],
        );
      } else if (response.status === 409) {
        // Duplicate email or roll number
        Alert.alert('Duplicate Entry', data.error || 'A student with this email or roll number already exists.');
      } else if (response.status === 400) {
        // Validation error from backend
        Alert.alert('Validation Error', data.error || 'Please check your inputs and try again.');
      } else {
        // 500 or unexpected — likely a face enrollment issue
        Alert.alert(
          'Registration Failed',
          'Registration failed. Please check the photos are clear and well-lit, then try again.',
        );
      }
    } catch (error) {
      // Network or parse error
      console.error('Register student error:', error);
      Alert.alert(
        'Registration Failed',
        'Registration failed. Please check the photos are clear and well-lit, then try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── STUDENT DETAILS CARD ──────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student Details</Text>

            {/* Full Name */}
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sajak Singh Khadka"
              placeholderTextColor="#aab0be"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Email */}
            <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. sajak@example.com"
              placeholderTextColor="#aab0be"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            {/* Password */}
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 8 characters"
              placeholderTextColor="#aab0be"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
            />

            {/* Roll Number */}
            <Text style={styles.label}>Roll Number <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS-2024-001"
              placeholderTextColor="#aab0be"
              value={rollNumber}
              onChangeText={setRollNumber}
              autoCapitalize="characters"
              returnKeyType="next"
            />

            {/* Program (optional) */}
            <Text style={styles.label}>Program <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Computer Science"
              placeholderTextColor="#aab0be"
              value={program}
              onChangeText={setProgram}
              returnKeyType="next"
            />

            {/* Phone (optional) */}
            <Text style={[styles.label, { marginBottom: 4 }]}>
              Phone <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, { marginBottom: 0 }]}
              placeholder="e.g. +601234567890"
              placeholderTextColor="#aab0be"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>

          {/* ── PHOTO SECTION CARD ───────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student Photos</Text>
            <Text style={styles.cardSubtitle}>3–10 clear, well-lit, front-facing photos required</Text>

            {/* Add Photos button */}
            <TouchableOpacity
              style={styles.addPhotosBtn}
              onPress={handleAddPhotos}
              activeOpacity={0.8}
            >
              <Text style={styles.addPhotosBtnText}>＋  Add Photos</Text>
            </TouchableOpacity>

            {/* Thumbnails */}
            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailScroll}
                contentContainerStyle={styles.thumbnailRow}
              >
                {photos.map((photo, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                    {/* Remove button */}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemovePhoto(index)}
                      hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Photo counter */}
            <Text style={styles.photoCounter}>
              {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
            </Text>

            {/* Minimum warning */}
            {photos.length > 0 && !hasEnoughPhotos && (
              <Text style={styles.photoWarning}>Minimum 3 photos required</Text>
            )}
          </View>

          {/* ── SUBMIT BUTTON ────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View style={styles.submitInner}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.submitText}>Registering...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Register Student</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
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
  cardSubtitle: {
    fontSize: 12,
    color: '#8a94a6',
    marginBottom: 14,
  },

  // Form fields
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: LABEL,
    marginBottom: 4,
    marginTop: 12,
  },
  required: {
    color: '#e74c3c',
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8a94a6',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1f36',
    backgroundColor: '#f8f9ff',
    marginBottom: 4,
  },

  // Photo section
  addPhotosBtn: {
    backgroundColor: '#3498DB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 14,
  },
  addPhotosBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  thumbnailScroll: {
    marginBottom: 10,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e6e9f0',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  removeBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  photoCounter: {
    fontSize: 13,
    color: '#8a94a6',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  photoWarning: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  // Submit button
  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 4,
  },
  submitBtnDisabled: {
    backgroundColor: GRAY,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
