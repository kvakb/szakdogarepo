const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const { admin, db } = require('./firebaseAdmin');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');


const app = express();
const port = 5100;

const Stripe = require('stripe');
const stripe = Stripe('');

const endpointSecret = '';

function generateReadableRentalId() {
    const now = new Date();
    const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
    const timePart = now.getTime().toString().slice(-6);
    return `R-${datePart}-${timePart}`;
}




async function createRental(userId, cartItems, rentalId) {
    console.log('🚩 createRental meghívva', { userId, cartItemsLength: cartItems?.length, rentalId });
    if (!cartItems || cartItems.length === 0) {
        console.log('No cart items to create a rental.');
        return;
    }

    console.log(`🔧 createRental called for userId: ${userId}`);

    const totalAmount = cartItems.reduce((acc, item) => {
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return acc + (item.pricePerDay * days);
    }, 0);

    const now = new Date();
    const isUpcoming = cartItems.every(item => new Date(item.startDate) > now);
    const status = isUpcoming ? 'upcoming' : 'active';

    const rentalRef = db.collection('rentals').doc(rentalId);
    await rentalRef.set({
        userId,
        items: cartItems.map(item => ({
            equipmentId: item.equipmentId,
            name: item.name,
            startDate: new Date(item.startDate),
            endDate: new Date(item.endDate),
            status,
            pricePerDay: item.pricePerDay
        })),
        totalAmount,
        status,
        paymentSessionId: rentalId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('🧼 Kosártörlés indítása a bérlésnél');
    await clearUserCart(String(userId));
    console.log('🧼 Kosártörlés befejeződött a bérlésnél');

    console.log('🧹 Kosár sikeresen törölve a bérlés után!');

    console.log('Rental created in Firestore with status:', status);
}


app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));


app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

app.use(bodyParser.json());

const upload = multer({ storage: multer.memoryStorage() });


const adminCheck = async (req, res, next) => {

    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized: No token" });
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        if (!userDoc.exists || !userDoc.data().admin) {
            return res.status(403).json({ error: "Forbidden: Admin only" });
        }
        next();
    } catch (err) {
        console.error('Admin check error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`✅ Webhook received: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;

        console.log(`🎯 Session ID: ${session.id}, User ID: ${userId}`);

        try {
            const pendingDoc = await db.collection('pendingCheckouts').doc(session.id).get();

            if (!pendingDoc.exists) {
                console.error('❌ Nem található pending checkout a session id alapján.');
                return res.status(404).send('Pending checkout not found.');
            }

            const { cartItems, rentalId } = pendingDoc.data();

            console.log(`📦 Cart items count: ${cartItems?.length}, Rental ID: ${rentalId}`);

            await createRental(userId, cartItems, rentalId);
            await pendingDoc.ref.delete();

            console.log('✅ Rental sikeresen létrehozva és pending törölve.');
        } catch (error) {
            console.error('❌ Rental létrehozási hiba:', error);
            return res.status(500).send(`Rental létrehozási hiba: ${error.message}`);
        }
    }

    res.status(200).send('Webhook received');
});



app.post('/api/create-checkout-session/:userId', async (req, res) => {
    const { userId } = req.params;
    const { cartItems } = req.body;

    try {
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty. Cannot initiate checkout.' });
        }

        const lineItems = cartItems.map(item => {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const totalItemPrice = item.pricePerDay * days;

            return {
                price_data: {
                    currency: 'huf',
                    product_data: {
                        name: item.name,
                        images: item.imageUrl ? [encodeURI(item.imageUrl)] : [],
                    },
                    unit_amount: Math.round(totalItemPrice * 100),
                },
                quantity: 1
            };
        });

        const totalAmount = cartItems.reduce((acc, item) => {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return acc + (item.pricePerDay * days);
        }, 0);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `http://localhost:3000/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:3000/cart`,
            metadata: { userId: String(userId) }
        });

        const rentalId = generateReadableRentalId();

        const now = new Date();
        const isUpcoming = cartItems.every(item => new Date(item.startDate) > now);
        const rentalStatus = isUpcoming ? 'upcoming' : 'pending';

        const rentalData = {
            userId,
            items: cartItems.map(item => ({
                equipmentId: item.equipmentId,
                name: item.name,
                startDate: new Date(item.startDate),
                endDate: new Date(item.endDate),
                status: rentalStatus,
                pricePerDay: item.pricePerDay
            })),
            totalAmount,
            status: rentalStatus,
            paymentSessionId: session.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('rentals').doc(rentalId).set(rentalData);

        await db.collection('pendingCheckouts').doc(session.id).set({
            userId,
            rentalId,
            cartItems: cartItems.map(({ quantity, ...rest }) => rest),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Stripe API error:', error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/compare-summary', async (req, res) => {
    const { first, second, category } = req.body;

    const prompt = `
You are a professional gear advisor for a high-end rental site.

Your task is to write a clear, helpful, and friendly comparison summary between two pieces of equipment in the "${category}" category.

Use plain, natural English and avoid technical jargon where possible. Do not use bullet points or Markdown. Structure your response in up to four short paragraphs.

Focus on:
1. The most relevant specifications for this category.
2. Differences that impact real-world use.
3. Three possible usage scenarios for each item (e.g. vlogging, travel, commercial work, etc.).
4. A brief recommendation for which user type each item is best for.

Camera 1:
${JSON.stringify(first, null, 2)}

Camera 2:
${JSON.stringify(second, null, 2)}
`;

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt,
                stream: false
            })
        });

        const data = await response.json();
        res.json({ summary: data.response });
    } catch (error) {
        console.error('🔥 AI comparison error:', error);
        res.status(500).json({ error: 'Failed to fetch AI response.' });
    }
});

