import React, { useContext, useEffect, useState } from 'react';
import './Cart.css';
import { formatInTimeZone } from 'date-fns-tz';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../userContext';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51RIrq1P926U3dZALWYh1qKOJPmr2mHrAyoenUld2EdoZFpHN4E9r0G879NBQgrV6FGyYT0ikfg6ShBZPWZL341IQ00ni844Gq6');

function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCart = async () => {
            if (!currentUser) return;

            try {
                console.log('Fetching cart from backend...');
                const res = await fetch(`http://localhost:5100/api/cart/${currentUser.uid}`);
                const data = await res.json();
                console.log('Cart data:', data);
                setCartItems(data);
            } catch (err) {
                console.error('Error fetching cart:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCart();
    }, [currentUser]);

    const formatDate = (dateObj) => {
        if (!dateObj) return '';

        try {
            let date;
            if (typeof dateObj === 'number') {
                date = new Date(dateObj);
            } else if (typeof dateObj === 'object' && dateObj._seconds !== undefined) {
                date = new Date(dateObj._seconds * 1000);
            } else if (typeof dateObj === 'string') {
                date = new Date(dateObj);
            } else {
                console.error('Unknown date type:', dateObj);
                return '';
            }

            if (isNaN(date.getTime())) {
                console.error('Invalid date object:', dateObj);
                return '';
            }

            return formatInTimeZone(date, 'Europe/Budapest', 'yyyy.MM.dd');
        } catch (error) {
            console.error('Date formatting error:', error, dateObj);
            return '';
        }
    };

    const calculateRentalTotal = () => {
        return cartItems.reduce((total, item) => {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);

            if (isNaN(start) || isNaN(end)) {
                console.error('Invalid start or end date:', item);
                return total;
            }

            const diffTime = end - start;
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (isNaN(days) || isNaN(item.pricePerDay)) {
                console.error('Invalid days calculation or price:', item);
                return total;
            }

            console.log(`Equipment: ${item.name} - ${days} days * ${item.pricePerDay} Ft/day`);

            return total + (days * item.pricePerDay);
        }, 0);
    };

    const handleRemove = async (equipmentId) => {
        try {
            console.log('Removing item from cart, equipmentId:', equipmentId);
            await fetch(`http://localhost:5100/api/cart/${currentUser.uid}/${equipmentId}`, {
                method: 'DELETE'
            });
            setCartItems(prev => prev.filter(item => item.equipmentId !== equipmentId));
        } catch (err) {
            console.error('Error removing item:', err);
        }
    };

    const handleClear = async () => {
        const confirmClear = window.confirm('Are you sure you want to clear all items from the cart?');
        if (!confirmClear) return;

        try {
            console.log('Clearing cart...');
            const res = await fetch(`http://localhost:5100/api/cart/${currentUser.uid}`);
            const items = await res.json();

            for (const item of items) {
                await fetch(`http://localhost:5100/api/cart/${currentUser.uid}/${item.equipmentId}`, {
                    method: 'DELETE'
                });
            }

            setCartItems([]);
        } catch (err) {
            console.error('Error clearing cart:', err);
        }
    };

    const cleanCartItems = cartItems.map(item => ({
        equipmentId: item.equipmentId,
        name: item.name,
        pricePerDay: item.pricePerDay,
        imageUrl: item.imageUrl,
        startDate: item.startDate,
        endDate: item.endDate,
        quantity: item.quantity
    }));

    const handleCheckout = async () => {
        try {
            console.log('Starting payment...');
            const stripe = await stripePromise;

            const response = await fetch(`http://localhost:5100/api/create-checkout-session/${currentUser.uid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cartItems: cleanCartItems })
            });

            const session = await response.json();

            console.log('Backend response:', session);

            if (!session.id) {
                console.error('Missing session ID!');
                return;
            }

            const result = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (result.error) {
                console.error('Stripe redirect error:', result.error.message);
            }
        } catch (error) {
            console.error('Checkout error:', error);
        }
    };

    if (loading) return <div>Loading...</div>;

    const totalPrice = calculateRentalTotal();

    return (
        <div className="cart-container">
            <h2>Cart</h2>

            {cartItems.length === 0 ? (
                <p>Your cart is empty.</p>
            ) : (
                <>
                    <ul className="cart-list">
                        {cartItems.map((item, index) => (
                            <li key={index} className="cart-item">
                                <img src={item.imageUrl} alt={item.name} />
                                <div className="cart-info">
                                    <h3>{item.name}</h3>
                                    <p><strong>Price:</strong> {item.pricePerDay} Ft / day</p>
                                    <p><strong>Rental:</strong> {formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
                                </div>
                                <button onClick={() => handleRemove(item.equipmentId)}>Remove</button>
                            </li>
                        ))}
                    </ul>

                    <div className="cart-summary">
                        <h3>Total: {totalPrice.toLocaleString('hu-HU')} Ft</h3>
                    </div>

                    <div className="cart-actions">
                        <button onClick={handleClear}>Clear Cart</button>
                        <button onClick={handleCheckout}>Proceed to Payment</button>
                    </div>
                </>
            )}
        </div>
    );
}

export default Cart;
