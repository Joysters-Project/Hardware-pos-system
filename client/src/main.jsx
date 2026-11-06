import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Disable mouse wheel / trackpad sliding from changing number & float input values globally
document.addEventListener(
  'wheel',
  (e) => {
    if (
      (e.target instanceof HTMLInputElement && e.target.type === 'number') ||
      (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'number')
    ) {
      e.preventDefault();
      document.activeElement.blur();
    }
  },
  { passive: false }
);

// Disable Up/Down arrow keys from changing number & float input values globally
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
