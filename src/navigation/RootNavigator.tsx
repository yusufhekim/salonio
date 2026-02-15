import React from 'react';
import { useAuthStore } from '@store';
import AuthNavigator from './AuthNavigator';
import { CustomerNavigator } from '../features/customer/navigation';
import { BarberNavigator } from '../features/barber/navigation';

export default function RootNavigator() {
  const role = useAuthStore((state) => state.role);

  switch (role) {
    case 'customer':
      return <CustomerNavigator />;
    case 'barber':
      return <BarberNavigator />;
    default:
      return <AuthNavigator />;
  }
}
