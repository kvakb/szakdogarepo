node// frontend/src/firebase.js
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBiZm_SttfxTeRq9eyNK7yp-dgI8zCytDE",
    authDomain: "szakdolgozat-fe1ee.firebaseapp.com",
    projectId: "szakdolgozat-fe1ee",
    storageBucket: "szakdolgozat-fe1ee.appspot.com",
    messagingSenderId: "1022470026695",
    appId: "1:1022470026695:web:24119588008071d37a95e2"
};

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const firestore = firebase.firestore();
export default firebase;
