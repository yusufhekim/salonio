import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuthStore, useBarberStore } from '@store';
import {
  getIller,
  getIlceler,
  getMahalleler,
} from '../../../shared/constants/locationData';

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
  const logout = useAuthStore((s) => s.logout);
  const profile = useBarberStore((s) => s.profile);
  const updateProfile = useBarberStore((s) => s.updateProfile);
  const [editing, setEditing] = useState(false);

  const initialValues = {
    kuaforAdi: profile.kuaforAdi,
    adSoyad: profile.adSoyad,
    il: profile.il,
    ilce: profile.ilce,
    mahalle: profile.mahalle,
    adres: profile.adres,
    telefon: profile.telefon,
    email: profile.email,
  };

  const handleSave = useCallback(
    (values: typeof initialValues) => {
      updateProfile(values);
      Alert.alert('Başarılı', 'Bilgiler başarıyla güncellendi!');
      setEditing(false);
    },
    [updateProfile],
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

        return (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Kuaför Profili</Text>

            {/* ── Kuaför ID (always read-only) ── */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Kuaför ID</Text>
              <View style={styles.idBox}>
                <Text style={styles.idText}>{profile.kuaforId}</Text>
              </View>
            </View>

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
                <View style={styles.fieldWrap}>
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
                <View style={styles.fieldWrap}>
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
                <View style={styles.fieldWrap}>
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
                <View style={styles.fieldWrap}>
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
                  onPress={() => handleSubmit()}
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
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
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
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },

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

  idBox: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#EFF6FF',
  },
  idText: { fontSize: 15, fontWeight: '700', color: '#2563EB' },

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
