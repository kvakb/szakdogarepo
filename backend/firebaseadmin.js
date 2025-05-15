const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Ensure the path is correct

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'szakdolgozat-fe1ee.appspot.com'
});



const db = admin.firestore();

module.exports = { admin, db };
