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
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useCustomerStore } from '@store';
import { useAuth } from '../../../context/AuthContext';
import { auth } from '../../../lib/firebase';
import { getUserProfile } from '../../../services/authService';
import { updateCustomerProfile } from '../../../services/userService';
import {
  getIller,
  getIlceler,
  getMahalleler,
} from '../../../shared/constants/locationData';

/** Sırayla ilk hatalı alana scroll için kullanılır. */
const CUSTOMER_FIELD_ORDER = [
  'adSoyad',
  'il',
  'ilce',
  'mahalle',
  'telefon',
  'email',
] as const;

/* ─── validation schema ─── */
const ProfileSchema = Yup.object().shape({
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
export default function ProfileScreen() {
  const { user } = useAuth();
  const storeProfile = useCustomerStore((s) => s.profile);
  const updateProfile = useCustomerStore((s) => s.updateProfile);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldYRef = useRef<Record<string, number>>({});
  const submitAttemptedRef = useRef(false);

  useEffect(() => {
    const uid = user?.uid;
    if (uid) {
      getUserProfile(uid)
        .then((data) => {
          setProfile(data);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user?.uid]);

  const saveFieldY = useCallback((fieldName: string) => (e: LayoutChangeEvent) => {
    fieldYRef.current[fieldName] = e.nativeEvent.layout.y;
  }, []);

  const initialValues = {
    adSoyad: profile?.fullName ?? storeProfile.adSoyad,
    il: profile?.city ?? storeProfile.il,
    ilce: profile?.district ?? storeProfile.ilce,
    mahalle: profile?.neighborhood ?? storeProfile.mahalle,
    adres: profile?.address ?? storeProfile.adres,
    telefon: profile?.telefon ?? storeProfile.telefon,
    email: profile?.email ?? user?.email ?? storeProfile.email,
  };

  const handleSave = useCallback(
    async (values: typeof initialValues) => {
      const uid = user?.uid;
      if (!uid) {
        Alert.alert('Hata', 'Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      try {
        await updateCustomerProfile(uid, {
          fullName: values.adSoyad,
          city: values.il,
          district: values.ilce,
          neighborhood: values.mahalle,
          address: values.adres ?? '',
          email: values.email,
          telefon: values.telefon,
        });
        updateProfile(values);
        const updated = await getUserProfile(uid);
        setProfile(updated);
        Alert.alert('Başarılı', 'Bilgiler başarıyla güncellendi!');
        setEditing(false);
      } catch (e) {
        Alert.alert(
          'Kayıt hatası',
          'Bilgiler veritabanına kaydedilemedi. Lütfen tekrar deneyin.'
        );
      }
    },
    [user?.uid, updateProfile],
  );

  /* ─── read-only row helper ─── */
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={ProfileSchema}
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
        /* cascade helpers that reset children */
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
          const firstKey = CUSTOMER_FIELD_ORDER.find((k) => errors[k]);
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
            <Text style={styles.title}>Profilim</Text>

            {/* ── READ-ONLY: Firestore profile by role ── */}
            {!editing && profile && (
              <>
                {profile.role === 'barber' && (
                  <ReadOnlyRow
                    label="Kuaför / Salon Adı"
                    value={profile.barberShopName ?? ''}
                  />
                )}
                <ReadOnlyRow label="Ad Soyad" value={profile.fullName ?? ''} />
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Adres Bilgileri</Text>
                </View>
                <ReadOnlyRow label="İl" value={profile.city ?? ''} />
                <ReadOnlyRow label="İlçe" value={profile.district ?? ''} />
                <ReadOnlyRow label="Mahalle" value={profile.neighborhood ?? ''} />
                <ReadOnlyRow label="Adres" value={profile.address ?? ''} />
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
                </View>
                <ReadOnlyRow label="Telefon" value={profile.telefon ?? ''} />
                <ReadOnlyRow label="E-posta" value={profile.email ?? ''} />

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditing(true)}
                >
                  <Text style={styles.editButtonText}>Düzenle</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── READ-ONLY MODE (fallback when no Firestore profile) ── */}
            {!editing && !profile && (
              <>
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
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditing(true)}
                >
                  <Text style={styles.editButtonText}>Düzenle</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── EDIT MODE ── */}
            {editing && (
              <>
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

                {/* Save */}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => {
                    submitAttemptedRef.current = true;
                    handleSubmit();
                  }}
                >
                  <Text style={styles.saveButtonText}>Kaydet</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 0,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },

  /* sections */
  sectionHeader: {
    marginTop: 22,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },

  /* fields */
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

  /* read-only */
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

  /* müşteri ID */
  idBox: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#EFF6FF',
  },
  idText: { fontSize: 15, fontWeight: '700', color: '#2563EB' },

  /* dropdown */
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

  /* modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingTop: 16,
    paddingBottom: 30,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemSel: { backgroundColor: '#EFF6FF' },
  modalItemText: { fontSize: 15, color: '#374151' },
  modalItemTextSel: { color: '#2563EB', fontWeight: '600' },
  modalEmpty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 20, fontSize: 14 },
  modalClose: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },

  /* buttons */
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
