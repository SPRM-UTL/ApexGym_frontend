import { createTheme } from '@mantine/core';

/** Escala Mantine (índice 6 = tono principal) basada en #FF6A00 */
const apexPrimary = [
    '#fff4eb',
    '#ffe0cc',
    '#ffc999',
    '#ffb066',
    '#FFCC66',
    '#ff8526',
    '#FF6A00',
    '#e55f00',
    '#cc5500',
    '#a84400',
];

const apexSecondary = [
    '#e8e9ef',
    '#c5c7d5',
    '#a2a5bb',
    '#7f839f',
    '#5c6183',
    '#393f67',
    '#1B1F3A',
    '#171a32',
    '#121526',
    '#0d101f',];


export const apexTheme = createTheme({
    primaryColor: 'apex',
    colors: {
        apex: apexPrimary,
        secondary: apexSecondary,
    },
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    headings: {
        fontWeight: '700',
        color: 'var(--ag-color-primary)',
    },
    defaultRadius: 'md',
    components: {
        Button: {
            defaultProps: {
                color: 'apex',
            },
        },
        Modal: {
            styles: {
                header: {
                    backgroundColor: 'var(--ag-color-secondary)',
                    padding: 'var(--mantine-spacing-md) var(--mantine-spacing-lg)',
                },
                title: {
                    color: '#ffffff',
                    fontWeight: 700,
                },
                close: {
                    color: '#ffffff',
                },
            },
        },
    },
});
