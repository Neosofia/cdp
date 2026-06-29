import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/theme.css';
import App from './App.tsx';
import { UiThemeProvider } from '@/shared/core/uiTheme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UiThemeProvider>
        <App />
      </UiThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
