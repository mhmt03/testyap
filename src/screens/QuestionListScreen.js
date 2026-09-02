import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TestContext } from '../context/TestContext';
import * as dbOperations from '../database/db';
import FilteredImage from '../components/FilteredImage';

export default function QuestionListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { questions, removeQuestion, reorderQuestions, testName } = useContext(TestContext);
  const [imageSize, setImageSize] = React.useState(120);

  useEffect(() => {
    navigation.setOptions({ 
      title: testName || 'Sorular',
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10 }}>
          <TouchableOpacity onPress={() => setImageSize(s => Math.min(s + 40, 320))} style={{ padding: 10, marginHorizontal: 5, backgroundColor: '#f1f2f6', borderRadius: 5 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2f3640' }}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setImageSize(s => Math.max(s - 40, 60))} style={{ padding: 10, marginHorizontal: 5, backgroundColor: '#f1f2f6', borderRadius: 5 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2f3640' }}>-</Text>
          </TouchableOpacity>
        </View>
      )
    });
  }, [testName, navigation]);

  const handleExport = () => {
    if (questions.length === 0) {
      Alert.alert('Uyarı', 'Sınav kağıdı oluşturmak için en az bir soru eklemelisiniz.');
      return;
    }
    navigation.navigate('Export');
  };

  const handleAddQuestion = async () => {
    const isLicensedStr = await dbOperations.getSetting('isLicensed', 'false');
    const isLicensed = isLicensedStr === 'true';
    if (!isLicensed && questions.length >= 6) {
      Alert.alert('Lisans Gerekli', 'Ücretsiz sürümde bir teste en fazla 6 soru ekleyebilirsiniz. Sınırsız soru eklemek için İşlemler bölümünden uygulamanızı aktifleştirin.');
      return;
    }
    navigation.navigate('Camera');
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index - 1];
    newQuestions[index - 1] = temp;
    reorderQuestions(newQuestions);
  };

  const moveDown = (index) => {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + 1];
    newQuestions[index + 1] = temp;
    reorderQuestions(newQuestions);
  };

  const renderItem = ({ item, index }) => {
    return (
        <View style={styles.itemContainer}>
          {/* Sol: Resim */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('QuestionEdit', { questionId: item.id })}
            style={[styles.imageContainer, { width: imageSize, height: imageSize }]}
          >
            <FilteredImage 
              uri={item.imageUri} 
              colorMode={item.colorMode} 
              style={styles.image} 
            />
          </TouchableOpacity>

          {/* Sağ Kısım (flex: 1) */}
          <View style={styles.controlsContainer}>
            {/* Soru Numarası ve Oklar (Alt Alta) */}
            <View style={styles.col1}>
              <Text style={styles.questionNum}>{index + 1}. Soru</Text>
              <View style={styles.dragHandle}>
                <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0} style={styles.iconBtn}>
                  <Text style={{ fontSize: 24, color: index === 0 ? '#f1f2f6' : '#0097e6' }}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveDown(index)} disabled={index === questions.length - 1} style={styles.iconBtn}>
                  <Text style={{ fontSize: 24, color: index === questions.length - 1 ? '#f1f2f6' : '#0097e6' }}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cevap ve Sil Butonu (Alt Alta) */}
            <View style={styles.col2}>
              <View style={styles.ansBadge}>
                <Text style={styles.ansText}>{item.correctAnswer}</Text>
              </View>
              <TouchableOpacity style={styles.delBtn} onPress={() => removeQuestion(item.id)}>
                <Text style={styles.delBtnText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      {questions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz soru eklenmedi.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddQuestion}>
            <Text style={styles.addBtnText}>+ Soru Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10, paddingBottom: insets.bottom + 100 }}
        />
      )}

      {questions.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 15 }]}>
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.btnText}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMoreBtn} onPress={handleAddQuestion}>
            <Text style={styles.btnText}>+ Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.btnText}>Test Üret</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8fa6',
    marginBottom: 20
  },
  addBtn: {
    backgroundColor: '#0097e6',
    padding: 12,
    borderRadius: 8
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdde1',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5
  },
  controlsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  col1: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  col2: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15
  },
  dragHandle: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  imageContainer: {
    backgroundColor: '#f1f2f6',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 15
  },
  image: {
    width: '100%',
    height: '100%'
  },
  questionNum: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#2f3640'
  },
  ansBadge: {
    backgroundColor: '#4cd137',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ansText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  delBtn: {
    backgroundColor: '#e84118',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  delBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderColor: '#dcdde1'
  },
  homeBtn: {
    backgroundColor: '#7f8fa6',
    padding: 15,
    borderRadius: 8,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60
  },
  addMoreBtn: {
    flex: 1,
    backgroundColor: '#7f8fa6',
    padding: 15,
    borderRadius: 8,
    marginRight: 5,
    alignItems: 'center'
  },
  exportBtn: {
    flex: 1.5,
    backgroundColor: '#0097e6',
    padding: 15,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: 'center'
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});
