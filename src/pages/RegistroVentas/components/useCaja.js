import { useContext } from 'react';
import { CajaContext } from './CajaContext.js';

export function useCaja() {
    const contexto = useContext(CajaContext);
    if (!contexto) {
        throw new Error('useCaja debe utilizarse dentro de CajaProvider.');
    }
    return contexto;
}
