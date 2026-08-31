import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TestContext } from '../context/TestContext';
import * as dbOperations from '../database/db';

export default function TestSettingsScreen({ navigation }) {
  const { startNewTest } = useContext(TestContext);
  const [inputName, setInputName] = useState('');

  const handleStart = async () => {
    if (!inputName.trim()) {
      Alert.alert('Hata', 'Lütfen test adını giriniz.');
      return;
    }
    
    // Lisans kontrolü
    const isLicensedStr = await dbOperations.getSetting('isLicensed', 'false');
    const isLicensed = isLicensedStr === 'true';
    
    if (!isLicensed) {
      const allTests = await dbOperations.getTests();
      if (allTests.length >= 5) {
        Alert.alert(
          'Lisans Gerekli', 
          'Ücretsiz sürümde en fazla 5 test oluşturabilirsiniz. Yeni test oluşturmak için mevcut testlerden birini silmeli veya İşlemler menüsünden uygulamayı aktifleştirmelisiniz.',
          [{ text: 'Tamam', style: 'cancel' }]
        );
        return;
      }
    }
    
    await startNewTest(inputName.trim());
    
    // Kameraya yönlendir
    navigation.navigate('Camera');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Oluşturulacak Testin Adı:</Text>
      <TextInput
        style={styles.input}
        placeholder="Örn: 9. Sınıf Matematik 1. Dönem"
        value={inputName}
        onChangeText={setInputName}
      />
      <TouchableOpacity style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>Soruları Eklemeye Başla (Kamera)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9'
  },
  button: {
    backgroundColor: '#4cd137',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
