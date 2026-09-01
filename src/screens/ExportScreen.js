import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TestContext } from '../context/TestContext';
import * as dbOperations from '../database/db';

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const { testName, questions } = useContext(TestContext);
  
  const [title, setTitle] = useState(testName || 'Sınav');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [columns, setColumns] = useState(2);
  const [groupCount, setGroupCount] = useState(1);
  const [pageMargin, setPageMargin] = useState('15');
  const [optimizeSpace, setOptimizeSpace] = useState(false);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [answerKeyLocation, setAnswerKeyLocation] = useState('separate');
  const [isExporting, setIsExporting] = useState(false);
  
  const [htmlToProcess, setHtmlToProcess] = useState('');
  const [processingGroup, setProcessingGroup] = useState('');
  
  // Grupları (A, B, vs.) sırayla işlemek için state'ler
  const [groupsQueue, setGroupsQueue] = useState([]);
  const [generatedPdfUris, setGeneratedPdfUris] = useState([]);
  const webViewRef = useRef(null);

  useEffect(() => {
    const loadDefaults = async () => {
      setHeaderText(await dbOperations.getSetting('defHeader', 'Ad Soyad: ........................   Sınıf/No: ............'));
      setFooterText(await dbOperations.getSetting('defFooter', 'Başarılar Dileriz'));
      setGroupCount(parseInt(await dbOperations.getSetting('defGroup', '1')));
      setPageMargin(await dbOperations.getSetting('defMargin', '15'));
    };
    loadDefaults();
  }, []);

  const getBase64FromUri = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const type = uri.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    return { base64, type };
  };

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const startExport = async () => {
    if (questions.length === 0) {
      Alert.alert('Uyarı', 'Testte hiç soru yok.');
      return;
    }
    setIsExporting(true);
    setGeneratedPdfUris([]);

    const letters = ['A', 'B', 'C', 'D', 'E'];
    let queue = [];

    // Önce tüm soruların base64 resimlerini hazırlayalım ki WebView'e doğrudan veri olarak verebilelim
    const questionsWithBase64 = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const imgData = await getBase64FromUri(q.imageUri);
      questionsWithBase64.push({
        ...q,
        base64Img: imgData.base64,
        imgType: imgData.type
      });
    }

    if (groupCount > 1) {
      for (let i = 0; i < groupCount; i++) {
        queue.push({
          letter: letters[i],
          title: `${title} - ${letters[i]} Kitapçığı`,
          questions: shuffleArray(questionsWithBase64)
        });
      }
    } else {
      queue.push({
        letter: '',
        title: title,
        questions: questionsWithBase64
      });
    }

    setGroupsQueue(queue);
    processNextGroup(queue, 0, []);
  };

  const processNextGroup = (queue, index, pdfUris) => {
    if (index >= queue.length) {
      // Tüm gruplar bitti, paylaşalım
      finishExport(pdfUris);
      return;
    }

    const currentGroup = queue[index];
    setProcessingGroup(currentGroup.letter ? `${currentGroup.letter} Kitapçığı Hazırlanıyor...` : 'PDF Hazırlanıyor...');
    
    // HTML Oluştur ve WebView'e gönder
    const html = generateProcessingHtml(currentGroup.title, currentGroup.questions, currentGroup.letter, index, pageMargin, includeAnswerKey, answerKeyLocation);
    setHtmlToProcess(html); // Bu, WebView'in yüklenmesini tetikler
  };

  const onWebViewMessage = async (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'PDF_HTML_READY') {
      const finalHtml = data.html;
      const index = data.index;
      
      try {
        const { uri } = await Print.printToFileAsync({ html: finalHtml });
        
        // İsmi düzeltmek için FileSystem copy
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_');
        const letterSuffix = groupsQueue[index].letter ? `_${groupsQueue[index].letter}` : '';
        const newPath = FileSystem.documentDirectory + safeTitle + letterSuffix + '.pdf';
        
        await FileSystem.copyAsync({ from: uri, to: newPath });
        
        const newUris = [...generatedPdfUris, newPath];
        setGeneratedPdfUris(newUris);
        
        // Sıradakini işle
        processNextGroup(groupsQueue, index + 1, newUris);
      } catch (error) {
        Alert.alert('Hata', 'PDF üretilemedi: ' + error.message);
        setIsExporting(false);
      }
    }
  };

  const finishExport = async (uris) => {
    setHtmlToProcess('');
    setIsExporting(false);
    
    if (uris.length > 0) {
      if (uris.length === 1) {
        await Sharing.shareAsync(uris[0]);
        // Tekli paylaşımda da geçmişe ekle
        const filename = uris[0].split('/').pop();
        await dbOperations.addPdfHistory(filename, 'Paylaşılanlar (Geçici)');
      } else {
        Alert.alert('Klasör Seçin', `${uris.length} adet kitapçık oluşturuldu. Şimdi bunları kaydetmek için bir klasör seçmeniz istenecek.`, [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Klasör Seç', 
            onPress: async () => {
              try {
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                  for (let uri of uris) {
                    const filename = uri.split('/').pop();
                    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                    const newUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'application/pdf');
                    await FileSystem.writeAsStringAsync(newUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                    
                    // Geçmişe kaydet
                    let folderName = permissions.directoryUri;
                    try {
                      folderName = decodeURIComponent(folderName.split('/').pop() || folderName);
                    } catch(e) {}
                    await dbOperations.addPdfHistory(filename, folderName);
                  }
                  Alert.alert('Başarılı', `Tüm kitapçıklar seçtiğiniz klasöre başarıyla kaydedildi!`);
                } else {
                  Alert.alert('İptal', 'Klasör izni verilmediği için dosyalar kaydedilemedi.');
                }
              } catch (e) {
                // console.error(e); yerine kullanıcıya açıklayıcı mesaj verelim (Kırmızı ekran çıkmasını engeller)
                Alert.alert(
                  'Klasör Erişimi Reddedildi',
                  'Seçtiğiniz klasöre (muhtemelen İndirilenler ana klasörü) güvenlik nedeniyle dosya yazılamıyor.\n\nFarklı bir klasör seçebilir veya dosyaları sırayla Whatsapp/Mail vb. ile paylaşabilirsiniz.',
                  [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Sırayla Paylaş', onPress: async () => {
                        for (let uri of uris) {
                           await Sharing.shareAsync(uri);
                           const filename = uri.split('/').pop();
                           await dbOperations.addPdfHistory(filename, 'Paylaşılanlar (Manuel)');
                        }
                    }}
                  ]
                );
              }
            }
          }
        ]);
      }
    }
  };

  const generateProcessingHtml = (docTitle, qList, letter, index, marginStr, incAnswer, ansLocation) => {
    let poolHtml = '';
    qList.forEach((q, i) => {
      let filterStyle = '';
      if (q.colorMode === 'grayscale' || q.colorMode === 'blackwhite') {
        filterStyle = 'filter: grayscale(100%);';
      }

      const imgType = q.imgType || 'jpeg';
      poolHtml += `
        <div class="question-block" data-qid="${q.id}" data-ans="${q.correctAnswer}" style="break-inside: avoid; margin-bottom: 20px;">
          <div class="q-num" style="font-weight:bold; font-size: 14px; margin-bottom: 5px;"></div>
          <img src="data:image/${imgType};base64,${q.base64Img}" style="max-width: 100%; height: auto; ${filterStyle}" />
        </div>
      `;
    });

    // Bu HTML, WebView içinde çalışıp kendisini sayfalara ve sütunlara bölecek,
    // sonra tüm DOM'u React Native'e geri gönderecek.
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { font-family: sans-serif; margin: 0; padding: 0; background: #fff; }
          .page { width: 210mm; height: 297mm; padding: ${marginStr}mm; box-sizing: border-box; position: relative; overflow: hidden; page-break-after: always; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; }
          .sub-info { display: flex; justify-content: space-between; font-size: 12px; margin-top: 10px; }
          .footer { position: absolute; bottom: ${marginStr}mm; left: ${marginStr}mm; right: ${marginStr}mm; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 5px; }
          .columns-container { display: flex; gap: 20px; height: calc(100% - 70px); }
          .column { flex: 1; display: flex; flex-direction: column; }
          
          .answer-key { margin-top: 20px; font-size: 14px; line-height: 1.8; }
        </style>
      </head>
      <body>
        <!-- Havuz (Görünmez) -->
        <div id="pool" style="position: absolute; top: -9999px; width: calc((210mm - ${marginStr * 2}mm - 20px) / ${columns});">
          ${poolHtml}
        </div>
        
        <!-- Çıktı -->
        <div id="output"></div>

        <script>
          const sutunSayisi = ${columns};
          const optimizasyon = ${optimizeSpace ? 'true' : 'false'};
          const indexInfo = ${index};
          const bTitle = "${docTitle}";
          const bHeader = "${headerText}";
          const bFooter = "${footerText}";
          const incAns = ${incAnswer ? 'true' : 'false'};
          const ansLoc = "${ansLocation}";
          
          function createPage() {
            const p = document.createElement('div');
            p.className = 'page';
            
            const header = document.createElement('div');
            header.className = 'header';
            header.innerHTML = '<h1>' + bTitle + '</h1><div class="sub-info"><span>' + bHeader + '</span></div>';
            
            const cols = document.createElement('div');
            cols.className = 'columns-container';
            for(let i=0; i<sutunSayisi; i++) {
              const c = document.createElement('div');
              c.className = 'column';
              cols.appendChild(c);
            }
            
            const footer = document.createElement('div');
            footer.className = 'footer';
            footer.innerHTML = bFooter;
            
            p.appendChild(header);
            p.appendChild(cols);
            p.appendChild(footer);
            return { page: p, cols: Array.from(cols.children) };
          }

          window.onload = function() {
            const pool = document.getElementById('pool');
            const output = document.getElementById('output');
            let questions = Array.from(pool.children);
            
            let currentPage = createPage();
            output.appendChild(currentPage.page);
            let colIdx = 0;
            let currentH = 0;
            
            // Tüm sayfaların net kullanılabilir yüksekliği (tahmini 297 - 30 margin - 70 header/footer = 197mm = ~744px)
            const MAX_H = 920; 

            // Numaralandırma ve cevap anahtarı için
            let answerArray = [];
            let qNum = 1;

            if (optimizasyon) {
              while(questions.length > 0) {
                let limit = MAX_H - currentH;
                let bestIdx = -1;
                
                if (currentH === 0) {
                  bestIdx = 0; // Boşsa sıradakini al
                } else {
                  let bestDiff = Infinity;
                  for(let i=0; i<questions.length; i++) {
                    let h = questions[i].offsetHeight;
                    if (h <= limit) {
                      let diff = limit - h;
                      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
                    }
                  }
                }
                
                if (bestIdx !== -1) {
                  let q = questions[bestIdx];
                  q.querySelector('.q-num').innerText = qNum + '-';
                  answerArray.push(qNum + '-' + q.getAttribute('data-ans'));
                  qNum++;
                  
                  currentPage.cols[colIdx].appendChild(q);
                  currentH += q.offsetHeight;
                  questions.splice(bestIdx, 1);
                } else {
                  colIdx++;
                  currentH = 0;
                  if (colIdx >= sutunSayisi) {
                    currentPage = createPage();
                    output.appendChild(currentPage.page);
                    colIdx = 0;
                  }
                }
              }
            } else {
              // Normal sıra
              questions.forEach(q => {
                let h = q.offsetHeight;
                if (currentH > 0 && currentH + h > MAX_H) {
                  colIdx++;
                  currentH = 0;
                  if (colIdx >= sutunSayisi) {
                    currentPage = createPage();
                    output.appendChild(currentPage.page);
                    colIdx = 0;
                  }
                }
                q.querySelector('.q-num').innerText = qNum + '-';
                answerArray.push(qNum + '-' + q.getAttribute('data-ans'));
                qNum++;
                
                currentPage.cols[colIdx].appendChild(q);
                currentH += h;
              });
            }

            // Cevap Anahtarı Ekle
            if (incAns && answerArray.length > 0) {
              if (ansLoc === 'separate') {
                const ansPage = createPage();
                ansPage.header = ''; // İstenirse başlık değiştirilir
                ansPage.cols[0].innerHTML = '<h2>Cevap Anahtarı</h2><div class="answer-key">' + answerArray.join(' , ') + '</div>';
                output.appendChild(ansPage.page);
              } else if (ansLoc === 'footer') {
                const lastPage = output.lastElementChild;
                if (lastPage) {
                  const footer = lastPage.querySelector('.footer');
                  if (footer) {
                    footer.innerHTML += '<div style="margin-top: 10px; font-size: 10px; font-weight: bold;">Cevap Anahtarı: ' + answerArray.join(', ') + '</div>';
                  }
                }
              }
            }
            
            pool.remove(); // Havuzu kaldır
            
            // Scriptleri temizle ve sonucu React Native'e yolla
            const finalHtml = document.documentElement.outerHTML;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PDF_HTML_READY', html: finalHtml, index: indexInfo }));
          };
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 40 }}>
        <Text style={styles.title}>PDF Ayarları</Text>

        <Text style={styles.label}>Test Başlığı:</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Üst Bilgi:</Text>
        <TextInput style={styles.input} value={headerText} onChangeText={setHeaderText} multiline={true} />

        <Text style={styles.label}>Alt Bilgi:</Text>
        <TextInput style={styles.input} value={footerText} onChangeText={setFooterText} multiline={true} />

        <View style={styles.settingRow}>
          <Text style={styles.label}>Sütun Sayısı:</Text>
          <View style={styles.rowBtns}>
            {[1, 2].map(num => (
              <TouchableOpacity key={num} style={[styles.btn, columns === num && styles.activeBtn]} onPress={() => setColumns(num)}>
                <Text style={columns === num ? styles.activeText : styles.text}>{num} Sütun</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Grup Sayısı (Kitapçık Türü):</Text>
          <View style={styles.rowBtns}>
            {[1, 2, 3, 4].map(num => (
              <TouchableOpacity key={num} style={[styles.btn, groupCount === num && styles.activeBtn]} onPress={() => setGroupCount(num)}>
                <Text style={groupCount === num ? styles.activeText : styles.text}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Alan Optimize Et (Boşlukları Doldur):</Text>
          <Switch value={optimizeSpace} onValueChange={setOptimizeSpace} trackColor={{ true: '#4cd137' }} />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Cevap Anahtarı Eklensin:</Text>
          <Switch value={includeAnswerKey} onValueChange={setIncludeAnswerKey} trackColor={{ true: '#4cd137' }} />
        </View>

        {includeAnswerKey && (
          <View style={styles.settingRow}>
            <Text style={styles.label}>Cevap Anahtarı Konumu:</Text>
            <View style={{ flexDirection: 'column' }}>
              <TouchableOpacity style={[styles.btn, answerKeyLocation === 'separate' && styles.activeBtn]} onPress={() => setAnswerKeyLocation('separate')}>
                <Text style={answerKeyLocation === 'separate' ? styles.activeText : styles.text}>Ayrı Sayfa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, answerKeyLocation === 'footer' && styles.activeBtn]} onPress={() => setAnswerKeyLocation('footer')}>
                <Text style={answerKeyLocation === 'footer' ? styles.activeText : styles.text}>Son Sayfa Altı</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isExporting ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#0097e6" />
            <Text style={{ marginTop: 10 }}>{processingGroup}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.exportBtn} onPress={startExport}>
            <Text style={styles.exportBtnText}>PDF Olarak Üret ({groupCount} Kitapçık)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Hidden WebView for HTML measurement and packing */}
      {htmlToProcess !== '' && (
        <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
          <WebView 
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlToProcess }}
            onMessage={onWebViewMessage}
            javaScriptEnabled={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2f3640' },
  label: { fontSize: 10, color: '#2f3640', marginBottom: 5, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#dcdde1', padding: 10, borderRadius: 8, marginBottom: 15, color: '#333' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  rowBtns: { flexDirection: 'row' },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#dcdde1', borderRadius: 5, marginLeft: 5 },
  activeBtn: { backgroundColor: '#0097e6', borderColor: '#0097e6' },
  text: { color: '#7f8fa6' },
  activeText: { color: '#fff', fontWeight: 'bold' },
  exportBtn: { backgroundColor: '#44bd32', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loading: { marginTop: 30, alignItems: 'center' }
});
