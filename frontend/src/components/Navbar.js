import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../userContext";
import { auth } from "../firebaseConfig";
import "./Navbar.css";

function Navbar() {
    const { currentUser, setCurrentUser } = useContext(UserContext);
    const [isAdmin, setIsAdmin] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (currentUser) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    const response = await fetch("http://localhost:5100/api/check-admin", {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    });
                    const data = await response.json();
                    setIsAdmin(data.isAdmin);
                } catch (error) {
                    console.error("Error checking admin status:", error);
                    setIsAdmin(false);
                }
            }
        };

        const fetchCartCount = async () => {
            if (!currentUser) {
                setCartCount(0);
                return;
            }

            try {
                const res = await fetch(`http://localhost:5100/api/cart/${currentUser.uid}`);
                const data = await res.json();
                setCartCount(data.length);
            } catch (error) {
                console.error('Error fetching cart:', error);
                setCartCount(0);
            }
        };

        checkAdminStatus();
        fetchCartCount();
    }, [currentUser]);

    const handleLogout = async () => {
        await auth.signOut();
        setCurrentUser(null);
        setIsAdmin(false);
        setCartCount(0);
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                FrameHire
            </div>
            <ul className="navbar-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/equipment">Equipment</Link></li>
                <li><Link to="/compare">Compare</Link></li>

                {currentUser && <li><Link to="/myrentals">My Rentals</Link></li>}
                {currentUser && <li><Link to="/profile">Profile</Link></li>}
                {isAdmin && <li><Link to="/equipment-crud">Manage Equipment</Link></li>}
                {isAdmin && <li><Link to="/manage-rentals">Manage Rentals</Link></li>}
                {isAdmin && <li><Link to="/admin-stats">Statistics</Link></li>}

                {currentUser && (
                    <li>
                        <Link to="/cart">
                            🛒 Cart {cartCount > 0 && <span>({cartCount})</span>}
                        </Link>
                    </li>
                )}
            </ul>
            <div className="navbar-auth">
                {currentUser ? (
                    <>
                        <span>{currentUser.name}</span>
                        <button onClick={handleLogout} className="navbar-button">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/signin" className="navbar-button">Sign In</Link>
                        <Link to="/signup" className="navbar-button navbar-button-register">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
