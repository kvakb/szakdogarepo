const admin = require("firebase-admin");
const fs = require("fs");

// 1. Firebase inicializálás service account kulccsal
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Kamera adatok beolvasása
const cameras = JSON.parse(fs.readFileSync("./cameras.json", "utf8"));

// 3. Feltöltés az EquipmentInstance kollekcióba
async function uploadCameras() {
    for (const camera of cameras) {
        try {
            const docRef = await db.collection("EquipmentInstance").add(camera);
            console.log(`✅ Feltöltve: ${camera.name} → ID: ${docRef.id}`);
        } catch (error) {
            console.error(`❌ Hiba a(z) ${camera.name} feltöltésekor:`, error);
        }
    }
}

// 4. Futtatás
uploadCameras();
