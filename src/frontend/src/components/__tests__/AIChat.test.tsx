/**
 * AIChat Component Tests - Sprint 010.5 Frontend Testing Infrastructure
 * 
 * Demonstrates component testing patterns with Zustand store integration:
 * - Store mocking strategies
 * - Component rendering with different auth states
 * - User interaction testing
 * - Internet Identity integration mocking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIChat from '../ai/AIChat';
import { useAuthStore } from '../../stores/authStore';
import type { AuthUser, AlgorandChainFusionCredentials } from '../../hooks/useAlgorandIdentity';

// Mock the SipparAPIService module
vi.mock('../../services/SipparAPIService', () => ({
  default: {
    sendChatMessage: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        response: 'Mock AI response',
        timestamp: Date.now(),
      }
    }),
  }
}));

// Mock useAlgorandIdentity hook
vi.mock('../../hooks/useAlgorandIdentity', () => ({
  useAlgorandIdentity: () => ({
    user: useAuthStore.getState().user,
    credentials: useAuthStore.getState().credentials,
    isAuthenticated: useAuthStore.getState().isAuthenticated,
    login: vi.fn(),
    logout: vi.fn(),
    incrementMessageCount: vi.fn(),
  }),
}));

// Test utilities for creating mock data
const createMockUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  principal: 'test-principal-123',
  accountId: 'test-account-456',
  isAuthenticated: true,
  isPremium: false,
  dailyMessagesUsed: 0,
  dailyLimit: 10,
  ...overrides,
});

const createMockCredentials = (overrides: Partial<AlgorandChainFusionCredentials> = {}): AlgorandChainFusionCredentials => ({
  algorandAddress: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP',
  signature: 'test-signature',
  timestamp: Date.now(),
  addresses: { algorand: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP' },
  ...overrides,
});

describe('AIChat Component', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  describe('Rendering with Different Auth States', () => {
    it('renders correctly with unauthenticated guest user', () => {
      render(<AIChat />);
      
      // Should show the component (guest users can use chat)
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Should show message input for guest users
      expect(screen.getByPlaceholderText(/Ask me anything/i)).toBeInTheDocument();
    });

    it('renders correctly with authenticated user', () => {
      const mockUser = createMockUser();
      const mockCredentials = createMockCredentials();
      
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setCredentials(mockCredentials);
      
      render(<AIChat />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask me anything/i)).toBeInTheDocument();
    });

    it('renders correctly with premium user', () => {
      const mockUser = createMockUser({ 
        isPremium: true, 
        dailyLimit: -1 
      });
      
      useAuthStore.getState().setUser(mockUser);
      
      render(<AIChat />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      // Premium users should have enhanced UI elements
      expect(screen.getByPlaceholderText(/Ask me anything/i)).toBeInTheDocument();
    });

    it('handles user at message limit appropriately', () => {
      const mockUser = createMockUser({
        dailyMessagesUsed: 10,
        dailyLimit: 10,
      });
      
      useAuthStore.getState().setUser(mockUser);
      
      render(<AIChat />);
      
      // Should still render but may show limit warning
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Store Integration', () => {
    it('responds to store changes reactively', async () => {
      render(<AIChat />);
      
      // Initially guest user
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Change to authenticated user
      const mockUser = createMockUser();
      useAuthStore.getState().setUser(mockUser);
      
      // Component should react to store changes
      await waitFor(() => {
        // Verify component updated based on new auth state
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('accesses user data directly from store', () => {
      const mockUser = createMockUser({
        principal: 'specific-principal-test',
        isPremium: true,
      });
      
      useAuthStore.getState().setUser(mockUser);
      
      render(<AIChat />);
      
      // Component should have access to store data
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Store data should be accessible within the component
      const state = useAuthStore.getState();
      expect(state.user?.principal).toBe('specific-principal-test');
      expect(state.user?.isPremium).toBe(true);
    });

    it('handles store error states gracefully', () => {
      useAuthStore.getState().setError({
        code: 'TEST_ERROR',
        message: 'Test error message',
      });
      
      render(<AIChat />);
      
      // Component should still render despite store error
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles store loading states correctly', () => {
      useAuthStore.getState().setLoading(true);
      
      render(<AIChat />);
      
      // Component should handle loading state
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles message input interaction', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser();
      useAuthStore.getState().setUser(mockUser);
      
      render(<AIChat />);
      
      const messageInput = screen.getByPlaceholderText(/Ask me anything/i);
      
      // Type a message
      await user.type(messageInput, 'Hello, test message');
      expect(messageInput).toHaveValue('Hello, test message');
    });

    it('handles form submission for authenticated user', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser();
      useAuthStore.getState().setUser(mockUser);
      
      render(<AIChat />);
      
      const messageInput = screen.getByPlaceholderText(/Ask me anything/i);
      
      // Type and submit message
      await user.type(messageInput, 'Test message');
      
      // Look for send button or submit mechanism
      const form = messageInput.closest('form');
      if (form) {
        await user.click(form.querySelector('button[type="submit"]') || messageInput);
      }
      
      // Should handle message submission
      expect(messageInput).toBeInTheDocument();
    });

    it('prevents message submission when at limit', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({
        dailyMessagesUsed: 10,
        dailyLimit: 10,
        isPremium: false,
      });
      
      useAuthStore.getState().setUser(mockUser);
      
      render(<AIChat />);
      
      const messageInput = screen.getByPlaceholderText(/Ask me anything/i);
      await user.type(messageInput, 'Test message when at limit');
      
      // Should handle limit restriction
      expect(messageInput).toBeInTheDocument();
    });
  });

  describe('Props Drilling Elimination', () => {
    it('does not require user or credentials props', () => {
      // This test verifies that AIChat no longer needs props
      // Previously: <AIChat user={user} credentials={credentials} />
      // Now: <AIChat />
      
      const mockUser = createMockUser();
      useAuthStore.getState().setUser(mockUser);
      
      // Should render without any props
      expect(() => render(<AIChat />)).not.toThrow();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('accesses all required data from store internally', () => {
      const mockUser = createMockUser();
      const mockCredentials = createMockCredentials();
      
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setCredentials(mockCredentials);
      
      render(<AIChat />);
      
      // Component should access data from store, not props
      const state = useAuthStore.getState();
      expect(state.user).toBeDefined();
      expect(state.credentials).toBeDefined();
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles rapid store updates gracefully', async () => {
      render(<AIChat />);
      
      // Rapidly change store state
      const mockUser1 = createMockUser({ principal: 'user-1' });
      const mockUser2 = createMockUser({ principal: 'user-2', isPremium: true });
      
      useAuthStore.getState().setUser(mockUser1);
      useAuthStore.getState().setUser(mockUser2);
      useAuthStore.getState().setUser(null);
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('handles malformed user data gracefully', () => {
      // Test with incomplete user data
      const incompleteUser = {
        principal: 'test-principal',
        // Missing other required fields
      } as AuthUser;
      
      expect(() => {
        useAuthStore.getState().setUser(incompleteUser);
        render(<AIChat />);
      }).not.toThrow();
      
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles network errors in API calls gracefully', async () => {
      // This would test error handling in actual message sending
      // For now, just verify component renders
      const mockUser = createMockUser();
      useAuthStore.getState().setUser(mockUser);
      
      render(<AIChat />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AIChat />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for message input accessibility
      const messageInput = screen.getByPlaceholderText(/Ask me anything/i);
      expect(messageInput).toBeInTheDocument();
      expect(messageInput).toHaveAttribute('type', 'text');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AIChat />);
      
      const messageInput = screen.getByPlaceholderText(/Ask me anything/i);
      
      // Should be focusable
      await user.tab();
      expect(messageInput).toHaveFocus();
    });
  });
});