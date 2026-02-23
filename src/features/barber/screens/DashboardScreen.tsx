import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useBookingStore } from '@store';
import { useAuth } from '../../../context/AuthContext';
import {
  getAppointmentsByBarber,
  cancelAppointmentInFirestore,
} from '../../../services/appointmentService';
import type { Appointment } from '@domain/appointment';

export default function DashboardScreen() {
  const { user } = useAuth();
  const appointments = useBookingStore((s) => s.appointments);
  const setAppointments = useBookingStore((s) => s.setAppointments);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    getAppointmentsByBarber(uid)
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, [user?.uid, setAppointments]);

  const bookedCount = appointments.filter((a) => a.status === 'booked').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(
    (a) => a.date === todayStr && a.status === 'booked'
  );

  const handleAction = (appointment: Appointment) => {
    Alert.alert(
      'Randevu İşlemleri',
      `${appointment.timeSlot} randevusu için ne yapmak istersiniz?`,
      [
        { text: 'Kapat', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointmentInFirestore(appointment.id);
              if (user?.uid) {
                const list = await getAppointmentsByBarber(user.uid);
                setAppointments(list);
              }
              Alert.alert('Bilgi', 'Randevu iptal edildi.');
            } catch (_e) {
              Alert.alert('Hata', 'Randevu iptal edilemedi.');
            }
          },
        },
        {
          text: 'Tamamlandı',
          onPress: () => {
            Alert.alert('Bilgi', 'Bu özellik henüz aktif değil.');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Randevular yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kontrol Paneli</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statActive]}>
          <Text style={styles.statNumber}>{bookedCount}</Text>
          <Text style={styles.statLabel}>Aktif Randevu</Text>
        </View>
        <View style={[styles.statCard, styles.statCancelled]}>
          <Text style={styles.statNumber}>{cancelledCount}</Text>
          <Text style={styles.statLabel}>İptal Edilen</Text>
        </View>
        <View style={[styles.statCard, styles.statToday]}>
          <Text style={styles.statNumber}>{todayAppointments.length}</Text>
          <Text style={styles.statLabel}>Bugün</Text>
        </View>
      </View>

      {/* Today's appointments */}
      <Text style={styles.sectionTitle}>Bugünkü Randevular</Text>

      {todayAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bugün için randevu bulunmuyor.</Text>
        </View>
      ) : (
        <FlatList
          data={todayAppointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.appointmentCard}
              onPress={() => handleAction(item)}
            >
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentSlot}>{item.timeSlot}</Text>
                <Text style={styles.appointmentCustomer}>
                  Müşteri: {item.customerId}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Aktif</Text>
              </View>
            </TouchableOpacity>
          )}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statActive: {
    backgroundColor: '#EFF6FF',
  },
  statCancelled: {
    backgroundColor: '#FEF2F2',
  },
  statToday: {
    backgroundColor: '#F0FDF4',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  list: {
    paddingBottom: 20,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentSlot: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  appointmentCustomer: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
});
