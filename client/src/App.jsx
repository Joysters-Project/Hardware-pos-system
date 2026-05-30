import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import SupplierList from './pages/suppliers/SupplierList';
import SupplierForm from './pages/suppliers/SupplierForm';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import PurchaseOrderList from './pages/procurement/PurchaseOrderList';
import CreatePurchaseOrder from './pages/procurement/CreatePurchaseOrder';
import PurchaseOrderDetail from './pages/procurement/PurchaseOrderDetail';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: 'white',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/suppliers" replace />} />
            
            {/* Suppliers */}
            <Route path="suppliers" element={<SupplierList />} />
            <Route path="suppliers/add" element={<SupplierForm />} />
            <Route path="suppliers/edit/:id" element={<SupplierForm />} />
            
            {/* Products*/ }
            <Route path="products" element={<ProductList />} />
            <Route path="products/add" element={<ProductForm />} />
            <Route path="products/edit/:id" element={<ProductForm />} />
            
            {/*  Procurement */}
           
            <Route path="procurement" element={<PurchaseOrderList />} />
            <Route path="procurement/create" element={<CreatePurchaseOrder />} />
            <Route path="procurement/:id" element={<PurchaseOrderDetail />} /> 
           
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
