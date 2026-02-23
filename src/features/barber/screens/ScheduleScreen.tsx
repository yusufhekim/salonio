import { useBarberStore, useBookingStore, type WorkingDayKey } from "@store";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { generateSlotsFromWorkingHours } from "../../availability/services";
import { useAuth } from "../../../context/AuthContext";
import { getUserProfile } from "../../../services/authService";
import {
  getAppointmentsByBarber,
  cancelAppointmentInFirestore,
} from "../../../services/appointmentService";

/** getDay() index → store key. */
const WEEKDAY_MAP: Record<number, WorkingDayKey> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/** Generate next N days as { label, value }. Value is local date (YYYY-MM-DD). */
function getNextDays(count: number): { label: string; value: string }[] {
  const days: { label: string; value: string }[] = [];
  const dayNames = [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ];

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const value = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayName = dayNames[d.getDay()];
    const label = i === 0 ? `Bugün (${day})` : `${dayName} (${day})`;
    days.push({ label, value });
  }

  return days;
}

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear(),
    m = d.getMonth() + 1,
    day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const setScheduleFromFirestore = useBarberStore(
    (s) => s.setScheduleFromFirestore
  );
  const dateOptions = useMemo(() => getNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(getTodayString);

  const profile = useBarberStore((s) => s.profile);
  const workingDays = profile.workingDays;
  const workingHours = profile.workingHours;
  const dayOffDates = useBarberStore((s) => s.dayOffDates);
  const appointments = useBookingStore((s) => s.appointments);
  const setAppointments = useBookingStore((s) => s.setAppointments);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  /** Hydrate barber store from Firestore when Takvim opens (so data is current even if Profil was not opened first). */
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    getUserProfile(uid).then((data) => {
      if (data) {
        setScheduleFromFirestore({
          workingDays: data.workingDays,
          workingHours: data.workingHours,
          dayOffDates: data.dayOffDates,
        });
      }
    });
  }, [user?.uid, setScheduleFromFirestore]);

  /** Load barber's appointments from Firestore. */
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setAppointmentsLoading(false);
      return;
    }
    getAppointmentsByBarber(uid)
      .then(setAppointments)
      .finally(() => setAppointmentsLoading(false));
  }, [user?.uid, setAppointments]);

  /** Local date from selectedDate (no UTC). */
  const localDate = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }, [selectedDate]);

  const weekdayKey = WEEKDAY_MAP[localDate.getDay()];
  const barberWorksOnDay = workingDays[weekdayKey];
  const dayHours = barberWorksOnDay ? workingHours[weekdayKey] : null;
  const hasValidHours =
    dayHours &&
    dayHours.start &&
    dayHours.end &&
    !(dayHours.start === "00:00" && dayHours.end === "00:00");

  /** Slot list: profil yoksa/geçerli değilse 09:00–18:00, yoksa çalışma saatlerine göre. */
  const allSlots = useMemo(() => {
    if (dayOffDates.includes(selectedDate)) return [];
    if (!barberWorksOnDay) return [];
    if (!hasValidHours || !dayHours)
      return generateSlotsFromWorkingHours("09:00", "18:00", 60);

    const duration = dayHours.duration ?? 60;
    return generateSlotsFromWorkingHours(
      dayHours.start,
      dayHours.end,
      duration,
      dayHours.breakStart ?? null,
      dayHours.breakEnd ?? null
    );
  }, [
    selectedDate,
    dayOffDates,
    barberWorksOnDay,
    hasValidHours,
    dayHours,
  ]);

  const getSlotInfo = (slot: string) => {
    const booked = appointments.find(
      (a) =>
        a.timeSlot === slot &&
        a.date === selectedDate &&
        a.status === "booked"
    );
    if (booked) return { status: "booked" as const, appointment: booked };
    const cancelled = appointments.find(
      (a) =>
        a.timeSlot === slot &&
        a.date === selectedDate &&
        a.status === "cancelled"
    );
    if (cancelled)
      return { status: "cancelled" as const, appointment: cancelled };
    return { status: "empty" as const, appointment: null };
  };

  const handleSlotPress = (slot: string) => {
    const info = getSlotInfo(slot);

    if (info.status === "booked" && info.appointment) {
      Alert.alert(
        "Randevu Detayı",
        `Saat: ${slot}\nMüşteri: ${info.appointment.customerId}\nDurum: Aktif`,
        [
          { text: "Kapat", style: "cancel" },
          {
            text: "İptal Et",
            style: "destructive",
            onPress: async () => {
              const appt = info.appointment!;
              try {
                await cancelAppointmentInFirestore(appt.id);
                const uid = user?.uid;
                if (uid) {
                  const list = await getAppointmentsByBarber(uid);
                  setAppointments(list);
                }
                Alert.alert("Bilgi", "Randevu iptal edildi.");
              } catch (_e) {
                Alert.alert("Hata", "Randevu iptal edilemedi.");
              }
            },
          },
        ]
      );
    } else if (info.status === "empty") {
      Alert.alert(
        "Boş Saat",
        `${slot} saati müsait.\nBu özellik henüz aktif değil.`
      );
    } else {
      Alert.alert("İptal Edilmiş", `${slot} saati daha önce iptal edilmiş.`);
    }
  };

  const appointmentsOnSelectedDate = appointments.filter(
    (a) => a.date === selectedDate && a.status === "booked"
  );
  const bookedCount = appointmentsOnSelectedDate.length;
  const emptyCount = allSlots.length - bookedCount;

  const renderSlot = ({ item }: { item: string }) => {
    const info = getSlotInfo(item);
    const isCancelled = info.status === "cancelled";
    const isBooked = info.status === "booked";

    return (
      <TouchableOpacity
        style={[
          styles.slotCard,
          isBooked && styles.slotBooked,
          isCancelled && styles.slotCancelledAsAvailable,
        ]}
        onPress={() => handleSlotPress(item)}
      >
        <Text
          style={[
            styles.slotTime,
            isBooked && styles.slotTimeBooked,
          ]}
        >
          {item}
        </Text>
        <View style={styles.slotStatusWrap}>
          <Text
            style={[
              styles.slotStatus,
              isBooked && styles.slotStatusBooked,
            ]}
          >
            {isBooked ? "Dolu" : "Müsait"}
          </Text>
          {isCancelled && (
            <Text style={styles.slotCancelledNote}>İptal edildi</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const showEmptyMessage =
    dayOffDates.includes(selectedDate) ||
    (barberWorksOnDay === false && allSlots.length === 0);
  const emptyMessage = dayOffDates.includes(selectedDate)
    ? "Bu tarihte izinlisiniz."
    : !barberWorksOnDay
      ? "Bu gün çalışmıyorsunuz."
      : null;

  /** Seçilen günde mola var mı (Profil'de kaydedilen mola saatleri). */
  const hasBreak =
    dayHours?.breakStart &&
    dayHours?.breakEnd &&
    dayHours.breakStart !== dayHours.breakEnd;
  const breakLabel = hasBreak
    ? `Mola: ${dayHours!.breakStart} - ${dayHours!.breakEnd}`
    : null;

  if (appointmentsLoading) {
    return (
      <View style={[styles.container, styles.loadingWrap]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Randevular yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>Takvim</Text>

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
              style={[
                styles.dateChip,
                selectedDate === d.value && styles.dateChipActive,
              ]}
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

        <Text style={styles.date}>{selectedDate}</Text>

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
      </View>

      {showEmptyMessage && emptyMessage ? (
        <View style={styles.emptyMessageWrap}>
          <View style={styles.emptyMessageBox}>
            <Text style={styles.emptyMessageText}>{emptyMessage}</Text>
          </View>
        </View>
      ) : (
        <>
          {breakLabel ? (
            <View style={styles.breakBox}>
              <Text style={styles.breakLabel}>{breakLabel}</Text>
            </View>
          ) : null}
          <FlatList
          data={allSlots}
          keyExtractor={(item) => item}
          style={styles.slotList}
          contentContainerStyle={styles.list}
          renderItem={renderSlot}
          extraData={appointments}
        />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  /** Üst bölüm: küçülmez, gün chipleri hep okunaklı kalır. */
  headerSection: {
    flexShrink: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
    marginBottom: 8,
  },
  dateChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  dateChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    minWidth: 90,
  },
  dateChipActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  dateChipTextActive: {
    color: "#2563EB",
  },
  slotList: {
    flex: 1,
  },
  emptyMessageWrap: {
    flex: 1,
  },
  breakBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  breakLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  date: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  summaryBooked: {
    backgroundColor: "#EFF6FF",
  },
  summaryEmpty: {
    backgroundColor: "#F0FDF4",
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },
  emptyMessageBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    alignItems: "center",
  },
  emptyMessageText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },
  list: {
    paddingBottom: 20,
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  slotBooked: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  slotCancelled: {
    borderColor: "#9CA3AF",
    backgroundColor: "#F3F4F6",
  },
  slotCancelledAsAvailable: {},
  slotStatusWrap: {
    alignItems: "flex-end",
  },
  slotCancelledNote: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
    fontStyle: "italic",
  },
  slotTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  slotTimeBooked: {
    color: "#2563EB",
  },
  slotTimeCancelled: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  slotStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
  },
  slotStatusBooked: {
    color: "#2563EB",
  },
  slotStatusCancelled: {
    color: "#9CA3AF",
  },
});
