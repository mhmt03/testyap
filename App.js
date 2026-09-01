import React, { useEffect } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TestProvider } from './src/context/TestContext';
import { initDB } from './src/database/db';

// Ekranları import edelim
import HomeScreen from './src/screens/HomeScreen';
import TestSettingsScreen from './src/screens/TestSettingsScreen';
import CameraScreen from './src/screens/CameraScreen';
import QuestionListScreen from './src/screens/QuestionListScreen';
import QuestionEditScreen from './src/screens/QuestionEditScreen';
import ExportScreen from './src/screens/ExportScreen';
import TestListScreen from './src/screens/TestListScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initDB().then(() => console.log('DB Initialized')).catch(console.error);
  }, []);

  return (
    <TestProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="TestSettings" 
            component={TestSettingsScreen} 
            options={({ navigation }) => ({ 
              title: 'Yeni Test',
              headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                  <Text style={{ color: '#0097e6', fontWeight: 'bold', fontSize: 14 }}>Ana Sayfa</Text>
                </TouchableOpacity>
              )
            })} 
          />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen} 
            options={{ headerShown: false }} // Kamera tam ekran olmalı
          />
          <Stack.Screen 
            name="QuestionList" 
            component={QuestionListScreen} 
            options={({ navigation }) => ({ 
              title: 'Sorular',
              headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                  <Text style={{ color: '#0097e6', fontWeight: 'bold', fontSize: 14 }}>Ana Sayfa</Text>
                </TouchableOpacity>
              )
            })} 
          />
          <Stack.Screen 
            name="QuestionEdit" 
            component={QuestionEditScreen} 
            options={{ title: 'Soruyu Düzenle' }} 
          />
          <Stack.Screen 
            name="Export" 
            component={ExportScreen} 
            options={{ title: 'Test Üret' }} 
          />
          <Stack.Screen 
            name="TestList" 
            component={TestListScreen} 
            options={({ navigation }) => ({ 
              title: 'Kayıtlı Testler',
              headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                  <Text style={{ color: '#0097e6', fontWeight: 'bold', fontSize: 14 }}>Ana Sayfa</Text>
                </TouchableOpacity>
              )
            })} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={({ navigation }) => ({ 
              title: 'İşlemler',
              headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                  <Text style={{ color: '#0097e6', fontWeight: 'bold', fontSize: 14 }}>Ana Sayfa</Text>
                </TouchableOpacity>
              )
            })} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </TestProvider>
  );
}
