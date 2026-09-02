import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { TestContext } from '../context/TestContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FilteredImage from '../components/FilteredImage';

const IMAGES_DIR = FileSystem.documentDirectory + 'testYap_images/';

export default function CameraScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraMode, setCameraMode] = useState(true);
  const [cameraRef, setCameraRef] = useState(null);
  
  const [photo, setPhoto] = useState(null);
  const [resolution, setResolution] = useState('Medium'); // Low, Medium, High
  const [colorMode, setColorMode] = useState('original'); // original, grayscale, blackwhite
  const [selectedAnswer, setSelectedAnswer] = useState('A');
  
  const { addQuestion, questions } = useContext(TestContext);

  useEffect(() => {
    const initDir = async () => {
      const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
      }
      const nomediaPath = IMAGES_DIR + '.nomedia';
      const nomediaInfo = await FileSystem.getInfoAsync(nomediaPath);
      if (!nomediaInfo.exists) {
        await FileSystem.writeAsStringAsync(nomediaPath, '');
      }

      // Varsayılan ayarları yükle
      const { getSetting } = require('../database/db');
      setResolution(await getSetting('defRes', 'Medium'));
      setColorMode(await getSetting('defColor', 'original'));
    };
    initDir();
  }, []);

  const openNativeCamera = async () => {
    // İzin iste
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Reddedildi', 'Kamerayı kullanmak için izne ihtiyacımız var.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, // Native Kırpma ve Döndürme ekranını açar
      quality: 1,
    });

    if (!result.canceled) {
      setPhoto({ uri: result.assets[0].uri });
    }
  };

  const pickImageFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPhoto({ uri: result.assets[0].uri });
    }
  };

  const [rotationTask, setRotationTask] = useState(null);
  const [isRotating, setIsRotating] = useState(false);

  const handleRotate = async (angle) => {
    if (!photo) return;
    setIsRotating(true);
    try {
      // Önce resmi biraz küçültelim ki WebView RAM şişmesin (Kamera resimleri çok büyük olabilir)
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }], // 1200px genişlik fazlasıyla yeterli
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
        
        setPhoto({ uri: localUri });
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

  const processAndSaveImage = async () => {
    if (!photo) return false;
    
    let resizeWidth = 800; // Medium
    if (resolution === 'Low') resizeWidth = 480;
    if (resolution === 'High') resizeWidth = 1200;

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
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
      
      addQuestion(localUri, selectedAnswer, colorMode);
      return true;
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Fotoğraf işlenirken hata oluştu: ' + error.message);
      return false;
    }
  };

  const handleSaveAndContinue = async () => {
    const success = await processAndSaveImage();
    if (success) {
      const { getSetting } = require('../database/db');
      const isLicensedStr = await getSetting('isLicensed', 'false');
      if (isLicensedStr !== 'true' && (questions ? questions.length + 1 : 1) >= 6) {
        Alert.alert('Lisans Gerekli', 'Ücretsiz sürüm sınırına (6 soru) ulaştınız.');
        navigation.navigate('QuestionList');
        return;
      }
      setPhoto(null);
      setSelectedAnswer('A');
      openNativeCamera(); // Sıradaki soru için kamerayı tekrar aç
    }
  };

  const handleSaveAndDone = async () => {
    const success = await processAndSaveImage();
    if (success) {
      navigation.navigate('QuestionList');
    }
  };

  if (photo) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <FilteredImage 
            uri={photo.uri} 
            colorMode={colorMode} 
            style={styles.previewImage} 
          />
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
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            <Text style={styles.label}>Renk Modu:</Text>
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

            <Text style={styles.label}>Çözünürlük:</Text>
            <View style={styles.row}>
              {['Low', 'Medium', 'High'].map(res => (
                <TouchableOpacity 
                  key={res} 
                  style={[styles.resBtn, resolution === res && styles.activeResBtn]}
                  onPress={() => setResolution(res)}
                >
                  <Text style={resolution === res ? styles.activeText : styles.inactiveText}>{res}</Text>
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

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e1b12c' }]} onPress={openNativeCamera}>
                <Text style={styles.actionBtnText}>Tekrar Çek</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#44bd32' }]} onPress={handleSaveAndContinue}>
                <Text style={styles.actionBtnText}>Kaydet Devam</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0097e6' }]} onPress={handleSaveAndDone}>
                <Text style={styles.actionBtnText}>Tamamlandı</Text>
              </TouchableOpacity>
            </View>
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

  // Eğer fotoğraf yoksa ve kamera henüz açılmadıysa (veya iptal edildiyse)
  return (
    <View style={styles.center}>
      <TouchableOpacity style={[styles.btn, { marginBottom: 15 }]} onPress={openNativeCamera}>
        <Text style={styles.btnText}>Kamerayı Aç</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#e1b12c', marginBottom: 15 }]} onPress={pickImageFromGallery}>
        <Text style={styles.btnText}>Galeriden Seç</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#7f8fa6' }]} onPress={() => navigation.navigate('QuestionList')}>
        <Text style={styles.btnText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' },
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
  settingsPanel: { backgroundColor: '#2f3640', padding: 10, borderTopLeftRadius: 15, borderTopRightRadius: 15, maxHeight: '45%' },
  label: { color: '#f5f6fa', fontSize: 12, marginBottom: 5, marginTop: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  resBtn: { padding: 6, borderWidth: 1, borderColor: '#7f8fa6', borderRadius: 5, flex: 1, marginHorizontal: 3, alignItems: 'center' },
  activeResBtn: { backgroundColor: '#00a8ff', borderColor: '#00a8ff' },
  ansBtn: { width: 35, height: 35, borderRadius: 17.5, borderWidth: 1, borderColor: '#7f8fa6', justifyContent: 'center', alignItems: 'center', marginHorizontal: 2 },
  activeAnsBtn: { backgroundColor: '#4cd137', borderColor: '#4cd137' },
  activeText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  inactiveText: { color: '#7f8fa6', fontSize: 11 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 10 },
  actionBtn: { flex: 1, marginHorizontal: 3, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  btn: { backgroundColor: '#0097e6', padding: 15, borderRadius: 8, minWidth: 200, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
