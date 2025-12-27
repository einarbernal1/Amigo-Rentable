import { initializeApp } from 'firebase/app';

// Usamos @ts-ignore porque a veces TypeScript no "ve" getReactNativePersistence aunque sí existe.
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCC2Eo8Db_DNNKoH0oOWkyeqZkAfUMia_4",
  authDomain: "amigo-rentable-1961e.firebaseapp.com",
  projectId: "amigo-rentable-1961e",
  storageBucket: "amigo-rentable-1961e.firebasestorage.app",
  messagingSenderId: "101263983206",
  appId: "1:101263983206:web:9ebdf1605545e54d4f63a7",
  measurementId: "G-LZTQYGYEMN"
};

const app = initializeApp(firebaseConfig);

// Inicializamos Auth forzando la persistencia con AsyncStorage
// Esto evita que la sesión se pierda o crashee al intentar guardar datos
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;