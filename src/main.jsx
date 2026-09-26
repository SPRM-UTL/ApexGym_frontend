import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
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
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </StrictMode>
);