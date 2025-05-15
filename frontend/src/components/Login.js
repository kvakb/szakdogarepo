import React, { useState, useContext } from "react";
import { auth, db } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { UserContext } from "../userContext";
import "./Auth.css";

function SignIn() {
    const { currentUser, setCurrentUser } = useContext(UserContext); // ✅ Most már `setCurrentUser`-t használunk!

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Firestore lekérdezés a felhasználói adatok lekérdezéséhez
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                // 🔹 `setCurrentUser` frissíti a UserContext-et
                setCurrentUser({ email: userData.email, name: userData.name, uid: user.uid });
                setSuccess("User signed in successfully!");
            } else {
                throw new Error("No user data found in Firestore.");
            }

            console.log("User signed in successfully:", user);
        } catch (error) {
            console.error("Error during sign in:", error);
            setError(error.message);
        }
    };

    return (
        <div className="auth-container">
            <h2>Sign In</h2>
            <form className="auth-form" onSubmit={handleSignIn}>
                <label>
                    Email:
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                    Password:
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit">Sign In</button>
            </form>
        </div>
    );
}

export default SignIn;
