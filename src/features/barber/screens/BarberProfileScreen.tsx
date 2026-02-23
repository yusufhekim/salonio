import { signOut } from 'firebase/auth';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Switch,
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useBarberStore, type WorkingDayKey } from '@store';
import { useAuth } from '../../../context/AuthContext';
import { auth } from '../../../lib/firebase';
import { getUserProfile } from '../../../services/authService';
import { updateBarberProfile, updateBarberSchedule } from '../../../services/userService';
import {
  getIller,
  getIlceler,
  getMahalleler,
} from '../../../shared/constants/locationData';

/* ─── working days: order and Turkish labels ─── */
const WORKING_DAY_ORDER: WorkingDayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
const WORKING_DAY_LABELS: Record<WorkingDayKey, string> = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
};
/** Turkish label → store key. Use when a code path receives a label; call sites use key from WORKING_DAY_ORDER. */
const LABEL_TO_KEY_MAP: Record<string, WorkingDayKey> = {
  Pazartesi: 'monday',
  Salı: 'tuesday',
  Çarşamba: 'wednesday',
  Perşembe: 'thursday',
  Cuma: 'friday',
  Cumartesi: 'saturday',
  Pazar: 'sunday',
};

/** Time options for working hours picker (00:00 to 23:30, 30-min steps). */
function getTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    options.push(`${h.toString().padStart(2, '0')}:00`);
    options.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return options;
}
const TIME_OPTIONS = getTimeOptions();

const BREAK_NONE = '— Mola yok —';
const BREAK_OPTIONS = [BREAK_NONE, ...TIME_OPTIONS];

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isValidBreak(
  dayStart: string,
  dayEnd: string,
  breakStart: string | null,
  breakEnd: string | null
): boolean {
  if (!breakStart || !breakEnd) return true;
  const startM = timeToMins(dayStart);
  const endM = timeToMins(dayEnd);
  const bs = timeToMins(breakStart);
  const be = timeToMins(breakEnd);
  return bs > startM && be < endM && bs < be;
}

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatDayOffLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = d;
  const monthName = TURKISH_MONTHS[m - 1] ?? '';
  const year = y;
  return `${day.toString().padStart(2, '0')} ${monthName} ${year}`;
}

const YEAR_OPTIONS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

/** Sırayla ilk hatalı alana scroll için kullanılır. */
const BARBER_FIELD_ORDER = [
  'kuaforAdi',
  'adSoyad',
  'il',
  'ilce',
  'mahalle',
  'telefon',
  'email',
] as const;

/* ─── validation schema ─── */
const KuaforProfileSchema = Yup.object().shape({
  kuaforAdi: Yup.string().required('Kuaför Adı zorunludur'),
  adSoyad: Yup.string().required('Ad Soyad zorunludur'),
  il: Yup.string().required('İl seçimi zorunludur'),
  ilce: Yup.string().required('İlçe seçimi zorunludur'),
  mahalle: Yup.string().required('Mahalle seçimi zorunludur'),
  adres: Yup.string(),
  telefon: Yup.string()
    .required('Telefon zorunludur')
    .matches(/^05\d{9}$/, 'Geçerli bir telefon numarası giriniz (05XXXXXXXXX)'),
  email: Yup.string()
    .required('E-posta zorunludur')
    .email('Geçerli bir e-posta adresi giriniz'),
});

