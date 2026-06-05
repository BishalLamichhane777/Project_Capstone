import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert, TextInput,
} from 'react-native';
import AdminBottomNav from '../components/AdminBottomNav';
import { Camera, CheckCircle, ChevronLeft, ScanFace } from 'lucide-react-native';

const BLUE = '#2952e3';
const GOLD = '#b07d00';

const courses = ['Computer Science', 'Mathematics', 'Physics', 'History', 'Psychology', 'Arts'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const recentStudents = [
  { id: '2024-1023', name: 'Aarav Thapa',    course: 'Computer Science', year: '3rd Year', initials: 'AT', registered: 'Oct 18' },
  { id: '2024-1045', name: 'Mina Shrestha',  course: 'Mathematics',      year: '2nd Year', initials: 'MS', registered: 'Oct 17' },
  { id: '2024-1067', name: 'Rajan Gurung',   course: 'Physics',          year: '1st Year', initials: 'RG', registered: 'Oct 15' },
];

export default function AddStudentFaceScreen({ navigation }) {
  const [name, setName]         = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse]     = useState('');
  const [year, setYear]         = useState('');
  const [photoAdded, setPhotoAdded] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [yearOpen, setYearOpen]   = useState(false);

  const handlePhotoUpload = () => {
    Alert.alert('Upload Photo', 'Choose photo source', [
      { text: 'Camera',        onPress: () => setPhotoAdded(true) },
      { text: 'Photo Library', onPress: () => setPhotoAdded(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = () => {
    if (!name.trim() || !studentId.trim() || !course || !year || !photoAdded) {
      Alert.alert('Incomplete', 'Please fill all fields and upload a photo.');
      return;
    }
    Alert.alert(
      '✅ Student Registered',
      `${name} (${studentId}) has been added to the face recognition database.`,
      [{ text: 'OK', onPress: () => { setName(''); setStudentId(''); setCourse(''); setYear(''); setPhotoAdded(false); } }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1a1f36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Student Face</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <ScanFace size={18} color="#3b5bdb" />
          <Text style={styles.infoText}>
            Upload a clear face photo of the student. This will be used by the automated face recognition system to mark attendance.
          </Text>
        </View>

        {/* Photo Upload */}
        <Text style={styles.sectionTitle}>Student Photo</Text>
        <TouchableOpacity style={styles.photoBox} onPress={handlePhotoUpload} activeOpacity={0.8}>
          {photoAdded ? (
            <View style={styles.photoAdded}>
              <CheckCircle size={32} color="#27ae60" />
              <Text style={styles.photoAddedText}>Photo uploaded successfully</Text>
              <Text style={styles.photoChangeText}>Tap to change</Text>
            </View>
          ) : (
            <View style={styles.photoEmpty}>
              <View style={styles.photoIconCircle}>
                <Camera size={28} color={BLUE} />
              </View>
              <Text style={styles.photoTitle}>Upload Face Photo</Text>
              <Text style={styles.photoSub}>JPG or PNG · Clear front-facing photo</Text>
              <View style={styles.photoTips}>
                <Text style={styles.photoTip}>✓ Good lighting</Text>
                <Text style={styles.photoTip}>✓ No sunglasses</Text>
                <Text style={styles.photoTip}>✓ Face centered</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Student Details */}
        <Text style={styles.sectionTitle}>Student Details</Text>
        <View style={styles.card}>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sajak Singh Khadka"
              placeholderTextColor="#aab0be"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Student ID */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>STUDENT ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2024-8836"
              placeholderTextColor="#aab0be"
              value={studentId}
              onChangeText={setStudentId}
              keyboardType="default"
            />
          </View>

          {/* Course */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>COURSE / DEPARTMENT</Text>
            <TouchableOpacity style={styles.input} onPress={() => { setCourseOpen(!courseOpen); setYearOpen(false); }}>
              <Text style={{ color: course ? '#1a1f36' : '#aab0be', fontSize: 14 }}>
                {course || 'Select course'}
              </Text>
            </TouchableOpacity>
            {courseOpen && (
              <View style={styles.dropdown}>
                {courses.map(c => (
                  <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setCourse(c); setCourseOpen(false); }}>
                    <Text style={[styles.dropdownText, course === c && styles.dropdownActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Year */}
          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>YEAR OF STUDY</Text>
            <TouchableOpacity style={styles.input} onPress={() => { setYearOpen(!yearOpen); setCourseOpen(false); }}>
              <Text style={{ color: year ? '#1a1f36' : '#aab0be', fontSize: 14 }}>
                {year || 'Select year'}
              </Text>
            </TouchableOpacity>
            {yearOpen && (
              <View style={styles.dropdown}>
                {years.map(y => (
                  <TouchableOpacity key={y} style={styles.dropdownItem} onPress={() => { setYear(y); setYearOpen(false); }}>
                    <Text style={[styles.dropdownText, year === y && styles.dropdownActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Recently Added */}
        <Text style={styles.sectionTitle}>Recently Added</Text>
        <View style={styles.card}>
          {recentStudents.map((s, i) => (
            <View key={s.id} style={[styles.recentRow, i !== recentStudents.length - 1 && styles.recentBorder]}>
              <View style={styles.recentAvatar}>
                <Text style={styles.recentAvatarText}>{s.initials}</Text>
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentName}>{s.name}</Text>
                <Text style={styles.recentMeta}>{s.id} · {s.course}</Text>
              </View>
              <View style={styles.recentRight}>
                <View style={styles.registeredBadge}>
                  <Text style={styles.registeredText}>✓ Registered</Text>
                </View>
                <Text style={styles.registeredDate}>{s.registered}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <ScanFace size={18} color="#ffffff" />
          <Text style={styles.submitText}>Register Student Face</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

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
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  infoBanner: {
    backgroundColor: '#eef2ff', borderRadius: 14, padding: 14,
    flexDirection: 'row', gap: 10, marginBottom: 22, alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, color: '#3b5bdb', lineHeight: 19 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.8, marginBottom: 10 },

  photoBox: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 2,
    borderColor: '#d0d9f5', borderStyle: 'dashed',
    marginBottom: 22, overflow: 'hidden',
  },
  photoEmpty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  photoIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center',
  },
  photoIcon: { fontSize: 28 },
  photoTitle: { fontSize: 15, fontWeight: '700', color: '#1a1f36' },
  photoSub: { fontSize: 12, color: '#8a94a6' },
  photoTips: { flexDirection: 'row', gap: 12, marginTop: 4 },
  photoTip: { fontSize: 11, color: '#27ae60', fontWeight: '600' },
  photoAdded: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  photoAddedIcon: { fontSize: 32 },
  photoAddedText: { fontSize: 14, fontWeight: '700', color: '#27ae60' },
  photoChangeText: { fontSize: 12, color: '#8a94a6' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#8a94a6', letterSpacing: 0.6, marginBottom: 7 },
  input: {
    backgroundColor: '#f8f9ff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e6e9f0', paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#1a1f36',
  },
  dropdown: {
    backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e6e9f0', marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  dropdownText: { fontSize: 13, color: '#8a94a6' },
  dropdownActive: { color: BLUE, fontWeight: '700' },

  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  recentBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  recentAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  recentAvatarText: { fontSize: 13, fontWeight: '700', color: BLUE },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 13, fontWeight: '700', color: '#1a1f36', marginBottom: 2 },
  recentMeta: { fontSize: 11, color: '#8a94a6' },
  recentRight: { alignItems: 'flex-end', gap: 3 },
  registeredBadge: { backgroundColor: '#edfaf3', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  registeredText: { fontSize: 10, color: '#27ae60', fontWeight: '700' },
  registeredDate: { fontSize: 10, color: '#aab0be' },

  submitBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginBottom: 14,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitIcon: { fontSize: 18 },
  submitText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
});