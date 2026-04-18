import React, { createContext, useContext } from "react";

interface MockUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
}

interface MockAuthContextType {
  user: MockUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signOut: () => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextType>({
  user: {
    id: "user_mock_123",
    emailAddresses: [{ emailAddress: "test@example.com" }],
  },
  isSignedIn: true,
  isLoaded: true,
  signOut: async () => {},
});

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <MockAuthContext.Provider
      value={{
        user: {
          id: "user_mock_123",
          emailAddresses: [{ emailAddress: "test@example.com" }],
        },
        isSignedIn: true,
        isLoaded: true,
        signOut: async () => {
          console.log("Mock sign out");
        },
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
}

export function useUser() {
  const context = useContext(MockAuthContext);
  return { user: context.user, isLoaded: context.isLoaded, isSignedIn: context.isSignedIn };
}

export function useClerk() {
  const context = useContext(MockAuthContext);
  return { signOut: context.signOut };
}
