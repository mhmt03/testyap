import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as dbOperations from '../database/db';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [defHeader, setDefHeader] = useState('');
  const [defFooter, setDefFooter] = useState('');
  const [defGroup, setDefGroup] = useState('1');
  const [defRes, setDefRes] = useState('Medium');
  const [defColor, setDefColor] = useState('original');
  const [defMargin, setDefMargin] = useState('15');
  const [history, setHistory] = useState([]);
  
  const [sortType, setSortType] = useState('dateDesc'); // dateDesc, dateAsc, nameAsc, nameDesc

  const [isLicensed, setIsLicensed] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [testCount, setTestCount] = useState(0);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    setDefHeader(await dbOperations.getSetting('defHeader', 'Ad Soyad: ........................   Sınıf/No: ............'));
    setDefFooter(await dbOperations.getSetting('defFooter', 'Başarılar Dileriz'));
    setDefGroup(await dbOperations.getSetting('defGroup', '1'));
    setDefRes(await dbOperations.getSetting('defRes', 'Medium'));
    setDefColor(await dbOperations.getSetting('defColor', 'original'));
    setDefMargin(await dbOperations.getSetting('defMargin', '15'));
    
    const licensed = await dbOperations.getSetting('isLicensed', 'false');
    setIsLicensed(licensed === 'true');
    const tests = await dbOperations.getTests();
    setTestCount(tests.length);
  };

  const loadHistory = async () => {
    try {
      const hist = await dbOperations.getPdfHistory();
      const histWithStatus = await Promise.all(hist.map(async (item) => {
        const fileUri = FileSystem.documentDirectory + item.filename;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        return { ...item, exists: fileInfo.exists, fileUri };
      }));
      setHistory(histWithStatus);
    } catch(e) {}
  };

  const saveSettings = async () => {
    await dbOperations.setSetting('defHeader', defHeader);
    await dbOperations.setSetting('defFooter', defFooter);
    await dbOperations.setSetting('defGroup', defGroup);
    await dbOperations.setSetting('defRes', defRes);
    await dbOperations.setSetting('defColor', defColor);
    await dbOperations.setSetting('defMargin', defMargin);
    Alert.alert('Başarılı', 'Varsayılan ayarlar kaydedildi.');
  };

  const handleActivation = async () => {
    const code = licenseKey.trim();
    if (code === '12345') {
      await dbOperations.setSetting('isLicensed', 'true');
      setIsLicensed(true);
      Alert.alert('Başarılı', 'Lisans başarıyla aktifleştirildi. Sınırsız test oluşturabilirsiniz!');
    } else {
      Alert.alert('Hata', `Geçersiz aktivasyon kodu: "${code}"\nLütfen sadece 12345 yazıp Aktifleştir butonuna basın.`);
    }
  };

  const sortedHistory = [...history].sort((a, b) => {
    if (sortType === 'dateDesc') return new Date(b.created_at) - new Date(a.created_at);
    if (sortType === 'dateAsc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortType === 'nameAsc') return a.filename.localeCompare(b.filename);
    if (sortType === 'nameDesc') return b.filename.localeCompare(a.filename);
    return 0;
  });

  const handleOpenPdf = async (item) => {
    if (item.exists) {
      try {
        await Sharing.shareAsync(item.fileUri);
      } catch (error) {
        Alert.alert('Hata', 'Dosya açılamadı.');
      }
    } else {
      Alert.alert('Bulunamadı', 'Bu dosya cihazdan silinmiş veya bulunamıyor.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        
        {/* Hakkında (En Yukarıda) */}
        <View style={styles.card}>
          <Text style={styles.appName}>testYap Mobil</Text>
          <Text style={styles.version}>Sürüm 1.0.0</Text>
          <View style={styles.divider} />
          <Text style={styles.designedBy}>Designed By</Text>
          <Text style={styles.developerName}>Mehmet Gündöner</Text>
          <Text style={styles.contactInfo}>gundoner@yahoo.com</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lisans Durumu</Text>
          {isLicensed ? (
            <View style={styles.licenseCardActive}>
              <Text style={styles.licenseText}>✅ Pro Versiyon Aktif</Text>
              <Text style={styles.licenseSubText}>Sınırsız test oluşturma hakkına sahipsiniz.</Text>
            </View>
          ) : (
            <View style={styles.licenseCard}>
              <Text style={styles.licenseStatus}>Ücretsiz Sürüm: Maksimum 6 Soru / Test</Text>
              <Text style={styles.licenseDesc}>Sınırsız soru eklemek için uygulamayı aktifleştirin.</Text>
              <TextInput 
                style={styles.licenseInput} 
                placeholder="Aktivasyon Kodu (Örn: 12345)" 
                value={licenseKey} 
                onChangeText={setLicenseKey}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleActivation}
              />
              <TouchableOpacity style={styles.activateBtn} onPress={handleActivation}>
                <Text style={styles.activateBtnText}>Aktifleştir</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Varsayılan Ayarlar</Text>
          
          <Text style={styles.label}>Varsayılan Üst Bilgi:</Text>
          <TextInput style={styles.input} value={defHeader} onChangeText={setDefHeader} multiline={true} />
          
          <Text style={styles.label}>Varsayılan Alt Bilgi:</Text>
          <TextInput style={styles.input} value={defFooter} onChangeText={setDefFooter} multiline={true} />

          <Text style={styles.label}>Varsayılan Kenar Boşluğu:</Text>
          <View style={styles.rowBtns}>
            {[
              { id: '10', label: 'Dar (10mm)' },
              { id: '15', label: 'Normal (15mm)' },
              { id: '20', label: 'Geniş (20mm)' }
            ].map(margin => (
              <TouchableOpacity key={margin.id} style={[styles.btn, defMargin === margin.id && styles.activeBtn]} onPress={() => setDefMargin(margin.id)}>
                <Text style={defMargin === margin.id ? styles.activeText : styles.text}>{margin.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Varsayılan Grup Sayısı:</Text>
          <View style={styles.rowBtns}>
            {['1', '2', '3', '4'].map(num => (
              <TouchableOpacity key={num} style={[styles.btn, defGroup === num && styles.activeBtn]} onPress={() => setDefGroup(num)}>
                <Text style={defGroup === num ? styles.activeText : styles.text}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Varsayılan Çözünürlük:</Text>
          <View style={styles.rowBtns}>
            {['Low', 'Medium', 'High'].map(res => (
              <TouchableOpacity key={res} style={[styles.btn, defRes === res && styles.activeBtn]} onPress={() => setDefRes(res)}>
                <Text style={defRes === res ? styles.activeText : styles.text}>{res}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Varsayılan Renk Türü:</Text>
          <View style={styles.rowBtns}>
            {[
              { id: 'original', label: 'Renkli' },
              { id: 'grayscale', label: 'Gri Ton' },
              { id: 'blackwhite', label: 'Siyah-Beyaz' }
            ].map(mode => (
              <TouchableOpacity key={mode.id} style={[styles.btn, defColor === mode.id && styles.activeBtn]} onPress={() => setDefColor(mode.id)}>
                <Text style={defColor === mode.id ? styles.activeText : styles.text}>{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
            <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Üretilen PDF Geçmişi</Text>
          
          <View style={styles.sortRow}>
            <TouchableOpacity style={[styles.sortBtn, sortType === 'dateDesc' && styles.activeSortBtn]} onPress={() => setSortType('dateDesc')}>
              <Text style={sortType === 'dateDesc' ? styles.activeSortText : styles.sortText}>📅 Yeni</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortBtn, sortType === 'dateAsc' && styles.activeSortBtn]} onPress={() => setSortType('dateAsc')}>
              <Text style={sortType === 'dateAsc' ? styles.activeSortText : styles.sortText}>📅 Eski</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortBtn, sortType === 'nameAsc' && styles.activeSortBtn]} onPress={() => setSortType('nameAsc')}>
              <Text style={sortType === 'nameAsc' ? styles.activeSortText : styles.sortText}>🔤 A-Z</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortBtn, sortType === 'nameDesc' && styles.activeSortBtn]} onPress={() => setSortType('nameDesc')}>
              <Text style={sortType === 'nameDesc' ? styles.activeSortText : styles.sortText}>🔤 Z-A</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyContainer}>
            <ScrollView nestedScrollEnabled={true}>
              {history.length === 0 ? (
                 <Text style={styles.placeholderText}>Henüz hiç PDF üretilmedi.</Text>
              ) : (
                sortedHistory.map(item => (
                  <TouchableOpacity key={item.id} style={styles.historyItem} onPress={() => handleOpenPdf(item)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.histName, !item.exists && { textDecorationLine: 'line-through', color: '#7f8fa6' }]}>
                          {item.filename}
                        </Text>
                        <Text style={styles.histFolder}>Klasör: {item.folder}</Text>
                        <Text style={styles.histDate}>{new Date(item.created_at).toLocaleString('tr-TR')}</Text>
                      </View>
                      {!item.exists && (
                        <Text style={{ fontSize: 10, color: '#e84118', fontWeight: 'bold' }}>⚠️ Silinmiş</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContent: { padding: 10 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#2f3640', marginBottom: 5 },
  label: { fontSize: 13, color: '#2f3640', marginBottom: 5, fontWeight: '600', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#dcdde1', padding: 10, borderRadius: 8, backgroundColor: '#fff', color: '#333' },
  rowBtns: { flexDirection: 'row', gap: 5 },
  btn: { flex: 1, paddingVertical: 6, borderWidth: 1, borderColor: '#dcdde1', borderRadius: 5, alignItems: 'center', backgroundColor: '#fff' },
  activeBtn: { backgroundColor: '#0097e6', borderColor: '#0097e6' },
  text: { color: '#7f8fa6', fontSize: 12 },
  activeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  saveBtn: { backgroundColor: '#44bd32', padding: 5, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  // PDF Geçmişi ve Sıralama
  sortRow: { flexDirection: 'row', gap: 5, marginBottom: 5 },
  sortBtn: { flex: 1, paddingVertical: 6, borderWidth: 1, borderColor: '#dcdde1', borderRadius: 5, alignItems: 'center', backgroundColor: '#fff' },
  activeSortBtn: { backgroundColor: '#0097e6', borderColor: '#0097e6' },
  sortText: { color: '#7f8fa6', fontSize: 11 },
  activeSortText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  historyContainer: { backgroundColor: '#f1f2f6', borderRadius: 8, padding: 5, maxHeight: 250 },
  historyItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#dcdde1' },
  histName: { fontWeight: 'bold', fontSize: 14, color: '#2f3640', marginBottom: 2 },
  histFolder: { fontSize: 12, color: '#0097e6', marginBottom: 2 },
  histDate: { fontSize: 10, color: '#7f8fa6' },
  placeholderText: { fontSize: 14, color: '#7f8fa6', padding: 15, textAlign: 'center' },
  
  // Hakkında Kartı (Küçültüldü)
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 5, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, marginBottom: 10 },
  appName: { fontSize: 14, fontWeight: 'bold', color: '#0097e6', marginBottom: 2 },
  version: { fontSize: 10, color: '#7f8fa6', marginBottom: 8 },
  // divider: { height: 1, width: '100%', backgroundColor: '#f1f2f6', marginVertical: 8 },
  designedBy: { fontSize: 10, color: '#7f8fa6', textTransform: 'none', letterSpacing: 1, marginBottom: 2 },
  developerName: { fontSize: 14, fontWeight: 'bold', color: '#2f3640', marginBottom: 2 },
  contactInfo: { fontSize: 12, color: '#e84118', fontWeight: '500' },
  
  // Lisans
  licenseCard: { backgroundColor: '#fff', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#e1b12c', marginBottom: 10 },
  licenseCardActive: { backgroundColor: '#f1f8e9', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#4cd137', marginBottom: 10 },
  licenseStatus: { fontSize: 16, fontWeight: 'bold', color: '#e1b12c', marginBottom: 5 },
  licenseText: { fontSize: 16, fontWeight: 'bold', color: '#44bd32', marginBottom: 5 },
  licenseDesc: { fontSize: 12, color: '#7f8fa6', marginBottom: 15 },
  licenseSubText: { fontSize: 12, color: '#44bd32', marginBottom: 5 },
  licenseInput: { borderWidth: 1, borderColor: '#dcdde1', padding: 10, borderRadius: 8, backgroundColor: '#fff', marginBottom: 10, fontSize: 14, color: '#333' },
  activateBtn: { backgroundColor: '#0097e6', padding: 12, borderRadius: 8, alignItems: 'center' },
  activateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
