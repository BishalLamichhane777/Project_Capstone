import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert, Animated,
} from 'react-native';

const BLUE = '#2952e3';

// Simulated students that get "detected" over time
const allStudents = [
  { id: 'S001', name: 'Sajak Khadka',    initials: 'SK', confidence: 98, time: 2000 },
  { id: 'S002', name: 'Priya Shrestha',  initials: 'PS', confidence: 95, time: 4500 },
  { id: 'S003', name: 'Aarav Thapa',     initials: 'AT', confidence: 97, time: 6000 },
  { id: 'S004', name: 'Mina Gurung',     initials: 'MG', confidence: 92, time: 8500 },
  { id: 'S005', name: 'Rohan Basnet',    initials: 'RB', confidence: 96, time: 11000 },
  { id: 'S006', name: 'Anita Karki',     initials: 'AK', confidence: 94, time: 14000 },
  { id: 'S007', name: 'Bikash Tamang',   initials: 'BT', confidence: 99, time: 17000 },
  { id: 'S008', name: 'Sita Maharjan',   initials: 'SM', confidence: 91, time: 20000 },
];

const avatarColors = ['#d0d7f5', '#fde8d8', '#d4f4e2', '#fde2e2', '#e8d5f5', '#d5edf5', '#f5f0d5', '#f5d5e8'];

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.pulsingDot, { transform: [{ scale }] }]} />
  );
}

function DetectedStudentRow({ student, index }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.detectedRow, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.detectedAvatar, { backgroundColor: avatarColors[index % avatarColors.length] }]}>
        <Text style={styles.detectedAvatarText}>{student.initials}</Text>
      </View>
      <View style={styles.detectedInfo}>
        <Text style={styles.detectedName}>{student.name}</Text>
        <Text style={styles.detectedId}>{student.id}</Text>
      </View>
      <View style={styles.detectedRight}>
        <View style={styles.detectedBadge}>
          <Text style={styles.detectedBadgeText}>✓ Present</Text>
        </View>
        <Text style={styles.detectedConfidence}>{student.confidence}% match</Text>
      </View>
    </Animated.View>
  );
}

