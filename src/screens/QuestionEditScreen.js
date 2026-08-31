import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { TestContext } from '../context/TestContext';

const IMAGES_DIR = FileSystem.documentDirectory + 'testYap_images/';

export default function QuestionEditScreen({ route, navigation }) {
  const { questionId } = route.params;
  const { questions, updateQuestion } = useContext(TestContext);
  
  const existingQuestion = questions.find(q => q.id === questionId);

  const [photoUri, setPhotoUri] = useState(existingQuestion?.imageUri || null);
  const [resolution, setResolution] = useState('Medium'); // Varsayılan yeniden boyutlandırma
  const [colorMode, setColorMode] = useState(existingQuestion?.colorMode || 'original');
  const [selectedAnswer, setSelectedAnswer] = useState(existingQuestion?.correctAnswer || 'A');
  const [isPhotoChanged, setIsPhotoChanged] = useState(false);

  useEffect(() => {
    if (!existingQuestion) {
      Alert.alert('Hata', 'Soru bulunamadı.');
      navigation.goBack();
    }
  }, [existingQuestion, navigation]);

  const openNativeCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Reddedildi', 'Kamerayı kullanmak için izne ihtiyacımız var.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setIsPhotoChanged(true);
    }
  };

  const pickImageFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setIsPhotoChanged(true);
    }
  };

  const [rotationTask, setRotationTask] = useState(null);
  const [isRotating, setIsRotating] = useState(false);

  const handleRotate = async (angle) => {
    if (!photoUri) return;
    setIsRotating(true);
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, { encoding: FileSystem.EncodingType.Base64 });
      setRotationTask({ base64, angle });
    } catch (e) {
      setIsRotating(false);
      Alert.alert('Hata', 'Fotoğraf döndürmeye hazırlanamadı.');
    }
  };

  const onWebViewMessage = async (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'ROTATION_DONE') {
      try {
        const filename = `rotated_${Date.now()}.jpg`;
        const localUri = IMAGES_DIR + filename;
        const b64Data = data.base64.replace(/^data:image\/jpeg;base64,/, '');
        await FileSystem.writeAsStringAsync(localUri, b64Data, { encoding: FileSystem.EncodingType.Base64 });
        
        setPhotoUri(localUri);
        setIsPhotoChanged(true);
      } catch(e) {
        Alert.alert('Hata', 'Döndürülen resim kaydedilemedi.');
      }
      setRotationTask(null);
      setIsRotating(false);
    }
  };

  const getRotationHtml = (base64, angle) => `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        window.onload = function() {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const rad = ${angle} * Math.PI / 180;
            const sin = Math.abs(Math.sin(rad));
            const cos = Math.abs(Math.cos(rad));
            
            const newWidth = img.width * cos + img.height * sin;
            const newHeight = img.width * sin + img.height * cos;
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, newWidth, newHeight);
            
            ctx.translate(newWidth / 2, newHeight / 2);
            ctx.rotate(rad);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            const resultBase64 = canvas.toDataURL('image/jpeg', 0.9);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROTATION_DONE', base64: resultBase64 }));
          };
          img.src = 'data:image/jpeg;base64,' + "${base64}";
        };
      </script>
    </body>
    </html>
  `;

  const handleSave = async () => {
    try {
      let finalUri = photoUri;

      // Eğer fotoğraf değiştirildiyse (yeni çekildiyse) yeniden boyutlandır ve kaydet
      if (isPhotoChanged) {
        let resizeWidth = 800; // Medium
        if (resolution === 'Low') resizeWidth = 480;
        if (resolution === 'High') resizeWidth = 1200;

        const manipResult = await ImageManipulator.manipulateAsync(
          photoUri,
          [{ resize: { width: resizeWidth } }], 
          { compress: 0.8, format: ImageManipulator.SaveFormat.PNG }
        );
        
        const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
        }

        const filename = `img_${Date.now()}.png`;
        const localUri = IMAGES_DIR + filename;
        await FileSystem.copyAsync({ from: manipResult.uri, to: localUri });
        finalUri = localUri;
      }

      await updateQuestion(questionId, finalUri, selectedAnswer, colorMode);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Soru güncellenirken hata oluştu: ' + error.message);
    }
  };

  if (!photoUri) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <View style={styles.previewContainer}>
        <Image 
          source={{ uri: photoUri }} 
          style={[styles.previewImage, colorMode !== 'original' && { opacity: 0.7 }]} 
          resizeMode="contain" 
        />
        {colorMode === 'grayscale' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(128,128,128,0.5)' }]} pointerEvents="none" />}
        {colorMode === 'blackwhite' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} pointerEvents="none" />}
        <Text style={styles.cropHint}>Seçilen filtre dışa aktarılırken de uygulanacaktır.</Text>
        
        <View style={styles.rotationOverlay}>
          {isRotating ? (
            <ActivityIndicator size="small" color="#fff" style={{ margin: 10 }} />
          ) : (
            <>
              <TouchableOpacity style={styles.rotateBtn} onPress={() => handleRotate(-1)}>
                <Text style={styles.rotateBtnText}>↺ -1°</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rotateBtn} onPress={() => handleRotate(1)}>
                <Text style={styles.rotateBtnText}>↻ +1°</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rotateBtn} onPress={() => handleRotate(90)}>
                <Text style={styles.rotateBtnText}>⟳ 90°</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.settingsPanel}>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Resmi Değiştir:</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e1b12c' }]} onPress={openNativeCamera}>
              <Text style={styles.actionBtnText}>Kameradan Çek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0097e6' }]} onPress={pickImageFromGallery}>
              <Text style={styles.actionBtnText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Renk Modu (Çıktıda Uygulanacak):</Text>
          <View style={styles.row}>
            {[
              { id: 'original', label: 'Renkli' },
              { id: 'grayscale', label: 'Gri Tonlama' },
              { id: 'blackwhite', label: 'Siyah-Beyaz' }
            ].map(mode => (
              <TouchableOpacity 
                key={mode.id} 
                style={[styles.resBtn, colorMode === mode.id && styles.activeResBtn]}
                onPress={() => setColorMode(mode.id)}
              >
                <Text style={colorMode === mode.id ? styles.activeText : styles.inactiveText}>{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Doğru Cevap:</Text>
          <View style={styles.row}>
            {['A', 'B', 'C', 'D', 'E'].map(ans => (
              <TouchableOpacity 
                key={ans} 
                style={[styles.ansBtn, selectedAnswer === ans && styles.activeAnsBtn]}
                onPress={() => setSelectedAnswer(ans)}
              >
                <Text style={selectedAnswer === ans ? styles.activeText : styles.inactiveText}>{ans}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {rotationTask && (
        <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
          <WebView
            originWhitelist={['*']}
            source={{ html: getRotationHtml(rotationTask.base64, rotationTask.angle) }}
            onMessage={onWebViewMessage}
            javaScriptEnabled={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  previewContainer: { flex: 1, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  cropHint: {
    position: 'absolute', top: 20, left: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: 5, textAlign: 'center', borderRadius: 5, fontSize: 11
  },
  rotationOverlay: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 10
  },
  rotateBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#fff'
  },
  rotateBtnText: {
    color: '#fff', fontSize: 12, fontWeight: 'bold'
  },
  settingsPanel: { backgroundColor: '#2f3640', padding: 10, borderTopLeftRadius: 15, borderTopRightRadius: 15, maxHeight: '55%' },
  label: { color: '#f5f6fa', fontSize: 13, marginBottom: 5, marginTop: 10, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  resBtn: { padding: 8, borderWidth: 1, borderColor: '#7f8fa6', borderRadius: 5, flex: 1, marginHorizontal: 3, alignItems: 'center' },
  activeResBtn: { backgroundColor: '#00a8ff', borderColor: '#00a8ff' },
  ansBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#7f8fa6', justifyContent: 'center', alignItems: 'center', marginHorizontal: 2 },
  activeAnsBtn: { backgroundColor: '#4cd137', borderColor: '#4cd137' },
  activeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  inactiveText: { color: '#7f8fa6', fontSize: 13 },
  actionBtn: { flex: 1, marginHorizontal: 3, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  saveBtn: { backgroundColor: '#44bd32', padding: 15, borderRadius: 8, marginTop: 20, marginBottom: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
