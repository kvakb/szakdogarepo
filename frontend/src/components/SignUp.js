import React, { useState, useContext } from 'react';
import { UserContext } from '../userContext';
import './Auth.css';

function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { setCurrentUser } = useContext(UserContext); // ✅ a context-ben ez van

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const response = await fetch('http://localhost:5100/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password, phoneNumber })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to sign up');
            }

            const data = await response.json();
            setCurrentUser({ uid: data.uid, email, name }); // ✅ helyesen nevezzük
            setSuccess('User signed up successfully!');
            console.log('User signed up successfully:', data);
        } catch (error) {
            console.error('Error during sign up:', error);
            setError(error.message);
        }
    };

    return (
        <div className="auth-container">
            <h2>Sign Up</h2>
            <form className="auth-form" onSubmit={handleSignUp}>
                <label>
                    Username:
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                    Email:
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                    Password:
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <label>
                    Phone:
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </label>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit">Sign Up</button>
            </form>
        </div>
    );
}

export default SignUp;
