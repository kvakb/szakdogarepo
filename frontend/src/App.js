import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import About from './components/About';
import Equipment from './components/Equipment';
import Navbar from './components/Navbar';
import SignUp from './components/SignUp';
import SignIn from './components/Login';
import EquipmentCRUD from './components/EquipmentCRUD';
import AdminRoute from './components/AdminRoute';
import Profile from './components/Profile';
import { UserProvider } from './userContext';
import AddEquipment from "./components/AddEquipment";
import EditEquipment from './components/EditEquipment';
import EquipmentDetail from "./components/EquipmentDetail";
import CompareEquipment from './components/CompareEquipment';
import { CartProvider } from './components/CartContext';
import Cart from "./components/Cart";
import CheckoutSuccess from './components/CheckoutSuccess';
import MyRentals from './components/myrentals.js';
import RentalHistory from './components/RentalHistory';
import ManageRentals from './components/ManageRentals.js';
import StatsDashboard from './components/StatsDashboard';

function App() {
    return (
        <CartProvider>
            <UserProvider>
                <Router>
                    <div>
                        <Navbar />
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/equipment" element={<Equipment />} />
                            <Route path="/equipment/:id" element={<EquipmentDetail />} />
                            <Route path="/compare" element={<CompareEquipment />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/checkout-success" element={<CheckoutSuccess />} />
                            <Route path="/myrentals" element={<MyRentals />} />
                            <Route path="/rental-history/:equipmentId" element={<RentalHistory />} />

                            <Route path="/signin" element={<SignIn />} />
                            <Route path="/signup" element={<SignUp />} />
                            <Route path="/profile" element={<Profile />} />

                            {/* Admin-only routes */}
                            <Route path="/equipment-crud" element={<AdminRoute><EquipmentCRUD /></AdminRoute>} />
                            <Route path="/admin-stats" element={<AdminRoute><StatsDashboard /></AdminRoute>} />
                            <Route path="/manage-rentals" element={<AdminRoute><ManageRentals /></AdminRoute>} />
                            <Route path="/add-equipment" element={<AdminRoute><AddEquipment /></AdminRoute>} />
                            <Route path="/edit-equipment/:id" element={<AdminRoute><EditEquipment /></AdminRoute>} />
                        </Routes>
                    </div>
                </Router>
            </UserProvider>
        </CartProvider>
    );
}

export default App;
