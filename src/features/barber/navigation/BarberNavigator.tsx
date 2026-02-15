import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen, ScheduleScreen, BarberProfileScreen } from '../screens';

const Tab = createBottomTabNavigator();

export default function BarberNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Kontrol Paneli' }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Takvim' }}
      />
      <Tab.Screen
        name="Profile"
        component={BarberProfileScreen}
        options={{ title: 'Profilim' }}
      />
    </Tab.Navigator>
  );
}
