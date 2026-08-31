import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as dbOperations from '../database/db';

export default function SettingsScreen() {
  const [defHeader, setDefHeader] = useState('');
  const [defFooter, setDefFooter] = useState('');
  const [defGroup, setDefGroup] = useState('1');
  const [defRes, setDefRes] = useState('Medium');
  const [defColor, setDefColor] = useState('original');
  const [defMargin, setDefMargin] = useState('15');
  const [history, setHistory] = useState([]);

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
  };

  const loadHistory = async () => {
    try {
      const hist = await dbOperations.getPdfHistory();
      setHistory(hist);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Varsayılan Ayarlar</Text>
          
          <Text style={styles.label}>Varsayılan Üst Bilgi:</Text>
          <TextInput style={styles.input} value={defHeader} onChangeText={setDefHeader} />
          
          <Text style={styles.label}>Varsayılan Alt Bilgi:</Text>
          <TextInput style={styles.input} value={defFooter} onChangeText={setDefFooter} />

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
          {history.length === 0 ? (
             <Text style={styles.placeholderText}>Henüz hiç PDF üretilmedi.</Text>
          ) : (
            history.map(item => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={styles.histName}>{item.filename}</Text>
                <Text style={styles.histFolder}>Klasör: {item.folder}</Text>
                <Text style={styles.histDate}>{new Date(item.created_at).toLocaleString('tr-TR')}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.appName}>testYap Mobil</Text>
          <Text style={styles.version}>Sürüm 1.0.0</Text>
          <View style={styles.divider} />
          <Text style={styles.designedBy}>Designed By</Text>
          <Text style={styles.developerName}>Mehmet Gündöner</Text>
          <Text style={styles.contactInfo}>gundonerqyahoo.com</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContent: { padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#2f3640', marginBottom: 15 },
  label: { fontSize: 13, color: '#2f3640', marginBottom: 5, fontWeight: '600', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#dcdde1', padding: 10, borderRadius: 8, backgroundColor: '#fff', color: '#333' },
  rowBtns: { flexDirection: 'row', gap: 5 },
  btn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#dcdde1', borderRadius: 5, alignItems: 'center', backgroundColor: '#fff' },
  activeBtn: { backgroundColor: '#0097e6', borderColor: '#0097e6' },
  text: { color: '#7f8fa6', fontSize: 12 },
  activeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  saveBtn: { backgroundColor: '#44bd32', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  placeholderText: { fontSize: 14, color: '#7f8fa6' },
  historyItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#f1f2f6' },
  histName: { fontWeight: 'bold', fontSize: 14, color: '#2f3640', marginBottom: 2 },
  histFolder: { fontSize: 12, color: '#0097e6', marginBottom: 2 },
  histDate: { fontSize: 10, color: '#7f8fa6' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, marginTop: 20 },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#0097e6', marginBottom: 5 },
  version: { fontSize: 14, color: '#7f8fa6', marginBottom: 20 },
  divider: { height: 1, width: '100%', backgroundColor: '#f1f2f6', marginVertical: 15 },
  designedBy: { fontSize: 12, color: '#7f8fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  developerName: { fontSize: 18, fontWeight: 'bold', color: '#2f3640', marginBottom: 5 },
  contactInfo: { fontSize: 14, color: '#e84118', fontWeight: '500' }
});
