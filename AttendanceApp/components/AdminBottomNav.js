import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const GOLD = '#b07d00';

const tabs = [
  { name: 'Home',     icon: '⊞',  route: 'AdminDashboard' },
  { name: 'Waivers',  icon: '📋',  route: 'AdminWaivers' },
  { name: 'Reports',  icon: '📊',  route: 'StudentAnalytics' },
  { name: 'Settings', icon: '⚙️',  route: 'AdminSettings' },
];

export default function AdminBottomNav({ navigation, active }) {
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