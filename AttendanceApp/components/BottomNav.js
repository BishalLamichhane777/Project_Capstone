import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LayoutDashboard, History, GraduationCap, User } from 'lucide-react-native';

const BLUE = '#2952e3';

const tabs = [
  { name: 'Home',    icon: LayoutDashboard,  route: 'Home' },
  { name: 'History', icon: History,  route: 'AttendanceHistory' },
  { name: 'Classes', icon: GraduationCap,  route: 'Classes' },
  { name: 'Profile', icon: User,  route: 'Profile' },
];

export default function BottomNav({ navigation, active }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomNav, { paddingBottom: 10 + insets.bottom }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tabItem}
          onPress={() => navigation.navigate(tab.route)}
        >
          <View style={[styles.tabIcon, active === tab.name && styles.tabIconActive]}>
            <tab.icon size={20} color={active === tab.name ? BLUE : '#aab0be'} />
          </View>
          <Text style={[styles.tabLabel, active === tab.name && styles.tabLabelActive]}>
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
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 3,
    opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#aab0be',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: BLUE,
    fontWeight: '700',
  },
});