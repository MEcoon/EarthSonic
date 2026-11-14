import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SonificationProvider } from './audio/SonificationContext'
import './styles/tokens.css'
import './styles/global.css'
import './styles/readability.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SonificationProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SonificationProvider>
  </React.StrictMode>,
)
