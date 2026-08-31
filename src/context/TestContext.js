import React, { createContext, useState } from 'react';
import * as dbOperations from '../database/db';
import * as FileSystem from 'expo-file-system/legacy';

export const TestContext = createContext();

export const TestProvider = ({ children }) => {
  const [testName, setTestName] = useState('');
  const [testId, setTestId] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Yeni test başlatırken veritabanında oluşturuyoruz
  const startNewTest = async (name) => {
    try {
      const id = await dbOperations.createTest(name);
      setTestId(id);
      setTestName(name);
      setQuestions([]);
    } catch (e) {
      console.error(e);
    }
  };

  const addQuestion = async (imageUri, correctAnswer, colorMode) => {
    try {
      const orderIndex = questions.length;
      const qId = await dbOperations.addQuestionToDB(testId, imageUri, correctAnswer, colorMode, orderIndex);
      
      setQuestions(prev => [
        ...prev,
        {
          id: qId,
          imageUri,
          correctAnswer,
          colorMode,
          orderIndex
        }
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const removeQuestion = async (id) => {
    try {
      const q = questions.find(item => item.id === id);
      if (q && q.imageUri) {
        try {
          await FileSystem.deleteAsync(q.imageUri, { idempotent: true });
        } catch (err) {
          console.error("Resim silinemedi:", err);
        }
      }
      await dbOperations.deleteQuestionFromDB(id);
      setQuestions(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const reorderQuestions = async (newOrder) => {
    setQuestions(newOrder);
    try {
      for (let i = 0; i < newOrder.length; i++) {
        await dbOperations.updateQuestionOrder(newOrder[i].id, i);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTest = async (id, name) => {
    try {
      const dbQuestions = await dbOperations.getQuestionsForTest(id);
      
      const mappedQuestions = dbQuestions.map(q => {
        let fixedUri = q.image_uri;
        // Expo Go kapatılıp açıldığında documentDirectory yolu (UUID) değişebilir.
        // Bu yüzden eski dizindeki 'testYap_images/' sonrasını alıp, güncel dizin ile birleştiriyoruz.
        if (fixedUri && fixedUri.includes('testYap_images/')) {
          const filename = fixedUri.split('testYap_images/')[1];
          if (filename) {
            fixedUri = FileSystem.documentDirectory + 'testYap_images/' + filename;
          }
        }
        
        return {
          id: q.id,
          imageUri: fixedUri,
          correctAnswer: q.correct_answer,
          colorMode: q.color_mode,
          orderIndex: q.order_index
        };
      });
      
      setTestId(id);
      setTestName(name);
      setQuestions(mappedQuestions);
    } catch (e) {
      console.error(e);
    }
  };

  const updateQuestion = async (id, imageUri, correctAnswer, colorMode) => {
    try {
      await dbOperations.updateQuestionInDB(id, imageUri, correctAnswer, colorMode);
      setQuestions(prev => prev.map(q => 
        q.id === id ? { ...q, imageUri, correctAnswer, colorMode } : q
      ));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <TestContext.Provider value={{
      testId,
      testName,
      questions,
      startNewTest,
      addQuestion,
      removeQuestion,
      updateQuestion,
      reorderQuestions,
      loadTest
    }}>
      {children}
    </TestContext.Provider>
  );
};
