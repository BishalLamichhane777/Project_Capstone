import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const BLUE = '#2952e3';

const tabs = [
  { name: 'Home',     icon: '⊞',  route: 'TeacherDashboard' },
  { name: 'Classes',  icon: '🎓',  route: 'TeacherClasses' },
  { name: 'Students', icon: '👥',  route: 'TeacherStudents' },
  { name: 'Reports',  icon: '📊',  route: 'TeacherReports' },
  { name: 'Profile',  icon: '👤',  route: 'TeacherProfile' },
];

export default function TeacherBottomNav({ navigation, active }) {
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tabItem}
          onPress={() => navigation.navigate(tab.route)}
        >
          <Text style={[styles.tabIcon, active === tab.name && styles.tabIconActive]}>
            {tab.icon}
          </Text>
          <Text style={[styles.tabLabel, active === tab.name && styles.tabLabelActive]}>
            {tab.name}
          </Text>
          {active === tab.name && <View style={styles.tabDot} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 19, marginBottom: 3, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 9, color: '#aab0be', fontWeight: '500' },
  tabLabelActive: { color: BLUE, fontWeight: '700' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: BLUE, marginTop: 2 },
});