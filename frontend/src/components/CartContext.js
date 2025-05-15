import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);

    const addToCart = (item) => {
        setCartItems(prev => {
            const exists = prev.find(i => i.equipmentId === item.equipmentId);
            if (exists) return prev;
            return [...prev, item];
        });
    };

    const removeFromCart = (equipmentId) => {
        setCartItems(prev => prev.filter(item => item.equipmentId !== equipmentId));
    };

    const clearCart = () => setCartItems([]);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
