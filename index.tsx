
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

const renderError = (message: string) => {
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: 'Tajawal', sans-serif;">
        <h2 style="color: #ef4444;">عذراً، حدث خطأ أثناء تشغيل النظام</h2>
        <div style="background: #fee2e2; padding: 20px; border-radius: 12px; margin-top: 20px; display: inline-block; text-align: right; direction: ltr;">
          <code>${message}</code>
        </div>
        <p style="margin-top: 20px; color: #64748b;">يرجى التأكد من اتصال الإنترنت وتحديث الصفحة.</p>
      </div>
    `;
  }
};

if (!rootElement) {
  console.error("Root element not found");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("React Mounting Error:", error);
    renderError(error instanceof Error ? error.message : String(error));
  }
}
