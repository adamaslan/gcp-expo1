/**
 * Mock authentication provider for demo/testing mode
 * Supports sign-in and sign-out with state management
 */

import React, { useState, useCallback } from 'react';

interface MockUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string;
  lastName?: string;
}

interface MockAuthContextType {
  user: MockUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string) => Promise<void>;
}

const MockAuthContext = React.createContext<MockAuthContextType | undefined>(undefined);

export const useMockAuth = () => {
  const context = React.useContext(MockAuthContext);
  if (!context) {
    throw new Error('useMockAuth must be used within MockAuthProvider');
  }
  return context;
};

const MOCK_USER: MockUser = {
  id: 'user_mock_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'Demo',
  lastName: 'User',
};

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [user, setUser] = useState<MockUser | null>(MOCK_USER);

  const handleSignOut = useCallback(async () => {
    console.log('Mock sign out triggered');
    setIsSignedIn(false);
    setUser(null);
  }, []);

  const handleSignIn = useCallback(async (email: string) => {
    console.log('Mock sign in with email:', email);
    // In a real app, validate email format and authenticate
    setUser({
      ...MOCK_USER,
      emailAddresses: [{ emailAddress: email }],
    });
    setIsSignedIn(true);
  }, []);

  const value: MockAuthContextType = {
    user: isSignedIn ? user : null,
    isSignedIn,
    isLoaded: true,
    signOut: handleSignOut,
    signIn: handleSignIn,
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
}
