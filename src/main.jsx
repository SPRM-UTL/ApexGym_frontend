import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';

import App from './App.jsx';
import { apexTheme } from './theme/apexTheme.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={apexTheme} defaultColorScheme="light">
      <ModalsProvider>
        <Notifications position="top-right" zIndex={2000000} />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>
);
