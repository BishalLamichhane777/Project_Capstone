import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

import { LayoutDashboard, GraduationCap, BarChart3, User } from 'lucide-react-native';

const BLUE = '#2952e3';

const tabs = [
  { name: 'Home',     icon: LayoutDashboard, route: 'TeacherDashboard' },
  { name: 'Classes',  icon: GraduationCap,   route: 'TeacherClasses'   },
  { name: 'Reports',  icon: BarChart3,        route: 'TeacherReports'   },
  { name: 'Profile',  icon: User,             route: 'TeacherProfile'   },
];

export default function TeacherBottomNav({ navigation, active }) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useAuth();

  const bg          = isDarkMode ? '#1a1f2e' : '#ffffff';
  const borderColor = isDarkMode ? '#2a2f42' : '#eef1f5';
  const inactiveColor = isDarkMode ? '#5a6080' : '#aab0be';
  const activeColor = isDarkMode ? '#7c9dff' : BLUE;

  return (
    <View style={[styles.bottomNav, { paddingBottom: 10 + insets.bottom, backgroundColor: bg, borderTopColor: borderColor }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tabItem}
          onPress={() => navigation.navigate(tab.route)}
        >
          <View style={[styles.tabIcon, active === tab.name && styles.tabIconActive]}>
            <tab.icon size={19} color={active === tab.name ? activeColor : inactiveColor} />
          </View>
          <Text style={[styles.tabLabel, { color: inactiveColor }, active === tab.name && { color: activeColor, fontWeight: '700' }]}>
            {tab.name}
          </Text>
          {active === tab.name && <View style={[styles.tabDot, { backgroundColor: activeColor }]} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 19, marginBottom: 3, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 9, fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
