import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { TestContext } from '../context/TestContext';
import * as dbOperations from '../database/db';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TestListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tests, setTests] = useState([]);
  const { loadTest, testId } = useContext(TestContext);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const allTests = await dbOperations.getTests();
      setTests(allTests);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Testler yüklenirken bir hata oluştu.');
    }
  };

  const handleDeleteTest = (id, title) => {
    Alert.alert('Testi Sil', `"${title}" adlı testi ve içindeki tüm soruları/resimleri kalıcı olarak silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { 
        text: 'Sil', 
        style: 'destructive',
        onPress: async () => {
          try {
            // 1. Get all questions for this test to find their image paths
            const questions = await dbOperations.getQuestionsForTest(id);
            
            // 2. Delete all physical images from the device
            for (let q of questions) {
              if (q.image_uri) {
                // Determine absolute path if needed
                let fixedUri = q.image_uri;
                if (fixedUri.includes('testYap_images/')) {
                  const filename = fixedUri.split('testYap_images/')[1];
                  if (filename) fixedUri = FileSystem.documentDirectory + 'testYap_images/' + filename;
                }
                try {
                  await FileSystem.deleteAsync(fixedUri, { idempotent: true });
                } catch(e) { console.log('Resim silinemedi:', e) }
              }
            }

            // 3. Delete from database
            await dbOperations.deleteTestFromDB(id);
            
            // 4. Refresh list
            fetchTests();
            
            // 5. If this test is currently loaded in context, we might want to clear it, but user is on this screen anyway.
            Alert.alert('Başarılı', 'Test ve tüm resimleri başarıyla silindi.');
          } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Test silinirken hata oluştu.');
          }
        }
      }
    ]);
  };

  const handleOpenTest = async (id, title) => {
    await loadTest(id, title);
    navigation.navigate('QuestionList');
  };

  const renderItem = ({ item }) => {
    // Format date properly
    let dateStr = item.created_at;
    try {
      if (item.created_at) {
        const d = new Date(item.created_at);
        dateStr = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}

    return (
      <TouchableOpacity style={styles.testItem} onPress={() => handleOpenTest(item.id, item.title)}>
        <View style={styles.testIcon}>
          <Text style={styles.iconText}>📄</Text>
        </View>
        <View style={styles.testInfo}>
          <Text style={styles.testTitle}>{item.title}</Text>
          <Text style={styles.testDate}>{dateStr} • {item.question_count} Soru</Text>
        </View>
        <TouchableOpacity style={styles.deleteTestBtn} onPress={() => handleDeleteTest(item.id, item.title)}>
          <Text style={styles.deleteTestBtnText}>Sil</Text>
        </TouchableOpacity>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>❯</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {tests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz kaydedilmiş bir test bulunmuyor.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('TestSettings')}>
            <Text style={styles.createBtnText}>Yeni Test Oluştur</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList 
          data={tests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa'
  },
  listContent: {
    padding: 15
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8fa6',
    marginBottom: 20,
    textAlign: 'center'
  },
  createBtn: {
    backgroundColor: '#0097e6',
    padding: 12,
    borderRadius: 8
  },
  createBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f2f6'
  },
  testIcon: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  iconText: {
    fontSize: 22
  },
  testInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2f3640',
    marginBottom: 4
  },
  testDate: {
    fontSize: 12,
    color: '#7f8fa6'
  },
  arrowContainer: {
    paddingLeft: 10
  },
  arrow: {
    fontSize: 18,
    color: '#dcdde1'
  },
  deleteTestBtn: {
    backgroundColor: '#ff7675',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 10
  },
  deleteTestBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  }
});
