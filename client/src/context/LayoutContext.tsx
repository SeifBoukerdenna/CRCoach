import React, { createContext, useState, useContext, ReactNode } from 'react';

interface LayoutContextType {
    isLeftCollapsed: boolean;
    isRightCollapsed: boolean;
    setIsLeftCollapsed: (collapsed: boolean) => void;
    setIsRightCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType>({
    isLeftCollapsed: false,
    isRightCollapsed: false,
    setIsLeftCollapsed: () => { },
    setIsRightCollapsed: () => { },
});

interface LayoutProviderProps {
    children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);

    // Update layout classes whenever collapse states change
    React.useEffect(() => {
        const layout = document.querySelector('.cr-layout');
        if (layout && layout instanceof HTMLElement) {
            // Remove all layout state classes
            layout.classList.remove('left-collapsed', 'right-collapsed', 'both-collapsed');

            // Apply appropriate class based on current state
            if (isLeftCollapsed && isRightCollapsed) {
                layout.classList.add('both-collapsed');
            } else if (isLeftCollapsed) {
                layout.classList.add('left-collapsed');
            } else if (isRightCollapsed) {
                layout.classList.add('right-collapsed');
            }
        }
    }, [isLeftCollapsed, isRightCollapsed]);

    return (
        <LayoutContext.Provider
            value={{
                isLeftCollapsed,
                isRightCollapsed,
                setIsLeftCollapsed,
                setIsRightCollapsed,
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayoutContext = () => useContext(LayoutContext);

export default LayoutContext;