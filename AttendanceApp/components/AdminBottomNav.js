import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LayoutDashboard, ClipboardList, BarChart3, Settings, Users } from 'lucide-react-native';

const GOLD = '#b07d00';

const tabs = [
  { name: 'Home',     icon: LayoutDashboard,  route: 'AdminDashboard' },
  { name: 'Waivers',  icon: ClipboardList,    route: 'AdminWaivers' },
  { name: 'Batches',  icon: Users,            route: 'ManageBatches' },
  { name: 'Reports',  icon: BarChart3,        route: 'StudentAnalytics' },
  { name: 'Settings', icon: Settings,         route: 'AdminSettings' },
];

export default function AdminBottomNav({ navigation, active }) {
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
            <tab.icon size={20} color={active === tab.name ? GOLD : '#aab0be'} />
          </View>
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
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 20, marginBottom: 3, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: '#aab0be', fontWeight: '500' },
  tabLabelActive: { color: GOLD, fontWeight: '700' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD, marginTop: 2 },
});