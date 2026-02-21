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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateAvailableSlots, generateSlotsFromWorkingHours, checkConflict } from '../../availability/services';
import { useBookingStore, useCustomerStore, useBarberStore, type WorkingDayKey } from '@store';
import type { BookingStackParamList } from '../../customer/navigation/CustomerNavigator';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SlotPickerMain'>;

/** Same customer id used when creating appointments (BookingFlowScreen) */
const CURRENT_CUSTOMER_ID = 'placeholder-customer';

/** getDay() index → store key. Use only this for workingDays / workingHours lookups. */
const WEEKDAY_MAP: Record<number, WorkingDayKey> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/** Generate next N days as { label, value } for date chips. Value is local date (YYYY-MM-DD). */
function getNextDays(count: number): { label: string; value: string }[] {
  const days: { label: string; value: string }[] = [];
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const value = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayName = dayNames[d.getDay()];
    const label = i === 0 ? `Bugün (${day})` : `${dayName} (${day})`;
    days.push({ label, value });
  }

  return days;
}

/** True if the slot start time is before now. Uses localDate + setHours/setMinutes to avoid UTC string parsing. */
function isSlotInPast(localDate: Date, timeSlot: string): boolean {
  const [startTime] = timeSlot.split('-').map((s) => s.trim());
  const [hour, min] = startTime.split(':').map(Number);
  const slotDateTime = new Date(localDate.getTime());
  slotDateTime.setHours(hour, min, 0, 0);
  return slotDateTime.getTime() < Date.now();
}

