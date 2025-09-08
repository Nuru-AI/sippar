# Zustand State Management Usage Guide

**Added**: Sprint 010 - Frontend State Management Implementation  
**Version**: 1.0  
**Status**: Production Implementation

## 🎯 **Overview**

Sippar frontend now uses Zustand for centralized state management, replacing manual localStorage caching patterns. This guide shows how to use the new state management system.

## 🏪 **Auth Store Usage**

### **Basic Store Access**

```typescript
import { useAuthStore } from '../stores/authStore';

// Component example
const MyComponent: React.FC = () => {
  // Selective subscriptions - only re-renders when user changes
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  return (
    <div>
      {isAuthenticated ? `Welcome ${user?.principal}` : 'Please login'}
    </div>
  );
};
```

### **Store Actions**

```typescript
import { useAuthStore } from '../stores/authStore';

const LoginComponent: React.FC = () => {
  const setUser = useAuthStore(state => state.setUser);
  const setLoading = useAuthStore(state => state.setLoading);
  const setError = useAuthStore(state => state.setError);
  
  const handleLogin = async () => {
    setLoading(true);
    try {
      // Login logic
      setUser(newUser);
    } catch (error) {
      setError({ code: 'LOGIN_FAILED', message: error.message });
    }
  };
};
```

### **Balance Management**

```typescript
import { useBalances } from '../stores/authStore';

const BalanceDisplay: React.FC = () => {
  const { algo, ckAlgo, loading, lastUpdated } = useBalances();
  
  return (
    <div>
      <p>ALGO: {algo.toFixed(6)}</p>
      <p>ckALGO: {ckAlgo.toFixed(6)}</p>
      {loading && <p>Updating balances...</p>}
    </div>
  );
};
```

## 🎣 **Hook Integration**

### **Backward Compatible Hook**

The `useAlgorandIdentity` hook maintains its original API while using Zustand internally:

```typescript
import { useAlgorandIdentity } from '../hooks/useAlgorandIdentity';

const Dashboard: React.FC = () => {
  // Same API as before Sprint 010
  const { user, credentials, login, logout, isLoading } = useAlgorandIdentity();
  
  // Works exactly the same way
  return (
    <div>
      {user ? <UserDashboard /> : <LoginButton onClick={login} />}
    </div>
  );
};
```

## 🔄 **Migration Patterns**

### **Before: Manual State + Props Drilling**

```typescript
// OLD PATTERN (removed in Sprint 010)
const Dashboard: React.FC = () => {
  const { user, credentials } = useAlgorandIdentity();
  const [algoBalance, setAlgoBalance] = useState(0);
  
  return <AIChat user={user} credentials={credentials} />;
};

const AIChat: React.FC<{user: AuthUser, credentials: Credentials}> = ({ user, credentials }) => {
  // Component receives props
};
```

### **After: Store Access**

```typescript
// NEW PATTERN (Sprint 010)
const Dashboard: React.FC = () => {
  return <AIChat />; // No props needed
};

const AIChat: React.FC = () => {
  // Direct store access
  const user = useAuthStore(state => state.user);
  const credentials = useAuthStore(state => state.credentials);
};
```

## ⚡ **Performance Benefits**

### **Selective Re-rendering**

```typescript
// Only re-renders when user changes, not when balances change
const UserInfo = () => {
  const user = useAuthStore(state => state.user);
  return <div>{user?.principal}</div>;
};

// Only re-renders when balances change, not when user changes  
const BalanceInfo = () => {
  const balances = useAuthStore(state => ({ 
    algo: state.algoBalance, 
    ckAlgo: state.ckAlgoBalance 
  }));
  return <div>{balances.algo}</div>;
};
```

### **Computed Selectors**

```typescript
import { authSelectors } from '../stores/authStore';

const MessageLimitInfo = () => {
  const canSend = useAuthStore(authSelectors.canSendMessage);
  const remaining = useAuthStore(authSelectors.remainingMessages);
  
  return (
    <div>
      Can send: {canSend ? 'Yes' : 'No'}
      Remaining: {remaining === -1 ? 'Unlimited' : remaining}
    </div>
  );
};
```

## 🔍 **Debugging**

### **Store DevTools**

Zustand integrates with Redux DevTools for debugging:

```typescript
// Development mode - store actions visible in DevTools
// Check browser dev tools -> Redux tab
```

### **Store State Inspection**

```typescript
// Access full store state (for debugging)
const debugState = useAuthStore.getState();
console.log('Full store state:', debugState);
```

## 📋 **Best Practices**

1. **Use Selective Subscriptions**: `useAuthStore(state => state.user)` instead of `useAuthStore()`
2. **Prefer Hook API**: Use `useAlgorandIdentity()` for complex auth operations  
3. **Direct Store Access**: Use store directly for simple state access
4. **Avoid Store Mutation**: Always use provided actions to update state
5. **Computed Values**: Use `authSelectors` for derived state

## 🔧 **Store API Reference**

### **State Properties**
- `user: AuthUser | null` - Current authenticated user
- `credentials: AlgorandChainFusionCredentials | null` - User credentials
- `isAuthenticated: boolean` - Authentication status
- `isLoading: boolean` - Loading state
- `error: AuthError | null` - Error state
- `algoBalance: number` - ALGO balance
- `ckAlgoBalance: number` - ckALGO balance

### **Actions**
- `setUser(user)` - Update user data
- `setCredentials(credentials)` - Update credentials
- `setLoading(loading)` - Update loading state
- `setError(error)` - Set error state
- `setBalances(algo, ckAlgo)` - Update balances
- `logout()` - Clear all auth data

### **Convenience Hooks**
- `useAuth()` - Common auth state
- `useBalances()` - Balance state with metadata

---

**Migration Complete**: Sprint 010 successfully implemented Zustand state management with zero breaking changes to existing components.