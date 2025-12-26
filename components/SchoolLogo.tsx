import React from 'react';

interface SchoolLogoProps {
    className?: string;
    size?: number | string;
    isPaused?: boolean;
}

const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = "", size = "100%", isPaused = false }) => {
    // Hardcoded white to ensure it matches the reference image exactly
    const color = "#ffffff";
    const keyColor = "#ffffff"; // White for all pages except Christmas mode
    const bgColor = "#0e2a22"; // Used to mask the lines behind the key head

    return (
        <div className={`school-logo-container ${className} ${isPaused ? 'animations-paused' : ''}`}>
            <style>{`
                .animations-paused *,
                .animations-paused #orbits,
                .animations-paused #key,
                .animations-paused .star,
                .animations-paused .outer-rim,
                .animations-paused .weaving-segment {
                    animation-play-state: paused !important;
                }

                #orbits {
                    /* Animation removed - static */
                    transform-origin: 200px 200px;
                }

                .key-part {
                    animation: float 8s ease-in-out infinite;
                    transform-origin: 200px 10px;
                    filter: url(#keyEffect);
                }

                .star {
                    animation: twinkle 1.5s ease-in-out infinite alternate;
                    transform-origin: center;
                    transform-box: fill-box;
                }

                .weaving-segment {
                    display: none;
                }

                /* --- ELEGANT CHRISTMAS MODE --- */
                .christmas-mode .school-logo-container svg {
                    overflow: visible !important;
                }

                /* Outer Rim - Gentle Holiday Pulse */
                .christmas-mode .outer-rim {
                    stroke: url(#christmasRimGradient) !important;
                    stroke-width: 14px;
                    stroke-dasharray: none;
                    stroke-linecap: round;
                    animation: holidayPulse 4s ease-in-out infinite alternate;
                }

                /* Background Rings - Futuristic Gradient Flow */
                .christmas-mode #orbits ellipse {
                    stroke: url(#ringGradient) !important;
                    stroke-width: 8px;
                    opacity: 1.0;
                    filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.8)) brightness(1.3);
                }
                
                /* Animate Gradient Stops for Rings */
                .christmas-mode #ringGradient stop:nth-child(1) { animation: gradientShiftRing1 8s ease-in-out infinite alternate; }
                .christmas-mode #ringGradient stop:nth-child(2) { animation: gradientShiftRing2 8s ease-in-out infinite alternate; }

                /* Key - Futuristic Metallic Flow */
                .christmas-mode .key-part line,
                .christmas-mode #key-head circle { 
                    stroke: url(#keyGradient) !important;
                    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8)) brightness(1.2);
                }
                
                /* Animate Gradient Stops for Key */
                .christmas-mode #keyGradient stop:nth-child(1) { animation: gradientShiftKey1 6s ease-in-out infinite alternate; }
                .christmas-mode #keyGradient stop:nth-child(2) { animation: gradientShiftKey2 6s ease-in-out infinite alternate; }

                /* --- GRADIENT ANIMATIONS --- */
                
                @keyframes gradientShiftRing1 {
                    0% { stop-color: #ff0033; }   /* Saturated Red-Pink */
                    100% { stop-color: #00ff66; } /* Saturated Spring Green */
                }
                @keyframes gradientShiftRing2 {
                    0% { stop-color: #00ffcc; }   /* Cyan-ish Green */
                    100% { stop-color: #ffffff; } /* White */
                }

                @keyframes gradientShiftKey1 {
                    0% { stop-color: #ffcc00; }   /* Deep Vivid Gold */
                    100% { stop-color: #ff8800; } /* Vivid Orange-Gold */
                }
                @keyframes gradientShiftKey2 {
                    0% { stop-color: #ffee00; }   /* Bright Neon Yellow */
                    100% { stop-color: #ffffff; } /* White */
                }
                
                /* Key Container - Enhanced Glow */
                .christmas-mode .key-part {
                    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6));
                }
                
                @keyframes holidayPulse {
                    0% { filter: drop-shadow(0 0 2px rgba(231, 76, 60, 0.4)); stroke-width: 14px; }
                    100% { filter: drop-shadow(0 0 8px rgba(46, 204, 113, 0.6)); stroke-width: 15px; }
                }

                /* -------------------------------------- */

                @keyframes starTwinkle {
                    0%, 100% { opacity: 0; transform: scale(0) translate(0, 0); }
                    20%, 40% { opacity: 1; transform: scale(1) translate(0, 0); }
                    50% { opacity: 0; transform: scale(0) translate(15px, -15px); } /* Move while hidden */
                    70%, 90% { opacity: 1; transform: scale(1) translate(15px, -15px); }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .orbit-diagonal {
                    transform-origin: 200px 200px;
                    animation: rotateDiagonal 7s ease-in-out infinite;
                }

                .orbit-horizontal {
                    transform-origin: 200px 200px;
                    animation: rotateHorizontal 6s ease-in-out infinite;
                }

                @keyframes rotateDiagonal {
                    0%, 100% { transform: rotate(-43deg); }
                    50% { transform: rotate(-47deg); }
                }

                @keyframes rotateHorizontal {
                    0%, 100% { transform: rotate(-2deg); }
                    50% { transform: rotate(2deg); }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(6px) rotate(-2deg); }
                    50% { transform: translateY(-6px) rotate(2deg); }
                }

                @keyframes twinkle {
                    0%, 100% { opacity: 0; transform: scale(0) translate(0, 0); }
                    25% { opacity: 1; transform: scale(1.2) translate(0, 0); }
                    50% { opacity: 0; transform: scale(0) translate(-20px, 10px); } /* Jump to new spot */
                    75% { opacity: 1; transform: scale(1.2) translate(-20px, 10px); }
                }
            `}</style>
            <svg 
                width={size}
                height={size}
                viewBox="0 0 400 400" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ 
                    shapeRendering: 'geometricPrecision',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                }}
            >
                <defs>
                    <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <filter id="christmasGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feColorMatrix in="blur" type="saturate" values="2" result="saturatedBlur" />
                        <feComposite in="SourceGraphic" in2="saturatedBlur" operator="over" />
                    </filter>

                    <filter id="keyEffect" x="-50%" y="-50%" width="200%" height="200%">
                        {/* Shadow part */}
                        <feDropShadow dx="3" dy="3" stdDeviation="2" floodOpacity="0.5" />
                        {/* Glow part */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="glowBlur" />
                        <feComposite in="SourceGraphic" in2="glowBlur" operator="over" />
                    </filter>

                    {/* Segmented Christmas Rim Gradient (Sharp Stops) */}
                    <linearGradient id="christmasRimGradient" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="400" y2="200">
                        <stop offset="0%" stopColor="#ff4d4d" />
                        <stop offset="20%" stopColor="#ff4d4d" />
                        <stop offset="20%" stopColor="#2ecc71" />
                        <stop offset="40%" stopColor="#2ecc71" />
                        <stop offset="40%" stopColor="#f1c40f" />
                        <stop offset="60%" stopColor="#f1c40f" />
                        <stop offset="60%" stopColor="#ffffff" />
                        <stop offset="80%" stopColor="#ffffff" />
                        <stop offset="80%" stopColor="#ff4d4d" />
                        <stop offset="100%" stopColor="#ff4d4d" />
                    </linearGradient>

                    {/* Futuristic Gradient for Rings */}
                    <linearGradient id="ringGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="400">
                        <stop offset="0%" stopColor="#ff0000" />
                        <stop offset="100%" stopColor="#00ff00" />
                    </linearGradient>

                    {/* Futuristic Metallic Gradient for Key */}
                    <linearGradient id="keyGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="400">
                        <stop offset="0%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#f1c40f" />
                    </linearGradient>
                </defs>

                <g className="christmas-glow-group">
                    <g filter="url(#softGlow)">
                        {/* 1. Outer Circle (Static) - Thicker (6) */}
                        <circle 
                            cx="200" 
                            cy="200" 
                            r="190" 
                            fill="none" 
                            stroke={color} 
                            strokeWidth="6" 
                            className="outer-rim"
                        />

                        {/* LAYER 1: Key Bottom (Shaft & Teeth) - BEHIND RINGS */}
                        <g transform="translate(-8, -8) rotate(-45 200 200)">
                            <g className="key-part">
                                {/* Key Shaft (Bottom Half) */}
                                <line x1="200" y1="200" x2="200" y2="390" stroke={keyColor} strokeWidth="14" strokeLinecap="round" />
                                {/* Key Teeth */}
                                <line x1="200" y1="315" x2="240" y2="315" stroke={keyColor} strokeWidth="14" strokeLinecap="round" />
                                <line x1="200" y1="350" x2="230" y2="350" stroke={keyColor} strokeWidth="14" strokeLinecap="round" />
                            </g>
                        </g>

                        {/* LAYER 2: Orbit Rings */}
                        <g id="orbits" style={{ filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.2))' }}>
                            {/* Diagonal Ring */}
                            <ellipse 
                                cx="200" cy="200" rx="190" ry="85" 
                                fill="none" stroke={color} strokeWidth="8" 
                                className="orbit-diagonal"
                            />
                            {/* Horizontal Ring */}
                            <ellipse 
                                cx="200" cy="200" rx="190" ry="65" 
                                fill="none" stroke={color} strokeWidth="8" 
                                className="orbit-horizontal"
                            />
                        </g>

                        {/* LAYER 3: Key Top (Head) - IN FRONT OF RINGS */}
                        <g transform="translate(-8, -8) rotate(-45 200 200)">
                            <g className="key-part">
                                {/* Key Shaft (Top Half) */}
                                <line x1="200" y1="41" x2="200" y2="200" stroke={keyColor} strokeWidth="14" strokeLinecap="round" />
                                
                                <g id="key-head">
                                    {/* Top tucked in */}
                                    <circle cx="200" cy="41" r="22" fill={bgColor} stroke={keyColor} strokeWidth="5" />
                                    {/* Left tucked in */}
                                    <circle cx="168" cy="71" r="26" fill={bgColor} stroke={keyColor} strokeWidth="5" />
                                    {/* Right tucked in */}
                                    <circle cx="232" cy="71" r="26" fill={bgColor} stroke={keyColor} strokeWidth="5" />
                                    
                                    {/* Middle Circle ON TOP */}
                                    <circle cx="200" cy="71" r="22" fill={bgColor} stroke={keyColor} strokeWidth="5" />

                                    {/* Thick line below head (Collar) */}
                                    <line x1="178" y1="105" x2="222" y2="105" stroke={keyColor} strokeWidth="12" strokeLinecap="round" />
                                </g>
                            </g>
                        </g>

                        {/* 5. The Stars (Sparkles) */}
                        <g fill={color}>
                            <path className="star" style={{ animationDuration: '4s' }} d="M 290 145 C 340 145 340 145 340 95 C 340 145 340 145 390 145 C 340 145 340 145 340 195 C 340 145 340 145 290 145 Z" />
                            <path className="star" style={{ animationDuration: '5.5s' }} d="M 25 185 C 75 185 75 185 75 135 C 75 185 75 185 125 185 C 75 185 75 185 75 235 C 75 185 75 185 25 185 Z" />
                            <path className="star" style={{ animationDuration: '7s' }} d="M 205 330 C 255 330 255 330 255 280 C 255 330 255 330 305 330 C 255 330 255 330 255 380 C 255 330 255 330 205 330 Z" />
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    );
};

export default SchoolLogo;