import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

import { LayoutDashboard, History, GraduationCap, User } from 'lucide-react-native';

const BLUE = '#2952e3';

const tabs = [
  { name: 'Home',    icon: LayoutDashboard, route: 'Home'              },
  { name: 'History', icon: History,          route: 'AttendanceHistory' },
  { name: 'Classes', icon: GraduationCap,    route: 'Classes'           },
  { name: 'Profile', icon: User,             route: 'Profile'           },
];

export default function BottomNav({ navigation, active }) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useAuth();

  const bg          = isDarkMode ? '#1a1f2e' : '#ffffff';
  const borderColor = isDarkMode ? '#2a2f42' : '#eef1f5';
  const inactiveColor = isDarkMode ? '#5a6080' : '#aab0be';

  return (
    <View style={[styles.bottomNav, { paddingBottom: 10 + insets.bottom, backgroundColor: bg, borderTopColor: borderColor }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tabItem}
          onPress={() => navigation.navigate(tab.route)}
        >
          <View style={[styles.tabIcon, active === tab.name && styles.tabIconActive]}>
            <tab.icon size={20} color={active === tab.name ? BLUE : inactiveColor} />
          </View>
          <Text style={[styles.tabLabel, { color: inactiveColor }, active === tab.name && styles.tabLabelActive]}>
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  tabItem:      { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon:      { fontSize: 20, marginBottom: 3, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel:     { fontSize: 10, fontWeight: '500' },
  tabLabelActive: { color: BLUE, fontWeight: '700' },
});
