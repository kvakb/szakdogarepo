const admin = require('firebase-admin');
const fs = require('fs');

// Replace with path to your Firebase Admin SDK service account key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadCameras() {
    const cameras = JSON.parse(fs.readFileSync('cameras.json', 'utf-8'));
    const batch = db.batch();

    cameras.forEach((camera) => {
        const docRef = db.collection('EquipmentInstance').doc(); // Auto ID

        const { categoryRef, createdAt, ...rest } = camera;

        const data = {
            ...rest,
            categoryRef: db.doc(categoryRef),
            createdAt: new admin.firestore.Timestamp(
                createdAt._seconds,
                createdAt._nanoseconds
            )
        };

        batch.set(docRef, data);
    });

    await batch.commit();
    console.log('Cameras uploaded successfully.');
}

uploadCameras().catch(console.error);
