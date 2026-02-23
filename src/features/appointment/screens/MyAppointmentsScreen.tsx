import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBookingStore } from '@store';
import { useAuth } from '../../../context/AuthContext';
import {
  getAppointmentsByCustomer,
  cancelAppointmentInFirestore,
  deleteAppointmentFromFirestore,
} from '../../../services/appointmentService';
import { getUserProfile } from '../../../services/authService';
import type { Appointment } from '@domain/appointment';

const STATUS_MAP: Record<Appointment['status'], { label: string; color: string }> = {
  booked: { label: 'Aktif', color: '#16A34A' },
  cancelled: { label: 'İptal Edildi', color: '#DC2626' },
  completed: { label: 'Tamamlandı', color: '#6B7280' },
};

export default function MyAppointmentsScreen() {
  const { user } = useAuth();
  const appointments = useBookingStore((s) => s.appointments);
  const setAppointments = useBookingStore((s) => s.setAppointments);
  const [loading, setLoading] = useState(true);
  const [barberNameByBarberId, setBarberNameByBarberId] = useState<Record<string, string>>({});

  const loadAppointments = useCallback(() => {
    const uid = user?.uid;
    if (!uid) {
      setLoading(false);
      setAppointments([]);
      setBarberNameByBarberId({});
      return;
    }
    setLoading(true);
    getAppointmentsByCustomer(uid)
      .then((list) => {
        setAppointments(list);
        const needName = list.filter(
          (a) => a.barberId && (!a.barberName || a.barberName === '' || String(a.barberName) === 'Kuaför')
        );
        const uniqueIds = [...new Set(needName.map((a) => a.barberId))];
        if (uniqueIds.length === 0) return;
        Promise.all(
          uniqueIds.map((id) =>
            getUserProfile(id).then((profile) => {
              const name = (profile as Record<string, unknown>)?.barberShopName as string | undefined;
              return { id, name: name && String(name).trim() ? String(name) : undefined };
            })
          )
        ).then((results) => {
          const map: Record<string, string> = {};
          results.forEach(({ id, name }) => {
            if (name) map[id] = name;
          });
          setBarberNameByBarberId((prev) => ({ ...prev, ...map }));
        });
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [user?.uid, setAppointments]);

  /** Sekme her odaklandığında Firestore'dan randevuları çek. */
  useFocusEffect(loadAppointments);

  /** Giriş yapıldığında (uid değişince) listeyi yeniden yükle; aynı sekmedeyken giriş yapılsa da güncellenir. */
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  /** Aktif (booked) randevular en üstte, en yakın tarih/saat önce; sonra iptal ve tamamlanan. */
  const sortedAppointments = useMemo(() => {
    const booked = appointments
      .filter((a) => a.status === 'booked')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.timeSlot < b.timeSlot ? -1 : 1;
      });
    const cancelled = appointments
      .filter((a) => a.status === 'cancelled')
      .sort((a, b) => {
        if (b.date !== a.date) return b.date > a.date ? 1 : -1;
        return b.timeSlot > a.timeSlot ? 1 : -1;
      });
    const completed = appointments
      .filter((a) => a.status === 'completed')
      .sort((a, b) => {
        if (b.date !== a.date) return b.date > a.date ? 1 : -1;
        return b.timeSlot > a.timeSlot ? 1 : -1;
      });
    return [...booked, ...cancelled, ...completed];
  }, [appointments]);

  const handleCancel = (appointmentId: string, timeSlot: string) => {
    Alert.alert(
      'Randevu İptal',
      `${timeSlot} randevunuzu iptal etmek istediğinize emin misiniz?`,
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            try {
              await cancelAppointmentInFirestore(appointmentId);
              const list = await getAppointmentsByCustomer(user.uid);
              setAppointments(list);
            } catch (_e) {
              Alert.alert('Hata', 'Randevu iptal edilemedi. Lütfen tekrar deneyin.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCancelled = (appointmentId: string) => {
    Alert.alert(
      'Randevuyu Sil',
      'İptal edilen bu randevuyu listeden kalıcı olarak silmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            try {
              await deleteAppointmentFromFirestore(appointmentId);
              const list = await getAppointmentsByCustomer(user.uid);
              setAppointments(list);
            } catch (_e) {
              Alert.alert('Hata', 'Randevu silinemedi. Lütfen tekrar deneyin.');
            }
          },
        },
      ]
    );
  };

  const barberDisplayName = (item: Appointment) => {
    const name = item.barberName;
    if (name != null && name !== '' && String(name) !== '0' && String(name) !== 'Kuaför')
      return String(name);
    if (item.barberId && barberNameByBarberId[item.barberId])
      return barberNameByBarberId[item.barberId];
    return 'Kuaför';
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const statusInfo = STATUS_MAP[item.status];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSlot}>{item.timeSlot}</Text>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.badge, { backgroundColor: statusInfo.color + '18' }]}>
              <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            {item.status === 'cancelled' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteCancelled(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.cardDate}>{item.date}</Text>
        <Text style={styles.cardBarber}>Kuaför: {barberDisplayName(item)}</Text>

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
          data={sortedAppointments}
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
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '700',
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
