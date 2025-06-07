import React from 'react';

const AnimatedBackground: React.FC = () => (
    <>
        {/* Color blobs */}
        <div className="absolute inset-0 opacity-30 pointer-events-none select-none">
            <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-32 right-16 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full blur-2xl animate-bounce delay-500" />
            <div className="absolute bottom-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-2xl animate-pulse delay-2000" />
        </div>

        {/* Subtle radial grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
            <div
                className="w-full h-full"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    </>
);

export default AnimatedBackground;
