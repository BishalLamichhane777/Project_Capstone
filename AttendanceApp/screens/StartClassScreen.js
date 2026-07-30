import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  ChevronLeft, Camera, Play, Square,
  CheckCircle2, Hourglass, AlertCircle,
} from 'lucide-react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLUE             = '#2952e3';
const GREEN            = '#4ade80';
const SCAN_INTERVAL_MS = 2000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const avatarColors = [
  '#d0d7f5', '#fde8d8', '#d4f4e2', '#fde2e2',
  '#e8d5f5', '#d5edf5', '#f5f0d5', '#f5d5e8',
];

const SCAN_MESSAGES = [
  'Scanning doorway...', 'Face detected!', 'Identifying student...',
  'Matching database...', 'Scanning doorway...', 'Movement detected...',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  return <Animated.View style={[styles.pulsingDot, { transform: [{ scale }] }]} />;
}

function DetectedStudentRow({ student, index }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const isEntry  = student.event !== 'EXIT';
  const badgeLabel = isEntry ? '▶ ENTRY' : '◀ EXIT';
  const badgeColor = isEntry ? GREEN : '#f97316';
  const badgeBg    = isEntry ? 'rgba(74,222,128,0.15)' : 'rgba(249,115,22,0.15)';

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
        <View style={[styles.detectedBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.detectedBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
        {student.confidence != null && (
          <Text style={styles.detectedConfidence}>{Math.round(student.confidence)}% match</Text>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Green recognition overlay — flashes above the camera feed when a face is
 * recognized. Replaces itself on a new event; never stacks.
 */
function RecognitionOverlay({ event }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  useEffect(() => {
    if (!event) return;
    if (animRef.current) animRef.current.stop();
    opacity.setValue(1);
    animRef.current = Animated.sequence([
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]);
    animRef.current.start();
  }, [event]);

  if (!event) return null;

  const isEntry = event.eventType === 'ENTRY';
  // Multi-face: names are newline-separated; split for display
  const nameLines = event._multi
    ? event.name.split('\n')
    : [event.name || `Student #${event.studentId}`];

  return (
    <Animated.View style={[styles.recognitionOverlay, { opacity }]} pointerEvents="none">
      <View style={styles.recognitionBox}>
        <View style={styles.recognitionRow}>
          <CheckCircle2 size={16} color={GREEN} style={{ marginRight: 6 }} />
          <Text style={styles.recognitionName} numberOfLines={event._multi ? event._count : 1}>
            {nameLines.join('  •  ')}
          </Text>
        </View>
        {!event._multi && (
          <View style={[styles.recognitionBadge, isEntry ? styles.badgeEntry : styles.badgeExit]}>
            <Text style={styles.recognitionBadgeText}>
              {isEntry ? '▶ ENTRY' : '◀ EXIT'}
            </Text>
          </View>
        )}
        {event._multi && (
          <View style={[styles.recognitionBadge, styles.badgeEntry]}>
            <Text style={styles.recognitionBadgeText}>
              {`▶ ${event._count} STUDENTS`}
            </Text>
          </View>
        )}
        {event.confidence != null && (
          <Text style={styles.recognitionConfidence}>
            {event._multi
              ? `${event._count} faces recognized`
              : `${Math.round(event.confidence)}% confidence`}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StartClassScreen({ navigation, route }) {
  const { token } = useAuth();
  const classItem = route?.params?.classItem || {
    subject: 'Intro to Comp Sci', code: 'Class 101-A',
    room: 'Room 304', time: '09:00 - 10:30 AM',
  };

  // ── Camera permission ─────────────────────────────────────────────────────
  const [permission, requestPermission] = useCameraPermissions();

  // ── Session state ─────────────────────────────────────────────────────────
  const [isRunning, setIsRunning]               = useState(!!classItem.active_session_id);
  const [sessionId, setSessionId]               = useState(classItem.active_session_id || null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [detected, setDetected]                 = useState([]);
  const [elapsed, setElapsed]                   = useState(0);
  const [loading, setLoading]                   = useState(false);
  const [statusIdx, setStatusIdx]               = useState(0);
  const [overlayEvent, setOverlayEvent]         = useState(null);

  // ── Refs that need to be readable inside interval callbacks ───────────────
  const cameraRef          = useRef(null);
  const timerRef           = useRef(null);
  const statusRef          = useRef(null);
  const scanRef            = useRef(null);
  const isBusyRef          = useRef(false);
  const sessionIdRef       = useRef(sessionId);
  const enrolledRef        = useRef(enrolledStudents); // mirror of enrolledStudents
  const detectedIdsRef     = useRef(new Set());        // mirror of detected student_ids

  // Keep refs in sync with state
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { enrolledRef.current  = enrolledStudents; }, [enrolledStudents]);
  useEffect(() => {
    detectedIdsRef.current = new Set(detected.map(d => d.student_id));
  }, [detected]);

  // ── Restore active session on mount ──────────────────────────────────────
  const fetchSessionStatus = async (activeSessionId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API.sessionStatus}/${activeSessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to retrieve session status');

      if (data.start_time) {
        const diffSeconds = Math.max(
          Math.floor((Date.now() - new Date(data.start_time)) / 1000),
          0,
        );
        setElapsed(diffSeconds);
      }

      const mapped = (data.enrolled_students || []).map(s => ({
        id:                String(s.student_id),
        student_id:        s.student_id,
        name:              s.fullname,
        initials:          getInitials(s.fullname),
        confidence:        null,
        attendance_status: s.attendance_status,
      }));

      setEnrolledStudents(mapped);
      setDetected(mapped.filter(s => s.attendance_status === 'Present').map(s => ({ ...s, event: 'ENTRY' })));
      setIsRunning(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not restore active session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classItem.active_session_id && token) {
      fetchSessionStatus(classItem.active_session_id);
    }
  }, []); // intentionally run once on mount

  // ── Timer + status text rotation ──────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      timerRef.current  = setInterval(() => setElapsed(e => e + 1), 1000);
      statusRef.current = setInterval(
        () => setStatusIdx(i => (i + 1) % SCAN_MESSAGES.length),
        2000,
      );
    } else {
      clearInterval(timerRef.current);
      clearInterval(statusRef.current);
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(statusRef.current);
    };
  }, [isRunning]);

  // ── Scan result handler (no nested setState) ──────────────────────────────
  const handleScanResult = useCallback((result) => {
    const { status } = result;

    // ── multiple_recognized: N faces in one frame ─────────────────────
    if (status === 'multiple_recognized') {
      const items = result.results || [];
      if (items.length === 0) return;

      // Flash overlay showing all names — build a synthetic event using
      // the highest-confidence hit so the overlay component gets a name.
      const best = items.reduce((a, b) =>
        (b.confidence ?? 0) > (a.confidence ?? 0) ? b : a
      );
      setOverlayEvent({
        name:      items.map(r => r.student_name).join('\n'),
        studentId: best.student_id,
        eventType: best.event,
        confidence: best.confidence,
        _ts:       Date.now(),
        _multi:    true,
        _count:    items.length,
      });

      // Update detected list for every student in the batch
      items.forEach(({ student_id, student_name, event: eventType, confidence }) => {
        if (student_id == null) return;

        if (detectedIdsRef.current.has(student_id)) {
          setDetected(prev =>
            prev.map(d =>
              d.student_id === student_id
                ? { ...d, event: eventType, confidence }
                : d
            )
          );
        } else {
          const match = enrolledRef.current.find(e => e.student_id === student_id);
          const newEntry = match
            ? { ...match, confidence, event: eventType }
            : {
                id:         String(student_id),
                student_id: student_id,
                name:       student_name || `Student #${student_id}`,
                initials:   getInitials(student_name),
                confidence: confidence,
                event:      eventType,
              };

          setDetected(prev => {
            if (prev.some(d => d.student_id === student_id)) return prev;
            return [...prev, newEntry];
          });
        }
      });
      return;
    }

    // ── recognized: single face (original path, unchanged) ───────────
    const { student_id, student_name, event: eventType, confidence } = result;

    if (status === 'recognized' && student_id != null) {
      // Flash overlay on every recognized event
      setOverlayEvent({
        name:       student_name,
        studentId:  student_id,
        eventType:  eventType,
        confidence: confidence,
        _ts:        Date.now(),
      });

      if (detectedIdsRef.current.has(student_id)) {
        // Student already in the list — update their event badge (e.g. ENTRY → EXIT)
        setDetected(prev =>
          prev.map(d =>
            d.student_id === student_id
              ? { ...d, event: eventType, confidence }
              : d
          )
        );
      } else {
        // New detection — add to the list
        const match = enrolledRef.current.find(e => e.student_id === student_id);
        const newEntry = match
          ? { ...match, confidence, event: eventType }
          : {
              id:         String(student_id),
              student_id: student_id,
              name:       student_name || `Student #${student_id}`,
              initials:   getInitials(student_name),
              confidence: confidence,
              event:      eventType,
            };

        setDetected(prev => {
          if (prev.some(d => d.student_id === student_id)) return prev;
          return [...prev, newEntry];
        });
      }
    }
    // 'unknown', 'no_face', 'cooldown', 'error' — all silent
  }, []); // no deps needed — reads from refs, not state

  // ── Capture + upload loop ─────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    if (isBusyRef.current)          return; // previous request still in-flight
    if (!cameraRef.current)         return;
    if (!sessionIdRef.current)      return;
    if (!permission?.granted)       return; // camera not permitted

    isBusyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality:        0.6,
        base64:         false,
        skipProcessing: true,
        shutterSound:   false,
      });

      // Resize to 720px wide before uploading — FaceNet only uses a
      // 160×160 face crop, so sending a 1080p frame wastes bandwidth
      // and backend decode time. This single change cuts upload size
      // by ~90% with zero accuracy loss.
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 720 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const form = new FormData();
      form.append('session_id', sessionIdRef.current);
      form.append('image', { uri: resized.uri, type: 'image/jpeg', name: 'frame.jpg' });

      // Do NOT set Content-Type manually — fetch sets the multipart boundary
      const response = await fetch(API.attendanceScan, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    form,
      });

      if (!response.ok) {
        console.warn('[Scan] HTTP', response.status);
        return;
      }

      const result = await response.json();
      handleScanResult(result);
    } catch (err) {
      console.warn('[Scan] error:', err.message || err);
    } finally {
      isBusyRef.current = false;
    }
  }, [token, permission, handleScanResult]);

  // Start / stop scan loop
  useEffect(() => {
    if (isRunning) {
      scanRef.current = setInterval(runScan, SCAN_INTERVAL_MS);
    } else {
      clearInterval(scanRef.current);
      isBusyRef.current = false;
    }
    return () => clearInterval(scanRef.current);
  }, [isRunning, runScan]);

  // ── Formatting ────────────────────────────────────────────────────────────
  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Session start / end ───────────────────────────────────────────────────
  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch(API.sessionStart, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ class_id: classItem.class_id, mode: 'Strict' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start session');

      if (data.resumed) {
        // An existing ACTIVE session was found — restore its state exactly
        // as if the teacher had never left. fetchSessionStatus recalculates
        // elapsed time from server start_time and re-populates the detected list.
        setSessionId(data.session_id);
        await fetchSessionStatus(data.session_id);
        // Brief toast so the teacher knows what happened
        Alert.alert(
          'Session Resumed',
          'Your previous session was still active. Resuming where you left off.',
          [{ text: 'OK' }],
        );
      } else {
        // Fresh session — reset all local state to zero
        const mapped = (data.enrolled_students || []).map(s => ({
          id:         String(s.student_id),
          student_id: s.student_id,
          name:       s.fullname,
          initials:   getInitials(s.fullname),
          confidence: null,
        }));

        setSessionId(data.session_id);
        setEnrolledStudents(mapped);
        setDetected([]);
        setElapsed(0);
        setIsRunning(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not start session.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = () => {
    Alert.alert(
      'End Class Session',
      `${detected.length} student(s) marked present. Save attendance record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save & End',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(API.sessionEnd, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ session_id: sessionId }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Failed to end session');

              setIsRunning(false);
              const s = data.summary || { present: 0, absent: 0, total: 0 };
              Alert.alert(
                '✅ Session Ended',
                `Attendance saved!\n\nPresent: ${s.present}\nAbsent: ${s.absent}\nTotal: ${s.total}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch (err) {
              console.error(err);
              Alert.alert('Error', err.message || 'Could not end session.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Camera box content ────────────────────────────────────────────────────
  const renderCameraContent = () => {
    if (!isRunning) {
      return (
        <View style={styles.cameraIdle}>
          <Camera size={44} color="rgba(255,255,255,0.4)" style={{ marginBottom: 4 }} />
          <Text style={styles.cameraIdleText}>Camera Ready</Text>
          <Text style={styles.cameraIdleHint}>Press Start to begin face detection</Text>
        </View>
      );
    }

    // Permission not yet resolved
    if (permission == null) {
      return <ActivityIndicator color={GREEN} />;
    }

    // Permission denied
    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <AlertCircle size={32} color="rgba(255,255,255,0.45)" style={{ marginBottom: 8 }} />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <Text style={styles.permissionHint}>
            Face scanning needs access to your camera.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Live camera + overlays
    return (
      <>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
        />
        {/* Scan status overlay — above live feed */}
        <View style={styles.cameraActiveOverlay} pointerEvents="none">
          <View style={styles.scanLine} />
          <PulsingDot />
          <Text style={styles.cameraStatusText}>{SCAN_MESSAGES[statusIdx]}</Text>
          <Text style={styles.cameraHint}>Point camera at classroom door</Text>
        </View>
        {/* Recognition flash */}
        <RecognitionOverlay event={overlayEvent} />
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1123" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#ffffff" />
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

        {/* Camera box */}
        <View style={styles.cameraBox}>
          {/* Corner decorations — always on top */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {renderCameraContent()}

          {/* LIVE / STANDBY pill */}
          <View style={[styles.statusPill, isRunning && styles.statusPillActive]}>
            {isRunning && <PulsingDot />}
            <Text style={[styles.statusPillText, isRunning && styles.statusPillTextActive]}>
              {isRunning ? 'LIVE' : 'STANDBY'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#27ae60' }]}>{detected.length}</Text>
            <Text style={styles.statLbl}>Detected</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#e74c3c' }]}>
              {Math.max(enrolledStudents.length - detected.length, 0)}
            </Text>
            <Text style={styles.statLbl}>Not Yet</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: BLUE }]}>{enrolledStudents.length}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#f39c12' }]}>
              {enrolledStudents.length > 0
                ? Math.round((detected.length / enrolledStudents.length) * 100)
                : 0}%
            </Text>
            <Text style={styles.statLbl}>Attendance</Text>
          </View>
        </View>

        {/* Start / End button */}
        {!isRunning ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <><Play size={16} fill="#ffffff" color="#ffffff" /><Text style={styles.startBtnText}>Start Face Detection</Text></>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.endBtn} onPress={handleEnd} activeOpacity={0.85} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <><Square size={16} fill="#ffffff" color="#ffffff" /><Text style={styles.endBtnText}>End Class &amp; Save Attendance</Text></>
            }
          </TouchableOpacity>
        )}

        {/* Detected students */}
        {detected.length > 0 && (
          <View style={styles.detectedCard}>
            <View style={styles.detectedHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CheckCircle2 size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.detectedTitle}>Detected Students</Text>
              </View>
              <View style={styles.detectedCountBadge}>
                <Text style={styles.detectedCountText}>{detected.length}</Text>
              </View>
            </View>
            {detected.map((s, i) => (
              <DetectedStudentRow key={s.id} student={s} index={i} />
            ))}
          </View>
        )}

        {/* Not yet detected */}
        {isRunning && detected.length < enrolledStudents.length && (
          <View style={styles.pendingCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Hourglass size={14} color="rgba(255,255,255,0.6)" style={{ marginRight: 6 }} />
              <Text style={styles.pendingTitle}>Not Yet Detected</Text>
            </View>
            {enrolledStudents
              .filter(s => !detected.find(d => d.id === s.id))
              .map((s, i) => (
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f1123' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, gap: 10,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  timerBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  timerText: { fontSize: 13, color: GREEN, fontWeight: '800', fontVariant: ['tabular-nums'] },

  scroll: { flex: 1, paddingHorizontal: 16 },

  // Camera box
  cameraBox: {
    height: 240, backgroundColor: '#1a1d30', borderRadius: 20,
    marginBottom: 16, justifyContent: 'center', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: BLUE, zIndex: 10 },
  cornerTL: { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },

  cameraActiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', gap: 10, zIndex: 1,
  },
  scanLine: {
    position: 'absolute', top: '40%', left: 30, right: 30,
    height: 2, backgroundColor: 'rgba(73,139,255,0.5)', borderRadius: 1,
  },
  pulsingDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: GREEN },
  cameraStatusText: { fontSize: 14, color: '#ffffff', fontWeight: '700' },
  cameraHint: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  cameraIdle: { alignItems: 'center', gap: 8 },
  cameraIdleText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  cameraIdleHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },

  permissionContainer: { alignItems: 'center', paddingHorizontal: 24, gap: 6 },
  permissionText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  permissionHint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  permissionBtn: {
    marginTop: 6, backgroundColor: BLUE, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  permissionBtnText: { fontSize: 13, color: '#ffffff', fontWeight: '700' },

  statusPill: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, zIndex: 10,
  },
  statusPillActive: { backgroundColor: 'rgba(74,222,128,0.15)' },
  statusPillText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: 1 },
  statusPillTextActive: { color: GREEN },

  // Recognition overlay
  recognitionOverlay: {
    position: 'absolute', top: 14, left: 14, right: 54, zIndex: 5,
  },
  recognitionBox: {
    backgroundColor: 'rgba(15,17,35,0.88)',
    borderWidth: 1.5, borderColor: GREEN,
    borderRadius: 10, padding: 10, gap: 4,
  },
  recognitionRow: { flexDirection: 'row', alignItems: 'center' },
  recognitionName: { fontSize: 13, color: '#ffffff', fontWeight: '800', flex: 1 },
  recognitionBadge: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeEntry: { backgroundColor: 'rgba(74,222,128,0.18)' },
  badgeExit:  { backgroundColor: 'rgba(249,115,22,0.18)' },
  recognitionBadgeText: { fontSize: 10, color: GREEN, fontWeight: '800' },
  recognitionConfidence: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },

  // Stats row
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
  startBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '800' },
  endBtn: {
    backgroundColor: '#e74c3c', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    marginBottom: 16,
    shadowColor: '#e74c3c', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  endBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '800' },

  // Detected list
  detectedCard: {
    backgroundColor: '#1a1d30', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  detectedHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  detectedTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  detectedCountBadge: {
    backgroundColor: '#27ae60', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  detectedCountText: { fontSize: 11, color: '#ffffff', fontWeight: '800' },
  detectedRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detectedAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  detectedAvatarText: { fontSize: 12, fontWeight: '700', color: '#1a1f36' },
  detectedInfo: { flex: 1 },
  detectedName: { fontSize: 13, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  detectedId: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  detectedRight: { alignItems: 'flex-end', gap: 3 },
  detectedBadge: {
    backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center',
  },
  detectedBadgeText: { fontSize: 10, color: GREEN, fontWeight: '700' },
  detectedConfidence: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },

  // Pending list
  pendingCard: { backgroundColor: '#1a1d30', borderRadius: 16, padding: 16, marginBottom: 12 },
  pendingTitle: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.6)' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  pendingBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  pendingAvatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  pendingAvatarText: { fontSize: 11, fontWeight: '700', color: '#8a94a6' },
  pendingName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  pendingStatus: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
});
