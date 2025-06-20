// royal_trainer_client/src/components/Router.tsx
import React, { useEffect, useState } from 'react';
import DiscordCallback from './discord/DiscordCallback';

interface RouterProps {
    children: React.ReactNode;
}

const Router: React.FC<RouterProps> = ({ children }) => {
    const [currentPath, setCurrentPath] = useState(window.location.pathname);

    useEffect(() => {
        const handlePopState = () => {
            setCurrentPath(window.location.pathname);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Handle Discord OAuth callback
    if (currentPath === '/auth/discord/callback') {
        return <DiscordCallback />;
    }

    // Default to main app
    return <>{children}</>;
};

export default Router;