export default function StartClassScreen({ navigation, route }) {
  const classItem = route?.params?.classItem || {
    subject: 'Intro to Comp Sci', code: 'Class 101-A', room: 'Room 304', time: '09:00 - 10:30 AM',
  };

  const [isRunning, setIsRunning]     = useState(false);
  const [detected, setDetected]       = useState([]);
  const [elapsed, setElapsed]         = useState(0);
  const [scanStatus, setScanStatus]   = useState('Ready to scan');
  const timerRef  = useRef(null);
  const statusRef = useRef(null);

  const scanMessages = [
    'Scanning doorway...', 'Face detected!', 'Identifying student...',
    'Matching database...', 'Scanning doorway...', 'Movement detected...',
  ];
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    if (isRunning) {
      // Elapsed timer
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

      // Rotating scan status
      statusRef.current = setInterval(() => {
        setStatusIdx(i => (i + 1) % scanMessages.length);
      }, 2000);

      // Simulate students being detected
      allStudents.forEach(student => {
        setTimeout(() => {
          setDetected(prev => {
            if (prev.find(s => s.id === student.id)) return prev;
            return [...prev, student];
          });
        }, student.time);
      });
    } else {
      clearInterval(timerRef.current);
      clearInterval(statusRef.current);
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(statusRef.current);
    };
  }, [isRunning]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleEnd = () => {
    Alert.alert(
      'End Class Session',
      `${detected.length} students marked present. Save attendance record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save & End',
          onPress: () => {
            setIsRunning(false);
            Alert.alert('✅ Attendance Saved', `${detected.length} students marked present for ${classItem.subject}.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1123" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{classItem.subject}</Text>
          <Text style={styles.headerSub}>{classItem.code} • {classItem.room}</Text>
        </View>
        {isRunning && (
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Camera Viewfinder Simulation */}
        <View style={styles.cameraBox}>
          {/* Corner frames */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {isRunning ? (
            <View style={styles.cameraActive}>
              <View style={styles.scanLine} />
              <PulsingDot />
              <Text style={styles.cameraStatusText}>{scanMessages[statusIdx]}</Text>
              <Text style={styles.cameraHint}>Point camera at classroom door</Text>
            </View>
          ) : (
            <View style={styles.cameraIdle}>
              <Text style={styles.cameraIdleIcon}>📷</Text>
              <Text style={styles.cameraIdleText}>Camera Ready</Text>
              <Text style={styles.cameraIdleHint}>Press Start to begin face detection</Text>
            </View>
          )}

          {/* Status Pill */}
          <View style={[styles.statusPill, isRunning && styles.statusPillActive]}>
            {isRunning && <PulsingDot />}
            <Text style={[styles.statusPillText, isRunning && styles.statusPillTextActive]}>
              {isRunning ? 'LIVE' : 'STANDBY'}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#27ae60' }]}>{detected.length}</Text>
            <Text style={styles.statLbl}>Detected</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#e74c3c' }]}>{allStudents.length - detected.length}</Text>
            <Text style={styles.statLbl}>Not Yet</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: BLUE }]}>{allStudents.length}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#f39c12' }]}>
              {detected.length > 0 ? Math.round((detected.length / allStudents.length) * 100) : 0}%
            </Text>
            <Text style={styles.statLbl}>Attendance</Text>
          </View>
        </View>

        {/* Start / End Button */}
        {!isRunning ? (
          <TouchableOpacity style={styles.startBtn} onPress={() => setIsRunning(true)} activeOpacity={0.85}>
            <Text style={styles.startBtnIcon}>▶</Text>
            <Text style={styles.startBtnText}>Start Face Detection</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.endBtn} onPress={handleEnd} activeOpacity={0.85}>
            <Text style={styles.endBtnIcon}>⏹</Text>
            <Text style={styles.endBtnText}>End Class & Save Attendance</Text>
          </TouchableOpacity>
        )}

        {/* Detected Students List */}
        {detected.length > 0 && (
          <View style={styles.detectedCard}>
            <View style={styles.detectedHeader}>
              <Text style={styles.detectedTitle}>✅ Detected Students</Text>
              <View style={styles.detectedCountBadge}>
                <Text style={styles.detectedCountText}>{detected.length}</Text>
              </View>
            </View>
            {detected.map((s, i) => (
              <DetectedStudentRow key={s.id} student={s} index={i} />
            ))}
          </View>
        )}

        {/* Not Yet Detected */}
        {isRunning && detected.length < allStudents.length && (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>⏳ Not Yet Detected</Text>
            {allStudents.filter(s => !detected.find(d => d.id === s.id)).map((s, i) => (
              <View key={s.id} style={[styles.pendingRow, i !== 0 && styles.pendingBorder]}>
                <View style={[styles.pendingAvatar, { backgroundColor: '#f0f2f8' }]}>
                  <Text style={styles.pendingAvatarText}>{s.initials}</Text>
                </View>
                <Text style={styles.pendingName}>{s.name}</Text>
                <Text style={styles.pendingStatus}>Waiting...</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f1123' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, gap: 10,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#ffffff', fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  timerBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  timerText: { fontSize: 13, color: '#4ade80', fontWeight: '800', fontVariant: ['tabular-nums'] },

  scroll: { flex: 1, paddingHorizontal: 16 },

  // Camera Box
  cameraBox: {
    height: 240, backgroundColor: '#1a1d30', borderRadius: 20,
    marginBottom: 16, justifyContent: 'center', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: BLUE },
  cornerTL: { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },

  cameraActive: { alignItems: 'center', gap: 10 },
  scanLine: {
    position: 'absolute', top: '40%', left: 30, right: 30,
    height: 2, backgroundColor: 'rgba(73,139,255,0.5)', borderRadius: 1,
  },
  pulsingDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#4ade80' },
  cameraStatusText: { fontSize: 14, color: '#ffffff', fontWeight: '700' },
  cameraHint: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  cameraIdle: { alignItems: 'center', gap: 8 },
  cameraIdleIcon: { fontSize: 44, opacity: 0.4 },
  cameraIdleText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  cameraIdleHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },

  statusPill: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusPillActive: { backgroundColor: 'rgba(74,222,128,0.15)' },
  statusPillText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: 1 },
  statusPillTextActive: { color: '#4ade80' },

  // Stats Row
  statsRow: {
    backgroundColor: '#1a1d30', borderRadius: 16, padding: 16,
    flexDirection: 'row', marginBottom: 14,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },

  // Buttons
  startBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    marginBottom: 16,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  startBtnIcon: { fontSize: 16, color: '#ffffff' },
  startBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '800' },
  endBtn: {
    backgroundColor: '#e74c3c', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    marginBottom: 16,
    shadowColor: '#e74c3c', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  endBtnIcon: { fontSize: 16, color: '#ffffff' },
  endBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '800' },

  // Detected List
  detectedCard: {
    backgroundColor: '#1a1d30', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  detectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detectedTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  detectedCountBadge: { backgroundColor: '#27ae60', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  detectedCountText: { fontSize: 11, color: '#ffffff', fontWeight: '800' },
  detectedRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detectedAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detectedAvatarText: { fontSize: 12, fontWeight: '700', color: '#1a1f36' },
  detectedInfo: { flex: 1 },
  detectedName: { fontSize: 13, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  detectedId: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  detectedRight: { alignItems: 'flex-end', gap: 3 },
  detectedBadge: { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  detectedBadgeText: { fontSize: 10, color: '#4ade80', fontWeight: '700' },
  detectedConfidence: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },

  // Pending List
  pendingCard: { backgroundColor: '#1a1d30', borderRadius: 16, padding: 16, marginBottom: 12 },
  pendingTitle: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  pendingBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  pendingAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  pendingAvatarText: { fontSize: 11, fontWeight: '700', color: '#8a94a6' },
  pendingName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  pendingStatus: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
});