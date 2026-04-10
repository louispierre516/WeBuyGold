import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TransactionsProvider } from "./context/TransactionsContext";
import './index.css'
import App from './App.jsx'
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <TransactionsProvider>
          <App />
        </TransactionsProvider>
      </StoreProvider> 
    </AuthProvider>
  </StrictMode>,
)
