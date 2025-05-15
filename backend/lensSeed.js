const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const lensCategory = {
    category: "lens",
    properties: [
        { name: "brand", type: "string" },
        { name: "model", type: "string" },
        { name: "mountType", type: "array", options: ["RF", "EF", "EF-M", "F", "Z", "E", "X", "MFT"] },
        { name: "optimalSensorSize", type: "array", options: ["Full Frame", "APS-C", "Micro 4/3"] },
        {
            name: "focalLength",
            type: "map",
            fields: [
                { name: "min", type: "number", unit: "mm" },
                { name: "max", type: "number", unit: "mm" }
            ]
        },
        {
            name: "aperture",
            type: "map",
            fields: [
                { name: "min", type: "number", unit: "f/" },
                { name: "max", type: "number", unit: "f/" }
            ]
        },
        { name: "lensType", type: "array", options: ["Prime", "Zoom"] },
        { name: "imageStabilization", type: "boolean" },
        { name: "autofocus", type: "boolean" },
        { name: "isMacro", type: "boolean" },
        { name: "filterSize", type: "number", unit: "mm" },
        {
            name: "dimensions",
            type: "map",
            fields: [
                { name: "diameter", type: "number", unit: "mm" },
                { name: "length", type: "number", unit: "mm" }
            ]
        },
        { name: "weight", type: "number", unit: "g" },
        { name: "weatherSealed", type: "boolean" },
        { name: "minFocusDistance", type: "number", unit: "m" },
        { name: "maxMagnification", type: "number", unit: "×" },
        { name: "packageContents", type: "string" }
    ]
};

async function seed() {
    try {
        const docRef = await db.collection('EquipmentType').add({});
        await docRef.set({
            id: docRef.id,
            ...lensCategory
        });
        console.log(`✅ Lens category seeded successfully! Document ID: ${docRef.id}`);
    } catch (err) {
        console.error('❌ Error seeding lens category:', err);
    }
}

seed();