app.get('/api/check-admin', async (req, res) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) return res.status(401).json({ isAdmin: false, error: 'Unauthorized: No token provided' });

        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        const userDoc = await db.collection('users').doc(uid).get();
        const isAdmin = userDoc.exists && userDoc.data().admin === true;

        res.status(200).json({ isAdmin });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ isAdmin: false, error: 'Internal server error' });
    }
});


app.post('/signup', async (req, res) => {
    const { name, email, password, phoneNumber } = req.body;

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            phoneNumber: phoneNumber || undefined
        });

        const userId = userRecord.uid;

        await db.collection('users').doc(userId).set({
            name,
            email,
            phoneNumber: phoneNumber || '',
            admin: false
        });

        res.status(200).json({ message: 'User signed up successfully', uid: userId });
    } catch (error) {
        console.error('Error creating new user:', error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const token = await admin.auth().createCustomToken(userRecord.uid);
        res.status(200).json({ token });
    } catch (error) {
        console.error('Error signing in user:', error);
        res.status(400).json({ error: error.message });
    }
});


app.put('/profile', async (req, res) => {
    const { uid, name, email, phoneNumber, password } = req.body;

    try {
        const updateFields = {
            email,
            displayName: name,
        };

        if (phoneNumber) {
            updateFields.phoneNumber = phoneNumber;
        }

        if (password) {
            updateFields.password = password;
        }

        await admin.auth().updateUser(uid, updateFields);

        await db.collection('users').doc(uid).update({
            name,
            email,
            phoneNumber: phoneNumber || '',
        });

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/equipment-types', async (req, res) => {
    try {
        const querySnapshot = await db.collection('EquipmentType').get();
        const equipmentTypes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json(equipmentTypes);
    } catch (error) {
        console.error('Error fetching equipment types:', error);
        res.status(500).send('Error fetching equipment types');
    }
});


app.post('/api/equipment', upload.single('image'), async (req, res) => {
    try {
        const {
            category,
            categoryName,
            name,
            brand,
            status,
            description,
            price,
            uid
        } = req.body;

        const details = JSON.parse(req.body.details);

        if (!category || !categoryName || !name || !brand || !status || !description || !price || !details || !uid) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let imageUrl = null;
        if (req.file) {
            const bucket = admin.storage().bucket();
            const fileName = `Equipment pictures/${uuidv4()}${path.extname(req.file.originalname)}`;
            const file = bucket.file(fileName);

            await file.save(req.file.buffer, {
                metadata: { contentType: req.file.mimetype }
            });

            await file.makePublic();
            imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        }

        const newEquipmentRef = db.collection('EquipmentInstance').doc();
        await newEquipmentRef.set({
            categoryRef: db.collection('EquipmentType').doc(category),
            categoryName,
            name,
            brand,
            status,
            description,
            price: parseFloat(price),
            details,
            imageUrl,
            uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).json({ message: 'Equipment added successfully.', id: newEquipmentRef.id });
    } catch (error) {
        console.error('Error adding equipment:', error);
        res.status(500).json({ error: `Failed to add equipment: ${error.message}` });
    }
});


app.get('/api/rentals/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const rentalsRef = db.collection('rentals');
        const snapshot = await rentalsRef.where('userId', '==', userId).get();


        if (snapshot.empty) {
            return res.status(200).json([]); // Nincs bérlés, üres tömbbel térünk vissza
        }

        const rentals = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(rentals);
    } catch (error) {
        console.error('Hiba a bérlések lekérésekor:', error);
        res.status(500).json({ error: 'Nem sikerült lekérni a bérléseket.' });
    }
});


