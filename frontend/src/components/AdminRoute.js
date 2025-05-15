import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig'; // Győződj meg róla, hogy a helyes útvonalat adod meg
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function AdminRoute({ children }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmin = async () => {
            const user = auth.currentUser;
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().admin === true) {
                    setIsAdmin(true);
                } else {
                    navigate('/not-authorized'); // Átirányítás, ha nem admin
                }
            } else {
                navigate('/signin'); // Átirányítás, ha nincs bejelentkezve
            }
        };

        checkAdmin();
    }, [navigate]);

    return isAdmin ? children : null;
}

export default AdminRoute;
