import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { scheduleNotification } from '../../notification/services';
import { useBookingStore, useNotificationStore } from '@store';
import type { Appointment } from '@domain/appointment';
import type { BookingStackParamList } from '../../customer/navigation/CustomerNavigator';

type BookingFlowRoute = RouteProp<BookingStackParamList, 'BookingFlow'>;
type BookingFlowNav = NativeStackNavigationProp<BookingStackParamList, 'BookingFlow'>;

export default function BookingFlowScreen() {
  const route = useRoute<BookingFlowRoute>();
  const navigation = useNavigation<BookingFlowNav>();
  const { slot, date, barberId, kuaforName } = route.params;

  const addAppointment = useBookingStore((s) => s.addAppointment);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleConfirm = async () => {
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      customerId: 'placeholder-customer',
      barberId,
      barberName: kuaforName,
      date,
      timeSlot: slot,
      status: 'booked',
    };

    addAppointment(newAppointment);

    // Schedule a local notification in 10 seconds
    await scheduleNotification(
      'Randevu Hatırlatma',
      `${slot} randevunuz var.`,
      10
    );

    addNotification('Randevu Hatırlatma', `${slot} randevunuz var.`);

    Alert.alert(
      'Randevu Onaylandı!',
      `${slot} saati için randevunuz başarıyla oluşturuldu.\n10 saniye sonra hatırlatma alacaksınız.`,
      [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Randevu Özeti</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Saat:</Text>
          <Text style={styles.value}>{slot}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Tarih:</Text>
          <Text style={styles.value}>{date}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Kuaför:</Text>
          <Text style={styles.value}>{kuaforName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Durum:</Text>
          <Text style={[styles.value, styles.statusPending]}>Onay Bekliyor</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmText}>Randevuyu Onayla</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  statusPending: {
    color: '#D97706',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