/* ─── dropdown component ─── */
function DropdownField({
  label,
  value,
  options,
  onSelect,
  placeholder,
  disabled,
  error,
  touched,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const showError = touched && !!error;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dropdown,
          disabled && styles.dropdownDisabled,
          showError && styles.fieldError,
        ]}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
      >
        <Text style={value ? styles.dropdownText : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      {showError && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label} Seçin</Text>
            <FlatList
              data={options}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, value === item && styles.modalItemSel]}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      value === item && styles.modalItemTextSel,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>Seçenek bulunamadı</Text>
              }
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setVisible(false)}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ─── main screen ─── */
export default function BarberProfileScreen() {
  const { user } = useAuth();
  const profile = useBarberStore((s) => s.profile);
  const updateProfile = useBarberStore((s) => s.updateProfile);
  const workingDays = useBarberStore((s) => s.profile.workingDays);
  const workingHours = useBarberStore((s) => s.profile.workingHours);
  const dayOffDates = useBarberStore((s) => s.dayOffDates);
  const addDayOff = useBarberStore((s) => s.addDayOff);
  const removeDayOff = useBarberStore((s) => s.removeDayOff);
  const setWorkingDay = useBarberStore((s) => s.setWorkingDay);
  const setWorkingHours = useBarberStore((s) => s.setWorkingHours);
  const setScheduleFromFirestore = useBarberStore((s) => s.setScheduleFromFirestore);
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [dayOffPickerVisible, setDayOffPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState('2026');
  const [pickerMonth, setPickerMonth] = useState('01');
  const [pickerDay, setPickerDay] = useState('01');
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldYRef = useRef<Record<string, number>>({});
  const submitAttemptedRef = useRef(false);

  useEffect(() => {
    const uid = user?.uid;
    if (uid) {
      getUserProfile(uid)
        .then((data) => {
          setFirestoreProfile(data);
          if (data) {
            setScheduleFromFirestore({
              workingDays: data.workingDays,
              workingHours: data.workingHours,
              dayOffDates: data.dayOffDates,
            });
          }
        })
        .finally(() => {
          setProfileLoading(false);
        });
    } else {
      setProfileLoading(false);
    }
  }, [user?.uid, setScheduleFromFirestore]);

  const saveFieldY = useCallback((fieldName: string) => (e: LayoutChangeEvent) => {
    fieldYRef.current[fieldName] = e.nativeEvent.layout.y;
  }, []);

  const initialValues = {
    kuaforAdi: firestoreProfile?.barberShopName ?? profile.kuaforAdi,
    adSoyad: firestoreProfile?.fullName ?? profile.adSoyad,
    il: firestoreProfile?.city ?? profile.il,
    ilce: firestoreProfile?.district ?? profile.ilce,
    mahalle: firestoreProfile?.neighborhood ?? profile.mahalle,
    adres: firestoreProfile?.address ?? profile.adres,
    telefon: firestoreProfile?.telefon ?? profile.telefon,
    email: firestoreProfile?.email ?? user?.email ?? profile.email,
  };

  const handleSave = useCallback(
    async (values: typeof initialValues) => {
      updateProfile(values);
      const uid = user?.uid;
      if (!uid) {
        Alert.alert('Başarılı', 'Bilgiler başarıyla güncellendi!');
        setEditing(false);
        return;
      }
      setSaveInProgress(true);
      try {
        await updateBarberProfile(uid, {
          barberShopName: values.kuaforAdi,
          fullName: values.adSoyad,
          city: values.il,
          district: values.ilce,
          neighborhood: values.mahalle,
          address: values.adres ?? '',
          email: values.email,
          telefon: values.telefon,
        });
        const state = useBarberStore.getState();
        await updateBarberSchedule(uid, {
          workingDays: state.profile.workingDays,
          workingHours: state.profile.workingHours,
          dayOffDates: state.dayOffDates,
        });
        const updated = await getUserProfile(uid);
        setFirestoreProfile(updated);
        Alert.alert('Başarılı', 'Bilgiler başarıyla güncellendi!');
        setEditing(false);
      } catch (_err) {
        Alert.alert(
          'Hata',
          'Bilgiler kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.'
        );
      } finally {
        setSaveInProgress(false);
      }
    },
    [updateProfile, user?.uid],
  );

  /* read-only row helper */
  const ReadOnlyRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.readOnlyBox}>
        <Text style={value ? styles.readOnlyText : styles.readOnlyMuted}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={KuaforProfileSchema}
      enableReinitialize
      onSubmit={handleSave}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        setFieldTouched,
        handleSubmit,
        resetForm,
      }) => {
        const selectIl = (v: string) => {
          setFieldValue('il', v);
          setFieldValue('ilce', '');
          setFieldValue('mahalle', '');
        };
        const selectIlce = (v: string) => {
          setFieldValue('ilce', v);
          setFieldValue('mahalle', '');
        };

        useEffect(() => {
          if (!submitAttemptedRef.current || Object.keys(errors).length === 0) return;
          const firstKey = BARBER_FIELD_ORDER.find((k) => errors[k]);
          if (!firstKey) return;
          const y = fieldYRef.current[firstKey];
          const scrollRef = scrollViewRef.current;
          if (scrollRef != null && typeof y === 'number') {
            scrollRef.scrollTo({ y: Math.max(0, y - 40), animated: true });
          }
          submitAttemptedRef.current = false;
        }, [errors]);

        return (
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Kuaför Profili</Text>

            {/* ══ READ-ONLY MODE ══ */}
            {!editing && (
              <>
                <ReadOnlyRow label="Kuaför Adı" value={values.kuaforAdi} />
                <ReadOnlyRow label="Ad Soyad" value={values.adSoyad} />

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Adres Bilgileri</Text>
                </View>
                <ReadOnlyRow label="İl" value={values.il} />
                <ReadOnlyRow label="İlçe" value={values.ilce} />
                <ReadOnlyRow label="Mahalle" value={values.mahalle} />
                <ReadOnlyRow label="Adres Satırı" value={values.adres} />

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
                </View>
                <ReadOnlyRow label="Telefon" value={values.telefon} />
                <ReadOnlyRow label="E-posta" value={values.email} />

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Çalışma Günleri</Text>
                </View>
                {WORKING_DAY_ORDER.map((day) => (
                  <View key={day} style={styles.workingDayRow}>
                    <Text style={styles.workingDayLabel}>{WORKING_DAY_LABELS[day]}</Text>
                    <Switch
                      value={workingDays[day]}
                      onValueChange={(value) => setWorkingDay(day, value)}
                    />
                  </View>
                ))}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>İzin Günleri</Text>
                </View>
                {dayOffDates.length === 0 ? (
                  <Text style={styles.readOnlyMuted}>İzin günü eklenmemiş</Text>
                ) : (
                  dayOffDates.map((date) => (
                    <View key={date} style={styles.dayOffRow}>
                      <Text style={styles.readOnlyText}>{formatDayOffLabel(date)}</Text>
                    </View>
                  ))
                )}

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditing(true)}
                >
                  <Text style={styles.editButtonText}>Düzenle</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ══ EDIT MODE ══ */}
            {editing && (
              <>
                {/* Kuaför Adı — first editable row */}
                <View
                  style={styles.fieldWrap}
                  onLayout={saveFieldY('kuaforAdi')}
                >
                  <Text style={styles.fieldLabel}>Kuaför Adı</Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.kuaforAdi && errors.kuaforAdi && styles.fieldError,
                    ]}
                    placeholder="Kuaför adını giriniz"
                    placeholderTextColor="#9CA3AF"
                    value={values.kuaforAdi}
                    onChangeText={handleChange('kuaforAdi')}
                    onBlur={handleBlur('kuaforAdi')}
                  />
                  {touched.kuaforAdi && errors.kuaforAdi && (
                    <Text style={styles.errorText}>{errors.kuaforAdi}</Text>
                  )}
                </View>

                {/* Ad Soyad */}
                <View
                  style={styles.fieldWrap}
                  onLayout={saveFieldY('adSoyad')}
                >
                  <Text style={styles.fieldLabel}>Ad Soyad</Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.adSoyad && errors.adSoyad && styles.fieldError,
                    ]}
                    placeholder="Ad Soyad giriniz"
                    placeholderTextColor="#9CA3AF"
                    value={values.adSoyad}
                    onChangeText={handleChange('adSoyad')}
                    onBlur={handleBlur('adSoyad')}
                  />
                  {touched.adSoyad && errors.adSoyad && (
                    <Text style={styles.errorText}>{errors.adSoyad}</Text>
                  )}
                </View>

                {/* ── address section ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Adres Bilgileri</Text>
                </View>

                <View onLayout={saveFieldY('il')}>
                  <DropdownField
                  label="İl"
                  value={values.il}
                  options={getIller()}
                  onSelect={(v) => {
                    selectIl(v);
                    setFieldTouched('il', true);
                  }}
                  placeholder="İl seçiniz"
                  error={errors.il}
                  touched={touched.il}
                />
                </View>

                <View onLayout={saveFieldY('ilce')}>
                  <DropdownField
                  label="İlçe"
                  value={values.ilce}
                  options={getIlceler(values.il)}
                  onSelect={(v) => {
                    selectIlce(v);
                    setFieldTouched('ilce', true);
                  }}
                  placeholder={values.il ? 'İlçe seçiniz' : 'Önce İl seçiniz'}
                  disabled={!values.il}
                  error={errors.ilce}
                  touched={touched.ilce}
                />
                </View>

                <View onLayout={saveFieldY('mahalle')}>
                  <DropdownField
                  label="Mahalle"
                  value={values.mahalle}
                  options={getMahalleler(values.il, values.ilce)}
                  onSelect={(v) => {
                    setFieldValue('mahalle', v);
                    setFieldTouched('mahalle', true);
                  }}
                  placeholder={values.ilce ? 'Mahalle seçiniz' : 'Önce İlçe seçiniz'}
                  disabled={!values.ilce}
                  error={errors.mahalle}
                  touched={touched.mahalle}
                />
                </View>

                {/* Adres satırı (optional) */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Adres Satırı</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Sokak, bina, daire vb. (isteğe bağlı)"
                    placeholderTextColor="#9CA3AF"
                    value={values.adres}
                    onChangeText={handleChange('adres')}
                    onBlur={handleBlur('adres')}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* ── contact section ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
                </View>

                {/* Telefon */}
                <View
                  style={styles.fieldWrap}
                  onLayout={saveFieldY('telefon')}
                >
                  <Text style={styles.fieldLabel}>Telefon</Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.telefon && errors.telefon && styles.fieldError,
                    ]}
                    placeholder="05XX XXX XX XX"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={values.telefon}
                    onChangeText={handleChange('telefon')}
                    onBlur={handleBlur('telefon')}
                  />
                  {touched.telefon && errors.telefon && (
                    <Text style={styles.errorText}>{errors.telefon}</Text>
                  )}
                </View>

                {/* Email */}
                <View
                  style={styles.fieldWrap}
                  onLayout={saveFieldY('email')}
                >
                  <Text style={styles.fieldLabel}>E-posta</Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.email && errors.email && styles.fieldError,
                    ]}
                    placeholder="ornek@email.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                  />
                  {touched.email && errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                {/* ── Çalışma Günleri (edit mode) ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Çalışma Günleri</Text>
                </View>
                {WORKING_DAY_ORDER.map((day) => (
                  <View key={day}>
                    <View style={styles.workingDayRow}>
                      <Text style={styles.workingDayLabel}>{WORKING_DAY_LABELS[day]}</Text>
                      <Switch
                        value={workingDays[day]}
                        onValueChange={(value) => setWorkingDay(day, value)}
                      />
                    </View>
                    {workingDays[day] && (
                      <>
                        <View style={styles.workingHoursRow}>
                          <DropdownField
                            label="Başlangıç Saati"
                            value={workingHours[day].start}
                            options={TIME_OPTIONS}
                            onSelect={(start) =>
                              setWorkingHours(
                                day,
                                start,
                                workingHours[day].end,
                                workingHours[day].duration ?? 60,
                                workingHours[day].breakStart ?? null,
                                workingHours[day].breakEnd ?? null
                              )
                            }
                            placeholder="Başlangıç"
                          />
                          <DropdownField
                            label="Bitiş Saati"
                            value={workingHours[day].end}
                            options={TIME_OPTIONS}
                            onSelect={(end) =>
                              setWorkingHours(
                                day,
                                workingHours[day].start,
                                end,
                                workingHours[day].duration ?? 60,
                                workingHours[day].breakStart ?? null,
                                workingHours[day].breakEnd ?? null
                              )
                            }
                            placeholder="Bitiş"
                          />
                        </View>
                        <View style={styles.durationRow}>
                          <TouchableOpacity
                            style={[
                              styles.durationButton,
                              (workingHours[day].duration ?? 60) === 30 &&
                                styles.durationButtonSelected,
                            ]}
                            onPress={() =>
                              setWorkingHours(
                                day,
                                workingHours[day].start,
                                workingHours[day].end,
                                30,
                                workingHours[day].breakStart ?? null,
                                workingHours[day].breakEnd ?? null
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.durationButtonText,
                                (workingHours[day].duration ?? 60) === 30 &&
                                  styles.durationButtonTextSelected,
                              ]}
                            >
                              30 dk
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.durationButton,
                              (workingHours[day].duration ?? 60) === 60 &&
                                styles.durationButtonSelected,
                            ]}
                            onPress={() =>
                              setWorkingHours(
                                day,
                                workingHours[day].start,
                                workingHours[day].end,
                                60,
                                workingHours[day].breakStart ?? null,
                                workingHours[day].breakEnd ?? null
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.durationButtonText,
                                (workingHours[day].duration ?? 60) === 60 &&
                                  styles.durationButtonTextSelected,
                              ]}
                            >
                              60 dk
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.workingHoursRow}>
                          <DropdownField
                            label="Mola Başlangıç Saati"
                            value={workingHours[day].breakStart ?? BREAK_NONE}
                            options={BREAK_OPTIONS}
                            onSelect={(v) => {
                              const breakStart = v === BREAK_NONE ? null : v;
                              const breakEnd = workingHours[day].breakEnd ?? null;
                              if (breakStart && breakEnd && !isValidBreak(workingHours[day].start, workingHours[day].end, breakStart, breakEnd)) {
                                Alert.alert(
                                  'Uyarı',
                                  'Mola başlangıcı çalışma başlangıcından sonra, mola bitişi çalışma bitişinden önce ve mola başlangıcı mola bitişinden önce olmalıdır.'
                                );
                                return;
                              }
                              setWorkingHours(
                                day,
                                workingHours[day].start,
                                workingHours[day].end,
                                workingHours[day].duration ?? 60,
                                breakStart,
                                breakEnd
                              );
                            }}
                            placeholder="Mola yok"
                          />
                          <DropdownField
                            label="Mola Bitiş Saati"
                            value={workingHours[day].breakEnd ?? BREAK_NONE}
                            options={BREAK_OPTIONS}
                            onSelect={(v) => {
                              const breakEnd = v === BREAK_NONE ? null : v;
                              const breakStart = workingHours[day].breakStart ?? null;
                              if (breakStart && breakEnd && !isValidBreak(workingHours[day].start, workingHours[day].end, breakStart, breakEnd)) {
                                Alert.alert(
                                  'Uyarı',
                                  'Mola başlangıcı çalışma başlangıcından sonra, mola bitişi çalışma bitişinden önce ve mola başlangıcı mola bitişinden önce olmalıdır.'
                                );
                                return;
                              }
                              setWorkingHours(
                                day,
                                workingHours[day].start,
                                workingHours[day].end,
                                workingHours[day].duration ?? 60,
                                breakStart,
                                breakEnd
                              );
                            }}
                            placeholder="Mola yok"
                          />
                        </View>
                      </>
                    )}
                  </View>
                ))}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>İzin Günleri</Text>
                </View>
                <TouchableOpacity
                  style={styles.dayOffAddButton}
                  onPress={() => {
                    const today = new Date();
                    setPickerYear(today.getFullYear().toString());
                    setPickerMonth((today.getMonth() + 1).toString().padStart(2, '0'));
                    setPickerDay(today.getDate().toString().padStart(2, '0'));
                    setDayOffPickerVisible(true);
                  }}
                >
                  <Text style={styles.dayOffAddButtonText}>İzin günü ekle</Text>
                </TouchableOpacity>
                {dayOffDates.map((date) => (
                  <View key={date} style={styles.dayOffRow}>
                    <Text style={styles.readOnlyText}>{formatDayOffLabel(date)}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      onPress={() => removeDayOff(date)}
                      style={styles.dayOffRemove}
                    >
                      <Text style={styles.dayOffRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <Modal visible={dayOffPickerVisible} transparent animationType="slide">
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setDayOffPickerVisible(false)}
                  >
                    <TouchableOpacity
                      style={styles.dayOffModalContent}
                      activeOpacity={1}
                      onPress={() => {}}
                    >
                      <Text style={styles.modalTitle}>İzin günü seçin</Text>
                      <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Yıl</Text>
                        <DropdownField
                          label=""
                          value={pickerYear}
                          options={YEAR_OPTIONS}
                          onSelect={setPickerYear}
                          placeholder="Yıl"
                        />
                      </View>
                      <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Ay</Text>
                        <DropdownField
                          label=""
                          value={pickerMonth}
                          options={MONTH_OPTIONS}
                          onSelect={setPickerMonth}
                          placeholder="Ay"
                        />
                      </View>
                      <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Gün</Text>
                        <DropdownField
                          label=""
                          value={pickerDay}
                          options={DAY_OPTIONS}
                          onSelect={setPickerDay}
                          placeholder="Gün"
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => {
                          const dateStr = `${pickerYear}-${pickerMonth}-${pickerDay}`;
                          if (dayOffDates.includes(dateStr)) {
                            Alert.alert('Uyarı', 'Bu tarih zaten ekli.');
                            return;
                          }
                          addDayOff(dateStr);
                          setDayOffPickerVisible(false);
                        }}
                      >
                        <Text style={styles.saveButtonText}>Ekle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelEditButton}
                        onPress={() => setDayOffPickerVisible(false)}
                      >
                        <Text style={styles.cancelEditText}>İptal</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>

                {/* Save */}
                <TouchableOpacity
                  style={[styles.saveButton, saveInProgress && styles.buttonDisabled]}
                  onPress={() => {
                    if (saveInProgress) return;
                    submitAttemptedRef.current = true;
                    handleSubmit();
                  }}
                  disabled={saveInProgress}
                >
                  {saveInProgress ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Kaydet</Text>
                  )}
                </TouchableOpacity>

                {/* Cancel editing */}
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => {
                    resetForm();
                    setEditing(false);
                  }}
                >
                  <Text style={styles.cancelEditText}>Vazgeç</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Logout (always visible) */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={async () => {
                useBarberStore.getState().resetProfile();
                await signOut(auth);
              }}
            >
              <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </ScrollView>
        );
      }}
    </Formik>
  );
}

