import React from 'react';
import BillingSystem from './components/billingSystem';
import shopLogo from './assets/logo.png'; // Your Mathumithan logo

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Mathumithan Branding */}
      <nav style={{ 
        backgroundColor: '#4d0000', 
        color: 'white', 
        padding: '10px 30px', 
        display: 'flex', 
        alignItems: 'center',
        gap: '20px'
      }}>
        <img src={shopLogo} alt="Logo" style={{ height: '50px' }} />
        <h1 style={{ margin: 0 }}>MATHUMITHAN HARDWARE</h1>
      </nav>
      
      {/* Main POS Content */}
      <main style={{ flex: 1 }}>
        <BillingSystem />
      </main>
    </div>
  );
}

export default App;