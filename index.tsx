import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import TechInfoPage from './components/TechInfoPage';
import CalendarPage from './components/CalendarPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Use query parameter routing to ensure compatibility with static hosting/preview environments
// that don't support SPA history API rewrites for sub-paths like /tech-info
const params = new URLSearchParams(window.location.search);

const page = params.get('page');

if (page === 'tech-info') {
    root.render(
        <React.StrictMode>
            <TechInfoPage />
        </React.StrictMode>
    );
} else if (page === 'calendar') {
    root.render(
        <React.StrictMode>
            <CalendarPage />
        </React.StrictMode>
    );
} else {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}