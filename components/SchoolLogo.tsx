import React from 'react';

interface SchoolLogoProps {
    className?: string;
    size?: number | string;
    isPaused?: boolean;
}

const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = "", size = "100%", isPaused = false }) => {
    // Hardcoded white to ensure it matches the reference image exactly
    const color = "#ffffff";
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

                #key {
                    animation: float 4s ease-in-out infinite;
                    transform-origin: 200px 16px;
                    filter: url(#keyEffect);
                }

                .star {
                    animation: twinkle 1.5s ease-in-out infinite alternate;
                    transform-origin: center;
                    transform-box: fill-box;
                }

                .weaving-segment {
                    stroke: white;
                    stroke-width: 8px;
                    transition: stroke 0.5s ease;
                }

                /* --- ADVANCED CHRISTMAS COLOR & GLOW ANIMATIONS --- */
                .christmas-mode .school-logo-container svg {
                    overflow: visible !important;
                }

                .christmas-mode .christmas-glow-group {
                    filter: url(#christmasGlow);
                }

                .christmas-mode .outer-rim {
                    stroke: url(#christmasRimGradient) !important;
                    stroke-width: 14px;
                    stroke-dasharray: none; /* Reset if any */
                    animation: holidayGlowPulse 6s ease-in-out infinite;
                    stroke-linecap: round;
                }

                /* Festive Color Cycling for all elements */
                .christmas-mode #orbits ellipse, 
                .christmas-mode .weaving-segment {
                    stroke: url(#christmasRimGradient) !important;
                    stroke-width: 10px;
                }

                .christmas-mode #orbits ellipse:nth-child(2) {
                    animation: none; /* Gradient rotation handles movement */
                }

                .christmas-mode #key line { animation-name: colorShiftGold; animation-duration: 5s; } /* Slower color shift */
                .christmas-mode #key-head circle { animation-name: colorShiftRedGreen; fill: ${bgColor}; animation-duration: 5s; }
                .christmas-mode .star { 
                    animation: twinkle 1.2s ease-in-out infinite alternate, colorShiftAll 6s linear infinite; /* Slower twinkling */
                }

                @keyframes colorShiftRedGreen {
                    0%, 100% { stroke: #ff4d4d; }
                    50% { stroke: #2ecc71; }
                }

                @keyframes colorShiftGreenRed {
                    0%, 100% { stroke: #2ecc71; }
                    50% { stroke: #ff4d4d; }
                }

                @keyframes colorShiftGold {
                    0%, 100% { stroke: #f1c40f; }
                    50% { stroke: #ffffff; }
                }

                @keyframes colorShiftAll {
                    0% { fill: #ff4d4d; stroke: #ff4d4d; }
                    33% { fill: #2ecc71; stroke: #2ecc71; }
                    66% { fill: #f1c40f; stroke: #f1c40f; }
                    100% { fill: #ff4d4d; stroke: #ff4d4d; }
                }

                /* Keep the base animations but colorized */
                .christmas-mode #key {
                    animation: festiveRinging 8s ease-in-out infinite; /* Much slower ringing */
                    transform-origin: 200px 16px; /* Hinged at top point */
                    /* Strong festive shadow/glow */
                    filter: drop-shadow(4px 4px 4px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
                }

                @keyframes festiveRinging {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(4deg); }
                    75% { transform: rotate(-4deg); }
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

                @keyframes float {
                    0%, 100% { transform: translateY(5px); }
                    50% { transform: translateY(-20px); }
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
                        <animateTransform 
                            attributeName="gradientTransform" 
                            type="rotate" 
                            from="0 200 200" 
                            to="360 200 200" 
                            dur="6s" 
                            repeatCount="indefinite" 
                        />
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

                        {/* 2. Background Orbit Rings (Both behind key initially) */}
                        <g id="orbits">
                            {/* Diagonal Ring */}
                            <ellipse 
                                cx="200" cy="200" rx="190" ry="85" 
                                fill="none" stroke={color} strokeWidth="8" 
                                transform="rotate(-45 200 200)" 
                            />
                            {/* Horizontal Ring */}
                            <ellipse 
                                cx="200" cy="200" rx="190" ry="65" 
                                fill="none" stroke={color} strokeWidth="8" 
                                transform="rotate(0 200 200)" 
                            />
                        </g>

                        {/* 3. The Key (Diagonal alignment via nested transform) */}
                        <g transform="rotate(-45 200 200)">
                            <g id="key">
                                {/* Key Shaft - Slightly Thicker (14) */}
                                <line x1="200" y1="16" x2="200" y2="384" stroke={color} strokeWidth="14" strokeLinecap="round" />
                                
                                {/* Key Head - Shifted up and made slightly larger */}
                                <g id="key-head">
                                    {/* Top tucked in - Slightly larger (r=22) */}
                                    <circle cx="200" cy="41" r="22" fill={bgColor} stroke={color} strokeWidth="5" />
                                    {/* Left tucked in - Slightly larger (r=26) */}
                                    <circle cx="168" cy="71" r="26" fill={bgColor} stroke={color} strokeWidth="5" />
                                    {/* Right tucked in - Slightly larger (r=26) */}
                                    <circle cx="232" cy="71" r="26" fill={bgColor} stroke={color} strokeWidth="5" />
                                    
                                    {/* Middle Circle ON TOP - Slightly larger (r=22) */}
                                    <circle cx="200" cy="71" r="22" fill={bgColor} stroke={color} strokeWidth="5" />

                                    {/* Thick line below head (Collar) - Slightly wider (44px) and thicker (12) */}
                                    <line x1="178" y1="105" x2="222" y2="105" stroke={color} strokeWidth="12" strokeLinecap="round" />
                                </g>

                                {/* Key Teeth - Slightly Thicker (14) and Longer */}
                                <line x1="200" y1="310" x2="240" y2="310" stroke={color} strokeWidth="14" strokeLinecap="round" />
                                <line x1="200" y1="345" x2="230" y2="345" stroke={color} strokeWidth="14" strokeLinecap="round" />
                            </g>
                        </g>

                        {/* 4. Weaving Segments (Drawn OVER the key to create depth) */}
                        
                        {/* Segment 1: Top of horizontal ring (Key goes UNDER) */}
                        <ellipse 
                            cx="200" cy="200" rx="190" ry="65" 
                            fill="none" stroke={color} strokeWidth="8" 
                            strokeDasharray="100 1000" 
                            strokeDashoffset="50" /* Top center */
                            transform="rotate(0 200 200)" 
                            className="weaving-segment"
                        />

                        {/* Segment 2: Bottom-Right intersection (Key goes BELOW BOTH) */}
                        {/* We draw a bit of the diagonal ring here over the key */}
                        <ellipse 
                            cx="200" cy="200" rx="190" ry="85" 
                            fill="none" stroke={color} strokeWidth="8" 
                            strokeDasharray="120 1000" 
                            strokeDashoffset="-240" /* Adjusted to cover the ~4 o'clock intersection */
                            transform="rotate(-45 200 200)" 
                            className="weaving-segment"
                        />
                        
                        {/* We also draw a bit of the horizontal ring here over the key */}
                        <ellipse 
                            cx="200" cy="200" rx="190" ry="65" 
                            fill="none" stroke={color} strokeWidth="8" 
                            strokeDasharray="120 1000" 
                            strokeDashoffset="-240" /* Adjusted to cover the ~4 o'clock intersection */
                            transform="rotate(0 200 200)" 
                            className="weaving-segment"
                        />

                        {/* 5. The Stars (Sparkles) - Twinkling & Repositioned (Slightly smaller ~100 units) */}
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