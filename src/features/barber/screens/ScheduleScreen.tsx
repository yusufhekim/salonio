import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { generateAvailableSlots } from '../../availability/services';
import { useBookingStore } from '@store';

export default function ScheduleScreen() {
  const todayStr = new Date().toISOString().split('T')[0];
  const allSlots = generateAvailableSlots('placeholder-barber', todayStr);
  const appointments = useBookingStore((s) => s.appointments);

  const getSlotInfo = (slot: string) => {
    const appt = appointments.find((a) => a.timeSlot === slot && a.date === todayStr);
    if (appt?.status === 'booked') return { status: 'booked' as const, appointment: appt };
    if (appt?.status === 'cancelled') return { status: 'cancelled' as const, appointment: appt };
    return { status: 'empty' as const, appointment: null };
  };

  const handleSlotPress = (slot: string) => {
    const info = getSlotInfo(slot);

    if (info.status === 'booked' && info.appointment) {
      Alert.alert(
        'Randevu Detayı',
        `Saat: ${slot}\nMüşteri: ${info.appointment.customerId}\nDurum: Aktif`,
        [
          { text: 'Kapat', style: 'cancel' },
          {
            text: 'İptal Et',
            style: 'destructive',
            onPress: () => {
              useBookingStore.getState().cancelAppointment(info.appointment!.id);
              Alert.alert('Bilgi', 'Randevu iptal edildi.');
            },
          },
        ]
      );
    } else if (info.status === 'empty') {
      Alert.alert('Boş Saat', `${slot} saati müsait.\nBu özellik henüz aktif değil.`);
    } else {
      Alert.alert('İptal Edilmiş', `${slot} saati daha önce iptal edilmiş.`);
    }
  };

  const bookedCount = appointments.filter(
    (a) => a.date === todayStr && a.status === 'booked'
  ).length;
  const emptyCount = allSlots.length - bookedCount;

  const renderSlot = ({ item }: { item: string }) => {
    const info = getSlotInfo(item);

    return (
      <TouchableOpacity
        style={[
          styles.slotCard,
          info.status === 'booked' && styles.slotBooked,
          info.status === 'cancelled' && styles.slotCancelled,
        ]}
        onPress={() => handleSlotPress(item)}
      >
        <Text
          style={[
            styles.slotTime,
            info.status === 'booked' && styles.slotTimeBooked,
            info.status === 'cancelled' && styles.slotTimeCancelled,
          ]}
        >
          {item}
        </Text>
        <Text
          style={[
            styles.slotStatus,
            info.status === 'booked' && styles.slotStatusBooked,
            info.status === 'cancelled' && styles.slotStatusCancelled,
          ]}
        >
          {info.status === 'booked'
            ? 'Dolu'
            : info.status === 'cancelled'
            ? 'İptal'
            : 'Müsait'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Takvim</Text>
      <Text style={styles.date}>{todayStr}</Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, styles.summaryBooked]}>
          <Text style={styles.summaryNumber}>{bookedCount}</Text>
          <Text style={styles.summaryLabel}>Dolu</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryEmpty]}>
          <Text style={styles.summaryNumber}>{emptyCount}</Text>
          <Text style={styles.summaryLabel}>Müsait</Text>
        </View>
      </View>

      <FlatList
        data={allSlots}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        renderItem={renderSlot}
        extraData={appointments}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryBooked: {
    backgroundColor: '#EFF6FF',
  },
  summaryEmpty: {
    backgroundColor: '#F0FDF4',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  list: {
    paddingBottom: 20,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  slotBooked: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  slotCancelled: {
    borderColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  slotTimeBooked: {
    color: '#2563EB',
  },
  slotTimeCancelled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  slotStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  slotStatusBooked: {
    color: '#2563EB',
  },
  slotStatusCancelled: {
    color: '#9CA3AF',
  },
});
