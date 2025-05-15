import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../userContext';

function CheckoutSuccess() {
    const navigate = useNavigate();
    const { currentUser } = useContext(UserContext);
    const [loading, setLoading] = useState(true);

    // Wait for UserContext to set currentUser
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500); // short delay to allow context to initialize

        return () => clearTimeout(timer);
    }, []);

    const handleGoToRentals = () => {
        navigate('/myrentals');
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <p>Checking login status...</p>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2>You have been logged out</h2>
                <p>Please log in again to view your rentals.</p>
                <button onClick={() => navigate('/signin')} style={{ marginTop: '1.5rem', padding: '0.8rem 1.5rem' }}>
                    Log In
                </button>
            </div>
        );
    }

    return (
        <div className="checkout-success" style={{ textAlign: 'center', marginTop: '4rem' }}>
            <h1>Rental Successful! 🎉</h1>
            <p>Thank you for renting with us, {currentUser.displayName || currentUser.email}!</p>
            <button onClick={handleGoToRentals} style={{ marginTop: '2rem', padding: '1rem 2rem', fontSize: '1.2rem' }}>
                View My Rentals
            </button>
        </div>
    );
}

export default CheckoutSuccess;
