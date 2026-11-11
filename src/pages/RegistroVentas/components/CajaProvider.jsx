import { CajaContext } from './CajaContext.js';

export function CajaProvider({ aperturas, children }) {
    return (
        <CajaContext.Provider value={{ aperturas }}>
            {children}
        </CajaContext.Provider>
    );
}
