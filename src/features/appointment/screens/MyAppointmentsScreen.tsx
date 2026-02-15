import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useBookingStore } from '@store';
import { cancelAppointment } from '../services';
import type { Appointment } from '@domain/appointment';

const STATUS_MAP: Record<Appointment['status'], { label: string; color: string }> = {
  booked: { label: 'Aktif', color: '#16A34A' },
  cancelled: { label: 'İptal Edildi', color: '#DC2626' },
  completed: { label: 'Tamamlandı', color: '#6B7280' },
};

export default function MyAppointmentsScreen() {
  const appointments = useBookingStore((s) => s.appointments);

  const handleCancel = (appointmentId: string, timeSlot: string) => {
    Alert.alert(
      'Randevu İptal',
      `${timeSlot} randevunuzu iptal etmek istediğinize emin misiniz?`,
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: () => cancelAppointment(appointmentId),
        },
      ]
    );
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const statusInfo = STATUS_MAP[item.status];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSlot}>{item.timeSlot}</Text>
          <View style={[styles.badge, { backgroundColor: statusInfo.color + '18' }]}>
            <Text style={[styles.badgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.cardDate}>{item.date}</Text>
        <Text style={styles.cardBarber}>Kuaför: {item.barberName ?? 'Kuaför'}</Text>

        {item.status === 'booked' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(item.id, item.timeSlot)}
          >
            <Text style={styles.cancelText}>İptal Et</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Randevularım</Text>

      {appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz randevunuz bulunmuyor.</Text>
          <Text style={styles.emptySubtext}>
            Randevu Al sekmesinden yeni randevu oluşturabilirsiniz.
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderAppointment}
        />
      )}
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
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardSlot: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  cardBarber: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
