import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import { API } from '../api';
import { BookOpen, MapPin, User } from 'lucide-react-native';

const BLUE = '#2952e3';

function ClassCard({ item, token }) {
  const isOngoing = !!item.active_session_id;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('not_joined');

  useEffect(() => {
    if (isOngoing && token) {
      fetchStatus();
    }
  }, [isOngoing, token]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API.attendanceStatus}?session_id=${item.active_session_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.status);
      }
    } catch (e) {
      console.log('Error fetching status:', e);
    }
  };

  const handleAction = async (eventType) => {
    setLoading(true);
    try {
      const res = await fetch(API.attendanceLog, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: item.active_session_id,
          event_type: eventType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log attendance');
      
      setStatus(eventType === 'ENTRY' ? 'joined' : 'left');
      Alert.alert('Success', `Successfully logged ${eventType}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.classCard, isOngoing && styles.classCardOngoing]}>
      {isOngoing && (
        <View style={styles.ongoingBanner}>
          <View style={styles.ongoingDot} />
          <Text style={styles.ongoingText}>Ongoing</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        {/* Icon */}
        <View style={[styles.classIcon, { backgroundColor: '#eef2ff' }]}>
          <BookOpen size={18} color={BLUE} />
        </View>

        {/* Info */}
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.subject}</Text>
          <Text style={styles.classCode}>{item.class_name}</Text>
          <View style={styles.detailsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MapPin size={11} color="#6b7280" style={{ marginRight: 2 }} />
              <Text style={styles.detailItem}>{item.room || 'TBD'}</Text>
            </View>
            <Text style={styles.detailDot}>·</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <User size={11} color="#6b7280" style={{ marginRight: 2 }} />
              <Text style={styles.detailItem}>{item.teacher_name || 'TBA'}</Text>
            </View>
          </View>
        </View>

        {/* Time */}
        <View style={styles.timeBlock}>
          <Text style={[styles.timeText, isOngoing && styles.timeTextActive]}>
            {item.schedule_time ? new Date(item.schedule_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
          </Text>
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{item.duration_minutes || 0}m</Text>
          </View>
        </View>
      </View>
      
      {/* Action Buttons for Ongoing Session */}
      {isOngoing && (
        <View style={styles.actionContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={BLUE} style={{ padding: 10 }} />
          ) : (
            <>
              {status === 'not_joined' || status === 'left' ? (
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleAction('ENTRY')}>
                  <Text style={styles.joinBtnText}>Join Session</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.leaveBtn} onPress={() => handleAction('EXIT')}>
                  <Text style={styles.leaveBtnText}>Leave Session</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function ClassesScreen({ navigation }) {
  const { token } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchClasses();
    }
  }, [token]);

  const fetchClasses = async () => {
    try {
      const res = await fetch(API.studentClasses, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setClasses(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch classes');
      }
    } catch (e) {
      console.log('Error fetching classes:', e);
      Alert.alert('Error', 'Network error while fetching classes');
    } finally {
      setLoading(false);
    }
  };

  const ongoingClasses = classes.filter(c => c.active_session_id);
  const upcomingClasses = classes.filter(c => !c.active_session_id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Classes</Text>
          <Text style={styles.headerSub}>All enrolled classes</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{classes.length} total</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ONGOING NOW */}
            {ongoingClasses.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Ongoing Now</Text>
                  <Text style={styles.sectionCount}>{ongoingClasses.length} active</Text>
                </View>
                {ongoingClasses.map(item => (
                  <ClassCard key={item.class_id} item={item} token={token} />
                ))}
              </>
            )}

            {/* ALL OTHER CLASSES */}
            <View style={[styles.sectionHeader, ongoingClasses.length > 0 && { marginTop: 20 }]}>
              <View style={[styles.sectionDot, { backgroundColor: '#8a94a6' }]} />
              <Text style={styles.sectionTitle}>My Classes</Text>
            </View>

            {upcomingClasses.length === 0 && ongoingClasses.length === 0 ? (
              <View style={styles.noClassBox}>
                <Text style={styles.noClassText}>No classes found.</Text>
              </View>
            ) : (
              upcomingClasses.map(item => (
                <ClassCard key={item.class_id} item={item} token={token} />
              ))
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Classes" />
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1f36',
  },
  headerSub: {
    fontSize: 13,
    color: '#8a94a6',
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  totalText: {
    fontSize: 13,
    color: BLUE,
    fontWeight: '700',
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1f36',
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: '#8a94a6',
    fontWeight: '500',
  },

  // Class Card
  classCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  classCardOngoing: {
    borderWidth: 1.5,
    borderColor: BLUE,
  },
  ongoingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ongoingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#27ae60',
  },
  ongoingText: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 2,
  },
  classCode: {
    fontSize: 11,
    color: '#8a94a6',
    fontWeight: '500',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  detailItem: {
    fontSize: 11,
    color: '#6b7280',
  },
  detailDot: {
    fontSize: 11,
    color: '#8a94a6',
  },

  // Time Block
  timeBlock: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1f36',
  },
  timeTextActive: {
    color: BLUE,
  },
  durationPill: {
    backgroundColor: '#f0f2f8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontSize: 10,
    color: '#8a94a6',
    fontWeight: '600',
  },
  
  // Action Container
  actionContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
    alignItems: 'stretch',
  },
  joinBtn: {
    backgroundColor: BLUE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  leaveBtn: {
    backgroundColor: '#fff0f0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fad4d4',
  },
  leaveBtnText: {
    color: '#e74c3c',
    fontWeight: '700',
    fontSize: 14,
  },

  // No Class
  noClassBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noClassText: {
    fontSize: 14,
    color: '#8a94a6',
    fontWeight: '500',
  },
});