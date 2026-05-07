// STEP 8 — React entry point.
//
// React 19's `createRoot` is the standard way to mount. We wrap the app in
// BrowserRouter once at the top so every component below can reach for
// `Link`, `useNavigate`, `useParams` without prop-drilling a router instance.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
