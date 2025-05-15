import React, { useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateEmail, updatePassword } from 'firebase/auth';
import { UserContext } from '../userContext';
import './Profile.css';

function Profile() {
    const { currentUser, setCurrentUser } = useContext(UserContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadUserData = async () => {
            if (currentUser?.uid) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setName(userData.name || '');
                    setEmail(userData.email || '');
                    setPhoneNumber(userData.phoneNumber || '');
                } else {
                    console.error('No user data found in Firestore.');
                }
            }
        };

        loadUserData();
    }, [currentUser]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const userDocRef = doc(db, 'users', currentUser.uid);

            // Update Firebase Auth email
            if (auth.currentUser.email !== email) {
                await updateEmail(auth.currentUser, email);
            }

            // Update Firebase Auth password (if provided)
            if (newPassword) {
                await updatePassword(auth.currentUser, newPassword);
            }

            // Update Firestore
            await updateDoc(userDocRef, {
                name,
                email,
                phoneNumber
            });

            setCurrentUser({ ...currentUser, email, displayName: name });
            setSuccess('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(error.message);
        }
    };

    return (
        <div className="profile-container">
            <h2>Profile</h2>
            <form className="profile-form" onSubmit={handleProfileUpdate}>
                <label>
                    Name:
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                    Email:
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                    Phone Number:
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </label>
                <label>
                    New Password:
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave empty to keep current" />
                </label>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit">Update Profile</button>
            </form>
        </div>
    );
}

export default Profile;