app.put('/api/equipment/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;

    try {
        const { name, brand, status, description, price } = req.body;
        const details = JSON.parse(req.body.details);

        const missing = [];
        if (!name) missing.push('name');
        if (!brand) missing.push('brand');
        if (!status) missing.push('status');
        if (!description) missing.push('description');
        if (!price) missing.push('price');
        if (!details) missing.push('details');

        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
        }

        const equipmentRef = db.collection('EquipmentInstance').doc(id);
        const docSnapshot = await equipmentRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        let imageUrl = docSnapshot.data().imageUrl;

        if (req.file) {
            const bucket = admin.storage().bucket();
            const fileName = `Equipment pictures/${uuidv4()}${path.extname(req.file.originalname)}`;
            const file = bucket.file(fileName);

            await file.save(req.file.buffer, {
                metadata: { contentType: req.file.mimetype }
            });

            await file.makePublic();
            imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        }

        await equipmentRef.update({
            name,
            brand,
            status,
            description,
            price: parseFloat(price),
            details,
            imageUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ message: 'Equipment updated successfully.' });
    } catch (error) {
        console.error('🔥 Update error:', error);
        res.status(500).json({ error: `Update failed: ${error.message}` });
    }
});


app.delete('/api/equipment/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const equipmentRef = db.collection('EquipmentInstance').doc(id);
        const docSnapshot = await equipmentRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        await equipmentRef.delete();
        res.status(200).json({ message: 'Equipment deleted successfully' });
    } catch (error) {
        console.error('Error deleting equipment:', error);
        res.status(500).json({ error: `Failed to delete equipment: ${error.message}` });
    }
});


app.get('/api/equipment/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const equipmentRef = db.collection('EquipmentInstance').doc(id);
        const docSnapshot = await equipmentRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        res.status(200).json({ id: docSnapshot.id, ...docSnapshot.data() });
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ error: 'Failed to fetch equipment' });
    }
});