/* ─── styles ─── */
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },

  workingDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  workingDayLabel: { fontSize: 15, fontWeight: '500', color: '#111827' },
  workingHoursRow: {
    marginLeft: 12,
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  durationRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  durationButtonSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  durationButtonText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  durationButtonTextSelected: { color: '#FFFFFF' },

  dayOffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayOffAddButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  dayOffAddButtonText: { fontSize: 15, fontWeight: '600', color: '#2563EB' },
  dayOffRemove: { padding: 4 },
  dayOffRemoveText: { fontSize: 18, color: '#6B7280', fontWeight: '600' },

  fieldWrap: { marginTop: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  fieldError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 3 },

  readOnlyBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F3F4F6',
  },
  readOnlyText: { fontSize: 15, fontWeight: '500', color: '#111827' },
  readOnlyMuted: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic' },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
  },
  dropdownDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  dropdownText: { fontSize: 15, color: '#111827' },
  dropdownPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  dropdownArrow: { fontSize: 10, color: '#9CA3AF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingTop: 16,
    paddingBottom: 30,
  },
  /** İzin günü modalı: daha yüksek + alt boşluk (Ekle butonu tam görünsün). */
  dayOffModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '72%',
    paddingTop: 20,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemSel: { backgroundColor: '#EFF6FF' },
  modalItemText: { fontSize: 15, color: '#374151' },
  modalItemTextSel: { color: '#2563EB', fontWeight: '600' },
  modalEmpty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 20, fontSize: 14 },
  modalClose: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },

  editButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 28,
  },
  editButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  saveButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 28,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  cancelEditButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelEditText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
