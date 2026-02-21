import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarberNavigator } from '../features/barber/navigation';
import { CustomerNavigator } from '../features/customer/navigation';
import Login from '../pages/Login';
import Register from '../pages/Register';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="BarberHome" component={BarberNavigator} />
      <Stack.Screen name="CustomerHome" component={CustomerNavigator} />
    </Stack.Navigator>
  );
}
