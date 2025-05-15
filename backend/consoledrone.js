const admin = require('firebase-admin');

// Firebase service account importálása
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function printDrone() {
    try {
        const doc = await db.collection('EquipmentInstance').doc('ufuZWxz9BtCndVlUAjuk').get();

        if (!doc.exists) {
            console.log('No such drone found.');
            return;
        }

        console.log('Drone data:', JSON.stringify(doc.data(), null, 2));
    } catch (error) {
        console.error('Error fetching drone:', error);
    }
}

printDrone();
