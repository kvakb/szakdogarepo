const admin = require('firebase-admin');
const fs = require('fs');

// Replace with path to your Firebase Admin SDK service account key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadDrones() {
    const drones = JSON.parse(fs.readFileSync('drones.json', 'utf-8'));
    const batch = db.batch();

    drones.forEach((drone) => {
        const docRef = db.collection('EquipmentInstance').doc(); // Auto-generated ID
        batch.set(docRef, drone);
    });

    await batch.commit();
    console.log('Drones uploaded successfully.');
}

uploadDrones().catch(console.error);
