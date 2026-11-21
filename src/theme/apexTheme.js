import { createTheme } from '@mantine/core';

/** Escala Mantine (índice 6 = tono principal, índice 8 = alto contraste AA con texto blanco) */
const apexPrimary = [
    '#fff4eb',
    '#ffe0cc',
    '#ffc999',
    '#ffb066',
    '#FFCC66',
    '#ff8526',
    '#FF6A00',
    '#d95800',
    '#c95000',
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
    '#0d101f',
];

export const apexTheme = createTheme({
    primaryColor: 'apex',
    primaryShade: { light: 7, dark: 6 },
    colors: {
        apex: apexPrimary,
        secondary: apexSecondary,
    },
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    headings: {
        fontWeight: '700',
        color: 'var(--ag-text-primary)',
    },
    defaultRadius: 'md',
    focusRing: 'auto',
    components: {
        Button: {
            defaultProps: {
                color: 'apex',
            },
            styles: {
                root: {
                    minHeight: '36px',
                },
            },
        },
        ActionIcon: {
            styles: {
                root: {
                    minWidth: '36px',
                    minHeight: '36px',
                },
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
                    minWidth: '36px',
                    minHeight: '36px',
                },
            },
        },
    },
});
