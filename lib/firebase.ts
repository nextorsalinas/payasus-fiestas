import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Ambas marcas guardan todos los datos en contrata-pispi/contrataciones.
const firebaseConfig = {
  apiKey: 'AIzaSyBYGn_49avkrIwUTlWv6M8M06vFdPlBuoE',
  authDomain: 'contrata-pispi.firebaseapp.com',
  projectId: 'contrata-pispi',
  storageBucket: 'contrata-pispi.firebasestorage.app',
  messagingSenderId: '626240109946',
  appId: '1:626240109946:web:80df40e9c7cf19eab4eac3',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
