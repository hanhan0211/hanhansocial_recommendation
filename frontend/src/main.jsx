import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import "./index.css";
import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="350021317415-tm735fskenbls3vg0que82nbc0dm2h5p.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)