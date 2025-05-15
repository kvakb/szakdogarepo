import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-content">
                    <h1>Welcome to FrameHire Rentals!</h1>
                    <p>Find and rent the best equipment for photography and filmmaking with ease.</p>
                    <button onClick={() => navigate('/equipment')}>Browse Gear</button>
                </div>
            </div>


            {/* Compare Section */}
            <div className="compare-section">
                <h2>Not Sure What to Choose?</h2>
                <p>Use our comparison tool to evaluate gear side by side and make the best decision for your needs.</p>
                <button onClick={() => navigate('/compare')}>Compare Equipment</button>
            </div>
        </div>
    );
}

export default Home;
