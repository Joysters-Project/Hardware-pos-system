import BillingSystem from './components/billingSystem';
// 1. Import your logo from the assets folder
import shopLogo from './assets/logo.png'; 

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Updated Navigation Bar with Branding */}
      <nav style={{ 
        backgroundColor: 'var(--dark-maroon)', 
        color: 'white', 
        padding: '10px 30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* 2. Display the Shop Logo */}
          <img 
            src={shopLogo} 
            alt="Mathumithan Hardware Logo" 
            style={{ height: '50px', width: '50px', objectFit: 'contain', borderRadius: '4px' }} 
          />
          
          {/* 3. Updated Shop Name */}
          <h1 style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '1px', fontWeight: '800' }}>
            MATHUMITHAN HARDWARE
          </h1>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.9rem', opacity: 0.9 }}>
          <div>POS Terminal: Unit 01</div>
          <div>{new Date().toLocaleDateString()}</div>
        </div>
      </nav>
      
      <main style={{ flex: 1 }}>
        <BillingSystem />
      </main>
    </div>
  );
}

export default App;