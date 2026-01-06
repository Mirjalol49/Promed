import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AccountProvider } from './contexts/AccountContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { SystemAlertProvider } from './contexts/SystemAlertContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';


import { AuthProvider } from './contexts/AuthContext';

import { SettingsProvider } from './contexts/SettingsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccountProvider>
            <SettingsProvider>
              <ToastProvider>
                <SystemAlertProvider>
                  <Routes>
                    <Route path="/*" element={<App />} />
                  </Routes>
                </SystemAlertProvider>
              </ToastProvider>
            </SettingsProvider>
          </AccountProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
