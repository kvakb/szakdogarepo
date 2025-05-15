const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const droneCategory = {
    category: "drone",
    properties: [
        { name: "brand", type: "string" },
        { name: "model", type: "string" },
        { name: "weight", type: "number", unit: "g" },
        {
            name: "dimensions",
            type: "map",
            fields: [
                { name: "width", type: "number", unit: "mm" },
                { name: "length", type: "number", unit: "mm" },
                { name: "height", type: "number", unit: "mm" }
            ]
        },
        { name: "maxFlightTime", type: "number", unit: "perc" },
        { name: "maxSpeed", type: "number", unit: "m/s" },
        { name: "maxRange", type: "number", unit: "m" },
        { name: "maxAltitude", type: "number", unit: "m" },
        { name: "gps", type: "boolean" },
        { name: "obstacleAvoidance", type: "boolean" },
        { name: "returnToHome", type: "boolean" },
        { name: "followMeMode", type: "boolean" },

        {
            name: "sensorSize",
            type: "map",
            fields: [
                { name: "width", type: "number", unit: "mm" },
                { name: "height", type: "number", unit: "mm" }
            ]
        },
        { name: "megapixels", type: "number", unit: "MP" },

        {
            name: "videoResolutions",
            type: "array",
            fields: [
                {
                    name: "resolution",
                    type: "map",
                    fields: [
                        { name: "width", type: "number", unit: "px" },
                        { name: "height", type: "number", unit: "px" },
                        { name: "fps", type: "array", options: [24, 30, 60, 120], unit: "fps" }
                    ]
                }
            ]
        },

        { name: "gimbal", type: "boolean" },
        { name: "batteryCapacityMah", type: "number", unit: "mAh" },
        { name: "chargingTimeMinutes", type: "number", unit: "perc" },
        { name: "remoteController", type: "boolean" },
        { name: "mobileAppSupport", type: "boolean" },
        { name: "packageContents", type: "string" }
    ]
};

async function seed() {
    try {
        const docRef = await db.collection('EquipmentType').add({});
        await docRef.set({
            id: docRef.id,
            ...droneCategory
        });
        console.log(`✅ Drone category seeded successfully! Document ID: ${docRef.id}`);
    } catch (err) {
        console.error('❌ Error seeding drone category:', err);
    }
}

seed();