app.get('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const snapshot = await db.collection('users').doc(userId).collection('cart').get();
        const cartItems = snapshot.docs.map(doc => {
            const data = doc.data();

            return {
                id: doc.id,
                ...data,
                startDate: data.startDate ? data.startDate.toDate().toISOString() : null,
                endDate: data.endDate ? data.endDate.toDate().toISOString() : null,
                addedAt: data.addedAt ? data.addedAt.toDate().toISOString() : null
            };
        });

        res.status(200).json(cartItems);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    const { equipmentId, startDate, endDate, quantity } = req.body;

    try {
        const equipmentRef = db.collection('EquipmentInstance').doc(equipmentId);
        const equipmentSnap = await equipmentRef.get();

        if (!equipmentSnap.exists) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        const equipment = equipmentSnap.data();

        await db.collection('users').doc(userId).collection('cart').doc(equipmentId).set({
            equipmentRef,
            equipmentId,
            name: equipment.name,
            pricePerDay: equipment.price,
            imageUrl: equipment.imageUrl || '',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            quantity: quantity || 1,
            addedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Item added to cart' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/rentals/:id', async (req, res) => {
    const rentalId = req.params.id;

    try {
        const rentalRef = db.collection('rentals').doc(rentalId);
        const snapshot = await rentalRef.get();

        if (!snapshot.exists) {
            return res.status(404).json({ error: 'Rental not found' });
        }

        await rentalRef.delete();
        res.status(200).json({ message: 'Rental deleted successfully' });
    } catch (error) {
        console.error('Error deleting rental:', error);
        res.status(500).json({ error: 'Failed to delete rental' });
    }
});


app.delete('/api/cart/:userId/:equipmentId', async (req, res) => {
    const { userId, equipmentId } = req.params;

    try {
        await db.collection('users').doc(userId).collection('cart').doc(equipmentId).delete();

        res.status(200).json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cart-blocks/:equipmentId', async (req, res) => {
    const { equipmentId } = req.params;

    try {
        const blockedIntervals = [];


        const usersSnapshot = await db.collection('users').get();
        for (const userDoc of usersSnapshot.docs) {
            const cartRef = userDoc.ref.collection('cart');
            const cartItems = await cartRef.where('equipmentId', '==', equipmentId).get();

            cartItems.forEach(doc => {
                const data = doc.data();
                if (data.startDate && data.endDate) {
                    blockedIntervals.push({
                        start: data.startDate.toDate().getTime(),
                        end: data.endDate.toDate().getTime()
                    });
                }
            });
        }


        const rentalsSnapshot = await db.collection('rentals').get();
        rentalsSnapshot.forEach(doc => {
            const rental = doc.data();
            rental.items.forEach(item => {
                if (item.equipmentId === equipmentId && item.startDate && item.endDate) {
                    blockedIntervals.push({
                        start: item.startDate.toDate().getTime(), // 🔥 helyes típuskezelés
                        end: item.endDate.toDate().getTime()
                    });
                }
            });
        });

        res.status(200).json(blockedIntervals);
    } catch (error) {
        console.error('Error fetching cart blocks:', error);
        res.status(500).json({ error: 'Failed to fetch blocked intervals' });
    }
});


app.get('/api/rental-history/:equipmentId', async (req, res) => {
    const { equipmentId } = req.params;

    try {
        const rentalsSnapshot = await db.collection('rentals').get();
        const history = [];

        for (const rentalDoc of rentalsSnapshot.docs) {
            const rental = rentalDoc.data();
            for (const item of rental.items) {
                if (item.equipmentId === equipmentId) {
                    let userEmail = 'Ismeretlen';

                    try {
                        const userDoc = await db.collection('users').doc(rental.userId).get();
                        if (userDoc.exists) {
                            userEmail = userDoc.data().email || 'Nincs email';
                        }
                    } catch (err) {
                        console.error('Hiba az email lekérésénél:', err);
                    }

                    history.push({
                        rentalId: rentalDoc.id,
                        userId: rental.userId,
                        userEmail: userEmail,
                        startDate: item.startDate.toDate(),
                        endDate: item.endDate.toDate(),
                        pricePerDay: item.pricePerDay,
                        totalPrice: item.pricePerDay * (Math.ceil((item.endDate.toDate() - item.startDate.toDate()) / (1000 * 60 * 60 * 24)) + 1),
                        status: item.status || rental.status || 'unknown'
                    });
                }
            }
        }

        res.status(200).json(history);
    } catch (error) {
        console.error('Hiba a rental history lekérésekor:', error);
        res.status(500).json({ error: 'Nem sikerült lekérni a bérlési előzményeket.' });
    }
});

app.get('/api/admin/rentals', async (req, res) => {
    try {
        const rentalsSnapshot = await db.collection('rentals').orderBy('createdAt', 'desc').get();
        const rentals = [];

        for (const docSnap of rentalsSnapshot.docs) {
            const rental = docSnap.data();
            let userEmail = 'Ismeretlen';

            try {
                const userDoc = await db.collection('users').doc(rental.userId).get();
                if (userDoc.exists) {
                    userEmail = userDoc.data().email || 'Nincs email';
                }
            } catch (err) {
                console.error('Hiba user email lekérésénél:', err);
            }

            rentals.push({
                id: docSnap.id,
                userId: rental.userId,
                userEmail,
                items: rental.items,
                totalAmount: rental.totalAmount,
                status: rental.status,
                createdAt: rental.createdAt ? rental.createdAt.toDate() : null
            });
        }

        res.status(200).json(rentals);
    } catch (error) {
        console.error('Admin rental listázási hiba:', error);
        res.status(500).json({ error: 'Nem sikerült lekérni a bérléseket.' });
    }
});

app.put('/api/admin/rentals/:rentalId/status', async (req, res) => {
    const { rentalId } = req.params;
    const { status } = req.body;

    try {
        await db.collection('rentals').doc(rentalId).update({ status });
        res.status(200).json({ message: 'Státusz frissítve.' });
    } catch (error) {
        console.error('Hiba státusz frissítésénél:', error);
        res.status(500).json({ error: 'Nem sikerült a státuszt frissíteni.' });
    }
});



async function clearUserCart(userId) {
    console.log('clearUserCart hívva userId:', userId);
    const cartRef = db.collection('users').doc(userId).collection('cart');
    const snapshot = await cartRef.get();

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('Kosár törölve!');

}


app.get('/api/test', async (req, res) => {
    try {
        const snapshot = await db.collection('users').get();
        if (snapshot.empty) {
            return res.status(404).json({ error: 'No documents found' });
        }

        const data = snapshot.docs.map(doc => doc.data());
        res.status(200).json(data);
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        res.status(500).json({ error: error.message });
    }
});


app.put('/api/admin/rentals/:rentalId/items/:itemIndex/status', async (req, res) => {
    const { rentalId, itemIndex } = req.params;
    const { status } = req.body;
    const idx = parseInt(itemIndex, 10);
    if (!['active', 'completed'].includes(status) || isNaN(idx)) {
        return res.status(400).json({ error: 'Érvénytelen státusz vagy index.' });
    }
    const rentalRef = db.collection('rentals').doc(rentalId);
    const snap = await rentalRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Bérlés nem található.' });


    const data = snap.data();
    const items = Array.isArray(data.items) ? [...data.items] : [];
    if (idx < 0 || idx >= items.length) {
        return res.status(400).json({ error: 'Index kívül esik a tömbön.' });
    }
    items[idx] = { ...items[idx], status };


    await rentalRef.update({ items });
    res.json({ message: 'Eszköz státusz frissítve.' });
});

app.get('/api/stats', async (req, res) => {
    try {
        const rentalsSnapshot = await db.collection('rentals').get();
        const rentals = rentalsSnapshot.docs.map(doc => doc.data());

        let totalRevenue = 0;
        const revenueByMonth = {};
        const rentalsByDate = {};
        const equipmentMap = {};
        let totalDays = 0;
        let totalRentals = 0;

        const formatMonth = (date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const formatDate = (date) => date.toISOString().split('T')[0];

        for (const rental of rentals) {
            const createdAt = rental.createdAt?.toDate?.();
            if (!createdAt) continue;

            const monthKey = formatMonth(createdAt);
            const dateKey = formatDate(createdAt);

            totalRevenue += rental.totalAmount || 0;
            revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (rental.totalAmount || 0);
            rentalsByDate[dateKey] = (rentalsByDate[dateKey] || 0) + 1;

            for (const item of rental.items || []) {
                if (item.startDate && item.endDate) {
                    const start = item.startDate.toDate?.();
                    const end = item.endDate.toDate?.();
                    if (start && end) {
                        const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
                        totalDays += days;
                        totalRentals++;
                    }
                }

                if (item.equipmentId) {
                    const key = item.name || item.equipmentId;
                    equipmentMap[key] = (equipmentMap[key] || 0) + 1;
                }
            }
        }

        const revenueArr = Object.entries(revenueByMonth).map(([month, total]) => ({ month, total }));
        const rentalsArr = Object.entries(rentalsByDate).map(([date, count]) => ({ date, count }));
        const topEquipment = Object.entries(equipmentMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const averageRentalDays = totalRentals ? totalDays / totalRentals : 0;

        res.json({
            totalRevenue,
            revenueByMonth: revenueArr,
            rentalsByDate: rentalsArr,
            topEquipment,
            averageRentalDays
        });
    } catch (err) {
        console.error('❌ /api/stats error:', err);
        res.status(500).json({ error: 'Failed to compute statistics' });
    }
});

cron.schedule('* * * * *', async () => {
    console.log('⏰ Kosár tisztítás indul...');

    try {
        const usersSnapshot = await db.collection('users').get();
        const now = new Date();

        for (const userDoc of usersSnapshot.docs) {
            const cartRef = userDoc.ref.collection('cart');
            const cartItems = await cartRef.get();

            for (const item of cartItems.docs) {
                const data = item.data();
                const addedAt = data.addedAt?.toDate?.();

                if (addedAt) {
                    const minutesElapsed = (now - addedAt) / 1000 / 60;
                    if (minutesElapsed > 1) {
                        console.log(`🗑️ Törlés: ${item.id} (${minutesElapsed.toFixed(1)} perc)`);
                        await item.ref.delete();
                    }
                }
            }
        }

        console.log('✅ Kosártisztítás befejezve.');
    } catch (error) {
        console.error('❌ Kosártisztítás hiba:', error);
    }
});

cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Daily check: promoting rentals from upcoming to active...');

    try {
        const now = new Date();
        const snapshot = await db.collection('rentals').where('status', '==', 'upcoming').get();

        for (const doc of snapshot.docs) {
            const rental = doc.data();
            const shouldActivate = rental.items.some(item => getDate(item.startDate) <= now);

            if (shouldActivate) {
                const updatedItems = rental.items.map(item => {
                    const start = getDate(item.startDate);
                    return {
                        ...item,
                        status: start <= now ? 'active' : item.status
                    };
                });

                await doc.ref.update({
                    status: 'active',
                    items: updatedItems
                });

                console.log(`✅ Rental ${doc.id} promoted to active.`);
            }
        }

        console.log('✅ Rental status update complete.');
    } catch (error) {
        console.error('❌ Error in daily rental promotion cron:', error);
    }
});

function getDate(d) {
    return d && typeof d.toDate === 'function' ? d.toDate() : new Date(d);
}


app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
});


