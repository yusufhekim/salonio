/**
 * Placeholder hierarchical location data: İl → İlçe → Mahalle[]
 * Used for cascading dropdown selection on profile screens.
 */
export const LOCATION_DATA: Record<string, Record<string, string[]>> = {
  İstanbul: {
    Kadıköy: ['Caferağa', 'Osmanağa', 'Rasimpaşa', 'Fenerbahçe', 'Moda'],
    Beşiktaş: ['Levent', 'Etiler', 'Bebek', 'Ortaköy', 'Sinanpaşa'],
    Üsküdar: ['Çengelköy', 'Kuzguncuk', 'Beylerbeyi', 'Altunizade', 'Acıbadem'],
    Bakırköy: ['Ataköy', 'Yeşilköy', 'Florya', 'Zuhuratbaba', 'Osmaniye'],
    Şişli: ['Mecidiyeköy', 'Nişantaşı', 'Bomonti', 'Teşvikiye', 'Harbiye'],
  },
  Ankara: {
    Çankaya: ['Kızılay', 'Bahçelievler', 'Ayrancı', 'Gaziosmanpaşa', 'Cebeci'],
    Keçiören: ['Etlik', 'Kalaba', 'Kuşcağız', 'Ufuktepe', 'Kamil Ocak'],
    Yenimahalle: ['Batıkent', 'Demetevler', 'Ostim', 'Şentepe', 'Karşıyaka'],
  },
  İzmir: {
    Konak: ['Alsancak', 'Basmane', 'Kemeraltı', 'Güzelyalı', 'Hatay'],
    Bornova: ['Erzene', 'Kazımdirik', 'Evka 3', 'Doğanlar', 'Birlik'],
    Karşıyaka: ['Bostanlı', 'Mavişehir', 'Yalı', 'Tersane', 'Donanmacı'],
  },
};

/** Helper: returns list of all İl names */
export function getIller(): string[] {
  return Object.keys(LOCATION_DATA);
}

/** Helper: returns list of İlçe names for a given İl */
export function getIlceler(il: string): string[] {
  return il && LOCATION_DATA[il] ? Object.keys(LOCATION_DATA[il]) : [];
}

/** Helper: returns list of Mahalle names for a given İl + İlçe */
export function getMahalleler(il: string, ilce: string): string[] {
  return il && ilce && LOCATION_DATA[il]?.[ilce] ? LOCATION_DATA[il][ilce] : [];
}
