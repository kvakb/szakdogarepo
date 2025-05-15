import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase konfigurációs objektum
const firebaseConfig = {
    apiKey: "AIzaSyBiZm_SttfxTeRq9eyNK7yp-dgI8zCytDE",
    authDomain: "szakdolgozat-fe1ee.firebaseapp.com",
    projectId: "szakdolgozat-fe1ee",
    storageBucket: "szakdolgozat-fe1ee.appspot.com",
    messagingSenderId: "1022470026695",
    appId: "1:1022470026695:web:24119588008071d37a95e2"
};

// Firebase alkalmazás inicializálása
const app = initializeApp(firebaseConfig);

// Firebase Authentication inicializálása
const auth = getAuth(app);

// Firestore inicializálása
const db = getFirestore(app);

export { auth, db };
