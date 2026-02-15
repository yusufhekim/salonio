import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateAvailableSlots, checkConflict } from '../../availability/services';
import { cancelAppointment } from '../services';
import { useBookingStore, useCustomerStore } from '@store';
import type { BookingStackParamList } from '../../customer/navigation/CustomerNavigator';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SlotPickerMain'>;

/** Same customer id used when creating appointments (BookingFlowScreen) */
const CURRENT_CUSTOMER_ID = 'placeholder-customer';

/** Generate next N days as { label, value } for date chips */
function getNextDays(count: number): { label: string; value: string }[] {
  const days: { label: string; value: string }[] = [];
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    const day = d.getDate();
    const label = i === 0 ? `Bugün (${day})` : `${dayName} (${day})`;
    days.push({ label, value });
  }

  return days;
}

export default function SlotPickerScreen() {
  const navigation = useNavigation<NavProp>();
  const selectedKuafor = useCustomerStore((s) => s.selectedKuafor);
  const dateOptions = useMemo(() => getNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const appointments = useBookingStore((s) => s.appointments);
  const bookedForDate = appointments.filter(
    (a) => a.status === 'booked' && a.date === selectedDate
  );

  useEffect(() => {
    if (!selectedKuafor) return;
    const available = generateAvailableSlots(selectedKuafor.id, selectedDate);
    setSlots(available);
    setSelectedSlot(null);
  }, [selectedDate, selectedKuafor]);

  const getSlotStatus = (slot: string): 'available' | 'booked' | 'cancelled' => {
    const appt = appointments.find(
      (a) => a.timeSlot === slot && a.date === selectedDate && a.barberId === selectedKuafor?.id
    );
    if (appt?.status === 'booked') return 'booked';
    if (appt?.status === 'cancelled') return 'cancelled';
    return 'available';
  };

  /** Customer's booked appointment on selected date (any Kuaför) – at most one per day */
  const existingBookedOnDate = appointments.find(
    (a) =>
      a.customerId === CURRENT_CUSTOMER_ID &&
      a.date === selectedDate &&
      a.status === 'booked'
  );

  /** Same-day booking exists with a different Kuaför → show warning, hide slot picker */
  const showOnePerDayWarning =
    !!selectedKuafor &&
    !!existingBookedOnDate &&
    existingBookedOnDate.barberId !== selectedKuafor.id;

  const handleSelectSlot = async (slot: string) => {
    const status = getSlotStatus(slot);

    if (status === 'booked') {
      const appt = appointments.find(
        (a) => a.timeSlot === slot && a.date === selectedDate && a.status === 'booked'
      );
      Alert.alert(
        'Randevu Mevcut',
        `${slot} saati için zaten randevunuz var.\nİptal etmek ister misiniz?`,
        [
          { text: 'Hayır', style: 'cancel' },
          {
            text: 'İptal Et',
            style: 'destructive',
            onPress: async () => {
              if (appt) {
                await cancelAppointment(appt.id);
                setSelectedSlot(null);
              }
            },
          },
        ]
      );
      return;
    }

    if (checkConflict(bookedForDate, slot)) {
      Alert.alert('Seçtiğiniz zaman dolu', `${slot} saati başka bir randevu ile çakışıyor.`);
      return;
    }

    setSelectedSlot(slot);
    navigation.navigate('BookingFlow', {
      slot,
      date: selectedDate,
      barberId: selectedKuafor?.id ?? 'placeholder-kuafor',
      kuaforName: selectedKuafor?.name ?? 'Kuaför',
    });
  };

  const renderSlot = ({ item }: { item: string }) => {
    const status = getSlotStatus(item);

    return (
      <TouchableOpacity
        style={[
          styles.slotButton,
          status === 'booked' && styles.slotButtonBooked,
          status === 'cancelled' && styles.slotButtonCancelled,
          selectedSlot === item && status === 'available' && styles.slotButtonSelected,
        ]}
        onPress={() => handleSelectSlot(item)}
      >
        <Text
          style={[
            styles.slotText,
            status === 'booked' && styles.slotTextBooked,
            status === 'cancelled' && styles.slotTextCancelled,
            selectedSlot === item && status === 'available' && styles.slotTextSelected,
          ]}
        >
          {item}
        </Text>
        {status === 'booked' && <Text style={styles.statusLabel}>Rezerve</Text>}
        {status === 'cancelled' && <Text style={styles.statusLabelCancelled}>İptal</Text>}
      </TouchableOpacity>
    );
  };

  /* ─── No kuaför selected: show warning ─── */
  if (!selectedKuafor) {
    return (
      <View style={styles.container}>
        <View style={styles.warningContainer}>
          <Text style={styles.warningIcon}>⚠</Text>
          <Text style={styles.warningText}>
            Lütfen anasayfadan bir Kuaför seçiniz.
          </Text>
        </View>
      </View>
    );
  }

  /* ─── Kuaför selected: full booking UI ─── */
  return (
    <View style={styles.container}>
      {/* Kuaför header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {selectedKuafor.name} için randevu oluştur
        </Text>
      </View>

      {/* Date picker */}
      <Text style={styles.subtitle}>Tarih seçin:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {dateOptions.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
            onPress={() => setSelectedDate(d.value)}
          >
            <Text
              style={[
                styles.dateChipText,
                selectedDate === d.value && styles.dateChipTextActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selected date info */}
      <View style={styles.dateInfoRow}>
        <Text style={styles.dateInfoLabel}>Seçili tarih:</Text>
        <Text style={styles.dateInfoValue}>{selectedDate}</Text>
      </View>

      {/* Single appointment per day: hide slots when customer has booking with another Kuaför on this date */}
      {showOnePerDayWarning ? (
        <View style={styles.onePerDayWarningBox}>
          <Text style={styles.onePerDayWarningIcon}>⚠</Text>
          <Text style={styles.onePerDayWarningText}>
            Bu gün zaten bir randevunuz var: {existingBookedOnDate?.barberName ?? 'Kuaför'}. Önce
            mevcut randevunuzu iptal edip sonra başka bir kuaförden randevu seçebilirsiniz.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>Uygun saatleri seçin:</Text>
          <FlatList
            data={slots}
            numColumns={2}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            renderItem={renderSlot}
            extraData={[appointments, selectedSlot, selectedDate]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  /* ── warning (no kuaför) ── */
  warningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  /* ── header ── */
  headerRow: {
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  /* ── rest ── */
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  dateChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  dateChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  dateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  dateInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 6,
  },
  dateInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  grid: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  slotButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  slotButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  slotButtonBooked: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  slotButtonCancelled: {
    borderColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  slotTextSelected: {
    color: '#2563EB',
  },
  slotTextBooked: {
    color: '#16A34A',
  },
  slotTextCancelled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#16A34A',
    marginTop: 2,
  },
  statusLabelCancelled: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },
  /* ── one appointment per day warning ── */
  onePerDayWarningBox: {
    marginTop: 8,
    padding: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  onePerDayWarningIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  onePerDayWarningText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
});
