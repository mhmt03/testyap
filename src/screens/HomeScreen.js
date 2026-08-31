import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler, Image, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const handleExit = () => {
    Alert.alert("Çıkış", "Uygulamadan çıkmak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", onPress: () => BackHandler.exitApp() }
    ]);
  };

  return (
    <LinearGradient colors={['#ffffff', '#f1f5f9']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 20 }]} bounces={false}>
          
          <View style={styles.header}>
            <Image source={require('../../assets/logo.jpg')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Test Yap</Text>
            <Text style={styles.subtitle}>Soru Havuzu & PDF Kitapçık Üretici</Text>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.card, { borderLeftColor: '#0097e6' }]}
              onPress={() => navigation.navigate('TestSettings')}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Yeni Test Oluştur</Text>
                <Text style={styles.cardDesc}>Sıfırdan fotoğraflar çekerek yeni bir sınav hazırlayın.</Text>
              </View>
              <Text style={styles.cardIcon}>+</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.card, { borderLeftColor: '#e1b12c' }]}
              onPress={() => navigation.navigate('TestList')}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Testleri Aç</Text>
                <Text style={styles.cardDesc}>Daha önce hazırladığınız testleri görüntüleyin ve düzenleyin.</Text>
              </View>
              <Text style={styles.cardIcon}>📄</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.card, { borderLeftColor: '#7f8fa6' }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Ayarlar & Geçmiş</Text>
                <Text style={styles.cardDesc}>Uygulama ayarlarını değiştirin ve üretilen PDF'leri görün.</Text>
              </View>
              <Text style={styles.cardIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.exitBtn}
            onPress={handleExit}
          >
            <Text style={styles.exitBtnText}>Uygulamadan Çık</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 10,
    justifyContent: 'space-between'
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 30,
    marginBottom: 5
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2f3640',
    letterSpacing: 1
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8fa6',
    marginTop: 5,
    fontWeight: '500'
  },
  actions: {
    width: '100%',
    gap: 15,
    marginBottom: 40
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    paddingRight: 15
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2f3640',
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 12,
    color: '#718093',
    lineHeight: 18
  },
  cardIcon: {
    fontSize: 28,
    color: '#2f3640',
    opacity: 0.7
  },
  exitBtn: {
    padding: 5,
    alignItems: 'center',
    marginBottom: 20
  },
  exitBtnText: {
    color: '#e84118',
    fontSize: 20,
    fontWeight: 'bold'
  }
});
