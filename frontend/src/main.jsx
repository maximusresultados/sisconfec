import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Quando um chunk lazy não é encontrado (deploy novo substituiu hashes antigas),
// recarrega a página para buscar o index.html e chunks atualizados.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
