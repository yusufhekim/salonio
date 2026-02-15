import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen, ProfileScreen } from '../screens';
import {
  MyAppointmentsScreen,
  SlotPickerScreen,
  BookingFlowScreen,
} from '../../appointment/screens';

// Stack inside the "Randevu Al" tab for SlotPicker → BookingFlow navigation
export type BookingStackParamList = {
  SlotPickerMain: undefined;
  BookingFlow: { slot: string; date: string; barberId: string; kuaforName: string };
};

const BookingStack = createNativeStackNavigator<BookingStackParamList>();

function BookingStackNavigator() {
  return (
    <BookingStack.Navigator screenOptions={{ headerShown: false }}>
      <BookingStack.Screen name="SlotPickerMain" component={SlotPickerScreen} />
      <BookingStack.Screen
        name="BookingFlow"
        component={BookingFlowScreen}
        options={{ headerShown: true, title: 'Randevu Onayla', headerBackTitle: 'Geri' }}
      />
    </BookingStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export default function CustomerNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Anasayfa' }}
      />
      <Tab.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: 'Randevularım' }}
      />
      <Tab.Screen
        name="SlotPicker"
        component={BookingStackNavigator}
        options={{ title: 'Randevu Al', headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profilim' }}
      />
    </Tab.Navigator>
  );
}
