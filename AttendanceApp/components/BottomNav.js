import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const BLUE = '#2952e3';

const tabs = [
  { name: 'Home',    icon: '⊞',  route: 'Home' },
  { name: 'History', icon: '🕐',  route: 'AttendanceHistory' },
  { name: 'Classes', icon: '🎓',  route: 'Classes' },
  { name: 'Profile', icon: '👤',  route: 'Profile' },
];

export default function BottomNav({ navigation, active }) {
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