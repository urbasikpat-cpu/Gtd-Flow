// src/ticklerStorage.js

const DB_NAME = 'gtd_flow_files_db';
const DB_VERSION = 1;
const STORE_NAME = 'files_store';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveFile(fileId, fileBlob, fileName, mimeType) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      id: fileId,
      blob: fileBlob,
      name: fileName,
      type: mimeType,
      createdAt: new Date().toISOString()
    };
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

export async function getFile(fileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(fileId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFile(fileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(fileId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
