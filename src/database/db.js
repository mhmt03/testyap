import * as SQLite from 'expo-sqlite';

let db;

export const initDB = async () => {
  db = await SQLite.openDatabaseAsync('testYap.db');
  
  // Tabloları oluştur
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS Tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER,
      image_uri TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      color_mode TEXT DEFAULT 'original',
      order_index INTEGER,
      FOREIGN KEY(test_id) REFERENCES Tests(id)
    );
    CREATE TABLE IF NOT EXISTS Settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS PdfHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      folder TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// --- Settings Operations ---
export const getSetting = async (key, defaultValue) => {
  const row = await db.getFirstAsync('SELECT value FROM Settings WHERE key = ?', key);
  return row ? row.value : defaultValue;
};

export const setSetting = async (key, value) => {
  await db.runAsync('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)', key, String(value));
};

// --- PdfHistory Operations ---
export const addPdfHistory = async (filename, folder) => {
  await db.runAsync('INSERT INTO PdfHistory (filename, folder) VALUES (?, ?)', filename, folder);
};

export const getPdfHistory = async () => {
  const allRows = await db.getAllAsync('SELECT * FROM PdfHistory ORDER BY created_at DESC');
  return allRows;
};

export const createTest = async (title) => {
  const result = await db.runAsync('INSERT INTO Tests (title) VALUES (?)', title);
  return result.lastInsertRowId;
};

export const addQuestionToDB = async (testId, imageUri, correctAnswer, colorMode, orderIndex) => {
  const result = await db.runAsync(
    'INSERT INTO Questions (test_id, image_uri, correct_answer, color_mode, order_index) VALUES (?, ?, ?, ?, ?)',
    testId, imageUri, correctAnswer, colorMode, orderIndex
  );
  return result.lastInsertRowId;
};

export const updateQuestionOrder = async (id, newOrderIndex) => {
  await db.runAsync('UPDATE Questions SET order_index = ? WHERE id = ?', newOrderIndex, id);
};

export const updateQuestionInDB = async (id, imageUri, correctAnswer, colorMode) => {
  await db.runAsync(
    'UPDATE Questions SET image_uri = ?, correct_answer = ?, color_mode = ? WHERE id = ?',
    imageUri, correctAnswer, colorMode, id
  );
};

export const deleteQuestionFromDB = async (id) => {
  await db.runAsync('DELETE FROM Questions WHERE id = ?', id);
};

export const deleteTestFromDB = async (testId) => {
  // First delete questions associated with the test
  await db.runAsync('DELETE FROM Questions WHERE test_id = ?', testId);
  // Then delete the test itself
  await db.runAsync('DELETE FROM Tests WHERE id = ?', testId);
};

export const getQuestionsForTest = async (testId) => {
  const allRows = await db.getAllAsync('SELECT * FROM Questions WHERE test_id = ? ORDER BY order_index ASC', testId);
  return allRows;
};

export const getTests = async () => {
  const allRows = await db.getAllAsync(`
    SELECT Tests.*, COUNT(Questions.id) as question_count 
    FROM Tests 
    LEFT JOIN Questions ON Tests.id = Questions.test_id 
    GROUP BY Tests.id 
    ORDER BY Tests.created_at DESC
  `);
  return allRows;
};
