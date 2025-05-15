const admin = require("firebase-admin");
const fs = require("fs");

// 1. Inicializálás
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Beolvassuk a JSON-t fájlból
const cameraType = JSON.parse(fs.readFileSync("./cameraType.json", "utf8"));

async function uploadType() {
    try {
        const res = await db.collection("EquipmentType").add(cameraType);
        console.log("✅ Upload successful! Document ID:", res.id);
    } catch (err) {
        console.error("❌ Upload failed:", err);
    }
}

uploadType();
