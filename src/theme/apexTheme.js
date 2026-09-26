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

export const apexTheme = createTheme({
    primaryColor: 'apex',
    colors: {
        apex: apexPrimary,
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
                    backgroundColor: 'var(--ag-color-primary)',
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
