import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {
  getIller,
  getIlceler,
  getMahalleler,
} from '../../../shared/constants/locationData';
import { useCustomerStore } from '@store';

/* ─── placeholder kuaför data ─── */
interface PlaceholderKuafor {
  id: string;
  name: string;
  il: string;
  ilce: string;
  mahalle: string;
}

const PLACEHOLDER_KUAFORLER: PlaceholderKuafor[] = [
  { id: '1', name: 'Ali Usta Kuaför', il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Caferağa' },
  { id: '2', name: 'Mehmet Barber Shop', il: 'İstanbul', ilce: 'Beşiktaş', mahalle: 'Levent' },
  { id: '3', name: 'Salon Güzellik', il: 'İstanbul', ilce: 'Üsküdar', mahalle: 'Çengelköy' },
  { id: '4', name: 'Stil Kuaför', il: 'Ankara', ilce: 'Çankaya', mahalle: 'Kızılay' },
  { id: '5', name: 'Modern Saç Tasarım', il: 'Ankara', ilce: 'Keçiören', mahalle: 'Etlik' },
  { id: '6', name: 'Trend Kuaför', il: 'İzmir', ilce: 'Konak', mahalle: 'Alsancak' },
  { id: '7', name: 'Prestij Kuaför', il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Moda' },
  { id: '8', name: 'Elite Barber', il: 'İzmir', ilce: 'Bornova', mahalle: 'Erzene' },
  { id: '9', name: 'Gold Kuaför', il: 'İstanbul', ilce: 'Şişli', mahalle: 'Mecidiyeköy' },
  { id: '10', name: 'Star Kuaför', il: 'Ankara', ilce: 'Yenimahalle', mahalle: 'Batıkent' },
];

/* ─── dropdown picker (bottom-sheet modal) ─── */
function FilterDropdown({
  label,
  value,
  options,
  onSelect,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  const handleClear = () => {
    onSelect('');
    setVisible(false);
  };

  return (
    <View style={styles.filterField}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdown, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
      >
        <Text style={value ? styles.dropdownText : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownArrow}>{value ? '✕' : '▼'}</Text>
      </TouchableOpacity>

      {/* Clear on arrow tap when value exists */}
      {value ? (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearText}>Temizle</Text>
        </TouchableOpacity>
      ) : null}

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
export default function HomeScreen() {
  const [nameFilter, setNameFilter] = useState('');
  const [selectedIl, setSelectedIl] = useState('');
  const [selectedIlce, setSelectedIlce] = useState('');
  const [selectedMahalle, setSelectedMahalle] = useState('');
  const [selectedKuafor, setSelectedKuaforLocal] = useState<PlaceholderKuafor | null>(null);
  const setSelectedKuaforStore = useCustomerStore((s) => s.setSelectedKuafor);

  const handleKuaforSelect = (kuafor: PlaceholderKuafor) => {
    setSelectedKuaforLocal(kuafor);
    setSelectedKuaforStore({
      id: kuafor.id,
      name: kuafor.name,
      il: kuafor.il,
      ilce: kuafor.ilce,
      mahalle: kuafor.mahalle,
    });
  };

  /* cascade resets */
  const handleIlSelect = (v: string) => {
    setSelectedIl(v);
    setSelectedIlce('');
    setSelectedMahalle('');
  };
  const handleIlceSelect = (v: string) => {
    setSelectedIlce(v);
    setSelectedMahalle('');
  };

  /* live filter */
  const filteredKuaforler = useMemo(() => {
    return PLACEHOLDER_KUAFORLER.filter((k) => {
      if (nameFilter.trim() && !k.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
        return false;
      if (selectedIl && k.il !== selectedIl) return false;
      if (selectedIlce && k.ilce !== selectedIlce) return false;
      if (selectedMahalle && k.mahalle !== selectedMahalle) return false;
      return true;
    });
  }, [nameFilter, selectedIl, selectedIlce, selectedMahalle]);

  const handleProfilePress = (kuafor: PlaceholderKuafor) => {
    Alert.alert(
      kuafor.name,
      `İl: ${kuafor.il}\nİlçe: ${kuafor.ilce}\nMahalle: ${kuafor.mahalle}\n\nKuaför profil sayfası henüz aktif değil.`,
    );
  };

  const renderKuafor = ({ item }: { item: PlaceholderKuafor }) => {
    const isSelected = selectedKuafor?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.kuaforCard, isSelected && styles.kuaforCardSelected]}
        onPress={() => handleKuaforSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.kuaforAvatar}>
          <Text style={styles.kuaforAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.kuaforInfo}>
          <Text style={styles.kuaforName}>{item.name}</Text>
          <Text style={styles.kuaforLocation}>
            {item.il}, {item.ilce}, {item.mahalle}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => handleProfilePress(item)}
        >
          <Text style={styles.profileButtonText}>Profil</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kuaför Ara</Text>

      {/* ── filter inputs ── */}
      <View style={styles.filterSection}>
        {/* Kuaför Adı text input */}
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Kuaför Adı</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Kuaför adı giriniz..."
            placeholderTextColor="#9CA3AF"
            value={nameFilter}
            onChangeText={setNameFilter}
          />
        </View>

        {/* İl dropdown */}
        <FilterDropdown
          label="İl"
          value={selectedIl}
          options={getIller()}
          onSelect={handleIlSelect}
          placeholder="Tüm iller"
        />

        {/* İlçe dropdown */}
        <FilterDropdown
          label="İlçe"
          value={selectedIlce}
          options={getIlceler(selectedIl)}
          onSelect={handleIlceSelect}
          placeholder={selectedIl ? 'İlçe seçiniz' : 'Önce İl seçiniz'}
          disabled={!selectedIl}
        />

        {/* Mahalle dropdown */}
        <FilterDropdown
          label="Mahalle"
          value={selectedMahalle}
          options={getMahalleler(selectedIl, selectedIlce)}
          onSelect={setSelectedMahalle}
          placeholder={selectedIlce ? 'Mahalle seçiniz' : 'Önce İlçe seçiniz'}
          disabled={!selectedIlce}
        />
      </View>

      {/* ── selection banner ── */}
      {selectedKuafor && (
        <View style={styles.selectionBanner}>
          <Text style={styles.selectionText}>
            Seçiminiz: <Text style={styles.selectionName}>{selectedKuafor.name}</Text>
          </Text>
        </View>
      )}

      {/* ── result count ── */}
      <Text style={styles.resultCount}>
        {filteredKuaforler.length} kuaför bulundu
      </Text>

      {/* ── kuaför list ── */}
      <FlatList
        data={filteredKuaforler}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Kuaför bulunamadı.</Text>
            <Text style={styles.emptySubtext}>Filtrelerinizi değiştirmeyi deneyin.</Text>
          </View>
        }
        renderItem={renderKuafor}
        extraData={selectedKuafor}
      />
    </View>
  );
}

/* ─── styles ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  /* filter section */
  filterSection: {
    marginBottom: 8,
  },
  filterField: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 3,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },

  /* dropdown */
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
  },
  dropdownDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  dropdownText: { fontSize: 14, color: '#111827' },
  dropdownPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  dropdownArrow: { fontSize: 11, color: '#9CA3AF' },
  clearButton: { alignSelf: 'flex-end', marginTop: 2 },
  clearText: { fontSize: 11, color: '#6B7280' },

  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingTop: 16,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemSel: { backgroundColor: '#EFF6FF' },
  modalItemText: { fontSize: 15, color: '#374151' },
  modalItemTextSel: { color: '#2563EB', fontWeight: '600' },
  modalEmpty: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
    fontSize: 14,
  },
  modalClose: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },

  /* selection banner */
  selectionBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectionText: { fontSize: 14, color: '#1E40AF' },
  selectionName: { fontWeight: '700' },

  /* result count */
  resultCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },

  /* list */
  list: { paddingBottom: 20 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#374151', fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: '#9CA3AF' },

  /* kuaför card */
  kuaforCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  kuaforCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  kuaforAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  kuaforAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  kuaforInfo: {
    flex: 1,
  },
  kuaforName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  kuaforLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  profileButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
});
