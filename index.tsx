import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';

import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { AccountProvider } from './contexts/AccountContext';
import { ToastProvider } from './contexts/ToastContext';
import { SystemAlertProvider } from './contexts/SystemAlertContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AccountProvider>
          <ToastProvider>
            <SystemAlertProvider>
              <Routes>
                <Route path="/*" element={<App />} />
              </Routes>
            </SystemAlertProvider>
          </ToastProvider>
        </AccountProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