export default function SlotPickerScreen() {
  const navigation = useNavigation<NavProp>();
  const selectedKuafor = useCustomerStore((s) => s.selectedKuafor);
  const dateOptions = useMemo(() => getNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const appointments = useBookingStore((s) => s.appointments);
  const selectedBarber = useBookingStore((s) => s.selectedBarber);
  const hasAppointmentOnDate = useBookingStore((s) => s.hasAppointmentOnDate);
  const cancelAppointmentInStore = useBookingStore((s) => s.cancelAppointment);
  const barberProfile = useBarberStore((s) => s.profile);
  const dayOffDates = useBarberStore((s) => s.dayOffDates);
  /** Only booked appointments on selected date — used for conflict check and slot blocking. Cancelled are removed from store. */
  const appointmentsOnSelectedDate = appointments.filter((a) => a.date === selectedDate);
  const bookedForDate = appointmentsOnSelectedDate.filter((a) => a.status === 'booked');

  /** Single local date from selectedDate (no UTC string parsing). Used for weekday and slot past check. */
  const localDate = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }, [selectedDate]);

  const weekdayKey = WEEKDAY_MAP[localDate.getDay()];
  const isSameBarber = selectedBarber?.id === barberProfile.kuaforId;
  const workingDays = isSameBarber ? barberProfile.workingDays : null;
  const workingHoursMap = isSameBarber ? barberProfile.workingHours : null;
  /** Step 1: workingDays[weekdayKey] — if false, do not generate slots or show booking. */
  const barberWorksOnSelectedDay = workingDays ? workingDays[weekdayKey] : true;
  /** Step 2: only after working day is true, get hours for this weekday. */
  const dayHours = barberWorksOnSelectedDay ? workingHoursMap?.[weekdayKey] : null;
  /** Hours are valid when both start and end are set and not the "unset" default 00:00–00:00. */
  const hasValidHours =
    dayHours &&
    dayHours.start &&
    dayHours.end &&
    !(dayHours.start === '00:00' && dayHours.end === '00:00');

  /** Date-based day off: when same barber and selectedDate is in barber's dayOffDates, no slots. */
  const isDayOff =
    isSameBarber && dayOffDates.includes(selectedDate);

  useEffect(() => {
    if (!selectedKuafor) return;
    if (isSameBarber && dayOffDates.includes(selectedDate)) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    if (barberWorksOnSelectedDay && hasValidHours && dayHours) {
      const durationMinutes = dayHours.duration ?? 60;
      setSlots(
        generateSlotsFromWorkingHours(
          dayHours.start,
          dayHours.end,
          durationMinutes,
          dayHours.breakStart ?? null,
          dayHours.breakEnd ?? null
        )
      );
    } else {
      setSlots(generateAvailableSlots(selectedKuafor.id, selectedDate));
    }
    setSelectedSlot(null);
  }, [
    selectedDate,
    selectedKuafor,
    isSameBarber,
    dayOffDates,
    barberWorksOnSelectedDay,
    hasValidHours,
    dayHours,
  ]);

  /** Slot status from appointments array only. Do not disable for cancelled (removed from store) or past (handled by isSlotInPast). */
  const getSlotStatus = (slot: string): 'available' | 'booked' | 'past' => {
    if (isSlotInPast(localDate, slot)) return 'past';
    const bookedAppt = appointmentsOnSelectedDate.find(
      (a) =>
        a.status === 'booked' &&
        a.timeSlot === slot &&
        a.barberId === selectedKuafor?.id
    );
    if (bookedAppt) return 'booked';
    return 'available';
  };

  /** Same day: only one appointment allowed. If customer has any booked appointment on selectedDate, block new booking. */
  const hasExistingOnDate = hasAppointmentOnDate(selectedDate);

  const handleSelectSlot = (slot: string) => {
    const status = getSlotStatus(slot);
    if (status === 'past') {
      return;
    }

    if (hasExistingOnDate) {
      Alert.alert(
        'Uyarı',
        'Aynı gün içerisinde yalnızca 1 randevu oluşturabilirsiniz. Önce mevcut randevunuzu iptal etmelisiniz.'
      );
      return;
    }

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
            onPress: () => {
              if (appt) {
                cancelAppointmentInStore(appt.id);
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
    const isDisabled = status === 'past';

    return (
      <TouchableOpacity
        style={[
          styles.slotButton,
          status === 'booked' && styles.slotButtonBooked,
          status === 'past' && styles.slotButtonPast,
          selectedSlot === item && status === 'available' && styles.slotButtonSelected,
        ]}
        onPress={() => handleSelectSlot(item)}
        disabled={isDisabled}
      >
        <Text
          style={[
            styles.slotText,
            status === 'booked' && styles.slotTextBooked,
            status === 'past' && styles.slotTextPast,
            selectedSlot === item && status === 'available' && styles.slotTextSelected,
          ]}
        >
          {item}
        </Text>
        {status === 'booked' && <Text style={styles.statusLabel}>Rezerve</Text>}
        {status === 'past' && <Text style={styles.statusLabelPast}>Geçti</Text>}
      </TouchableOpacity>
    );
  };

  /* ─── No kuaför selected: show warning ─── */
  if (!selectedKuafor) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠</Text>
            <Text style={styles.warningText}>
              Lütfen anasayfadan bir Kuaför seçiniz.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Kuaför selected: full booking UI ─── */
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          {/* Kuaför header */}
          <View style={styles.headerRow}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedKuafor.name} için randevu oluştur
            </Text>
          </View>

          {/* Date picker */}
          <Text style={styles.subtitle}>Tarih seçin:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
            style={styles.dateChipsScroll}
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
                  numberOfLines={1}
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
        </View>

        <View style={styles.slotsSection}>
      {/* Step 0: date-based day off → no slots, no booking */}
      {isDayOff ? (
        <View style={styles.onePerDayWarningBox}>
          <Text style={styles.onePerDayWarningIcon}>⚠</Text>
          <Text style={styles.onePerDayWarningText}>
            Kuaför bu tarihte izinlidir.
          </Text>
        </View>
      ) : !barberWorksOnSelectedDay ? (
        <View style={styles.onePerDayWarningBox}>
          <Text style={styles.onePerDayWarningIcon}>⚠</Text>
          <Text style={styles.onePerDayWarningText}>
            Seçtiğiniz gün için kuaför çalışmamaktadır.
          </Text>
        </View>
      ) : !hasValidHours ? (
        <View style={styles.onePerDayWarningBox}>
          <Text style={styles.onePerDayWarningIcon}>⚠</Text>
          <Text style={styles.onePerDayWarningText}>
            Kuaför bu gün için çalışma saatlerini ayarlamamıştır.
          </Text>
        </View>
      ) : hasExistingOnDate ? (
        <View style={styles.onePerDayWarningBox}>
          <Text style={styles.onePerDayWarningIcon}>⚠</Text>
          <Text style={styles.onePerDayWarningText}>
            Aynı gün içerisinde yalnızca 1 randevu oluşturabilirsiniz. Önce mevcut randevunuzu
            iptal etmelisiniz.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>Uygun saatleri seçin:</Text>
          <FlatList
            data={slots}
            numColumns={2}
            keyExtractor={(item) => item}
            style={styles.slotList}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            renderItem={renderSlot}
            extraData={[appointments, selectedSlot, selectedDate]}
          />
        </>
      )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
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
  /* ── header: küçülmez, gün chipleri hep okunaklı ── */
  headerSection: {
    flexShrink: 0,
  },
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
  dateChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
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
    minWidth: 90,
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
  slotsSection: {
    flex: 1,
  },
  slotList: {
    flex: 1,
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
  slotButtonPast: {
    borderColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    opacity: 0.8,
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
  slotTextPast: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#16A34A',
    marginTop: 2,
  },
  statusLabelPast: {
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
