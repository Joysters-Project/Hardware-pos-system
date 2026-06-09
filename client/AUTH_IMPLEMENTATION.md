# Authentication Implementation Guide

## Overview
This authentication system implements a complete auth flow with the following features:
- ✅ Prevents back button navigation after logout
- ✅ Protects routes using token validation
- ✅ Redirects to login if not authenticated
- ✅ Implements role-based routing

## Architecture

### 1. AuthContext (`src/context/AuthContext.jsx`)
- **Main authentication manager** that provides global auth state
- **Methods:**
  - `login(userData, token, role)` - Store auth data
  - `logout()` - Clear auth data and prevent back navigation
  - `hasRole(requiredRole)` - Check if user has specific role
- **State:**
  - `isAuthenticated` - Boolean auth status
  - `user` - User object with name and role
  - `role` - Current user role
  - `loading` - Loading state during auth validation

### 2. ProtectedRoute (`src/components/ProtectedRoute.jsx`)
- **Route protection component** that wraps protected routes
- **Features:**
  - Validates token existence
  - Checks role-based access
  - Redirects to login if not authenticated
  - Prevents back button navigation
- **Usage:**
  ```jsx
  <Route 
    path="/dashboard/admin" 
    element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} 
  />
  ```

### 3. App.jsx Updates
- **AuthProvider wrapper** - Wraps BrowserRouter to provide auth context
- **AppRoutes** - Conditional routing based on authentication
- **Public routes** - Only shown when not authenticated
- **Protected routes** - Only accessible when authenticated

## How It Works

### Login Flow
1. User enters credentials in Login page
2. Login is submitted to backend (`/api/auth/login`)
3. Backend returns token and user data
4. `useAuth().login()` is called to store data in context and localStorage
5. User is redirected to dashboard

### Protected Navigation
1. When accessing a protected route, `ProtectedRoute` checks authentication
2. If no token → Redirect to login with `replace: true` (prevents back button)
3. If token exists but role doesn't match → Redirect to login
4. If authenticated and role matches → Render protected component

### Logout Flow
1. User clicks logout button
2. Special event listeners prevent back button navigation
3. `useAuth().logout()` clears all auth data
4. `window.history.pushState()` prevents browser back button
5. User is redirected to home with `replace: true`

### Back Button Prevention
After logout, the back button is disabled through:
1. **ProtectedRoute** uses `replace` in Navigate to prevent history stack
2. **Logout handler** uses `window.history.pushState()` to create new history entry
3. **popstate event** listener prevents going back to protected pages
4. **navigate() with replace: true** overwrites current history entry

## Usage Examples

### Using AuthContext in Components
```jsx
import { useAuth } from "../context/AuthContext";

function MyComponent() {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  
  if (!isAuthenticated) {
    return <p>Not logged in</p>;
  }
  
  return (
    <div>
      <p>Welcome {user.name}</p>
      {hasRole('admin') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protecting Routes
```jsx
// Requires authentication only
<Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />

// Requires specific role
<Route 
  path="/dashboard/admin" 
  element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} 
/>
```

### Custom Hook for Back Prevention
```jsx
import { usePreventBackNavigation } from "../utils/authUtils";

function MyComponent() {
  const preventBack = usePreventBackNavigation();
  
  // Use when needed
  const handleLogout = () => {
    preventBack();
    logout();
  };
}
```

## Files Modified/Created

### Created:
- `src/context/AuthContext.jsx` - Authentication context provider
- `src/utils/authUtils.js` - Auth utility functions

### Updated:
- `src/App.jsx` - Added AuthProvider and conditional routing
- `src/components/ProtectedRoute.jsx` - Enhanced with auth context and role checking
- `src/pages/Login.jsx` - Uses AuthContext for login
- `src/pages/AdminDashboard.jsx` - Uses AuthContext for logout
- `src/pages/CashierDashboard.jsx` - Uses AuthContext for logout
- `src/pages/ManagerDashboard.jsx` - Uses AuthContext for logout

## Key Features

### 1. Token Validation
- Token is stored in localStorage
- AuthContext validates token on app load
- Protected routes require valid token

### 2. Role-Based Access
- Users are assigned roles during login (admin, cashier, manager)
- ProtectedRoute component checks user role
- Routes can require specific roles

### 3. Security
- localStorage only stores token, role, and username
- Backend should validate token with each API request
- Missing/invalid token redirects to login
- Logout completely clears all auth data

### 4. Back Button Prevention
- Uses `window.history.pushState()` to intercept back navigation
- After logout, browser back button won't return to protected pages
- `replace: true` in Navigate overwrites history

## Testing the Auth Flow

1. **Test login**: Go to login page, enter credentials
2. **Test protected route**: Navigate to protected route
3. **Test back button after login**: Click back - should not go back to login
4. **Test logout**: Click logout button
5. **Test back button after logout**: Click back - should not return to dashboard
6. **Test direct URL access**: Try entering protected URL directly without login - should redirect

## Troubleshooting

### User still sees protected page after logout
- Check browser cache: Clear localStorage in DevTools
- Ensure `replace: true` is used in navigate calls
- Check that AuthContext.logout() is being called

### Back button still navigates to protected page
- Verify `window.addEventListener("popstate")` is attached
- Check that `window.history.pushState()` is called on logout
- Clear browser history if needed

### Token not persisting
- Check localStorage in DevTools
- Ensure Backend returns token in response
- Verify login() method is called with correct token

## Best Practices

1. Always use `<ProtectedRoute>` for protected pages
2. Call `logout()` from auth context, not direct localStorage removal
3. Use `navigate(..., { replace: true })` for auth redirects
4. Check `useAuth()` before rendering sensitive components
5. Handle loading state from `useAuth().loading`
