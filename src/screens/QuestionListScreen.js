import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, FlatList } from 'react-native';
import { TestContext } from '../context/TestContext';
export default function QuestionListScreen({ navigation }) {
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
        <TouchableOpacity 
          style={styles.itemContainer}
          onPress={() => navigation.navigate('QuestionEdit', { questionId: item.id })}
        >
          <View style={styles.dragHandle}>
            <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0}>
              <Text style={{ fontSize: 24, color: index === 0 ? '#f1f2f6' : '#0097e6' }}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveDown(index)} disabled={index === questions.length - 1}>
              <Text style={{ fontSize: 24, color: index === questions.length - 1 ? '#f1f2f6' : '#0097e6' }}>▼</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.imageContainer, { width: imageSize, height: imageSize }]}>
            <Image 
              source={{ uri: item.imageUri }} 
              style={[styles.image, item.colorMode !== 'original' && { opacity: 0.7 }]} 
              resizeMode="contain" 
            />
            {item.colorMode === 'grayscale' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(128,128,128,0.5)' }]} pointerEvents="none" />}
            {item.colorMode === 'blackwhite' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} pointerEvents="none" />}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.questionNum}>Soru {index + 1}</Text>
            <View style={styles.ansBadge}>
              <Text style={styles.ansText}>Cevap: {item.correctAnswer}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.delBtn} onPress={() => removeQuestion(item.id)}>
            <Text style={{ color: '#fff' }}>Sil</Text>
          </TouchableOpacity>
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {questions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz soru eklenmedi.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Camera')}>
            <Text style={styles.addBtnText}>+ Soru Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
        />
      )}

      {questions.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.btnText}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMoreBtn} onPress={() => navigation.navigate('Camera')}>
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
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdde1',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 }
  },
  dragHandle: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#f1f2f6',
    borderRadius: 6,
    marginRight: 10,
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  questionNum: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2f3640'
  },
  ansBadge: {
    backgroundColor: '#4cd137',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  ansText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  delBtn: {
    backgroundColor: '#e84118',
    padding: 10,
    borderRadius: 8,
    marginLeft: 10
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
