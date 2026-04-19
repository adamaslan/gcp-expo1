import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useUser, useClerk } from '@clerk/clerk-expo';

export default function HomeScreen() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded || !user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>👋 Welcome!</Text>

        <View style={styles.userCard}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.primaryEmailAddress?.emailAddress}</Text>

          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>
            {user.firstName} {user.lastName}
          </Text>

          {user.externalAccounts && user.externalAccounts.length > 0 && (
            <>
              <Text style={styles.label}>Connected Providers</Text>
              <View>
                {user.externalAccounts.map((account) => (
                  <Text key={account.id} style={styles.badge}>
                    ✓ {account.provider}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Account Status</Text>
          <Text style={styles.statsValue}>✅ Authenticated</Text>
          <Text style={styles.statsDetail}>
            Session created: {new Date(user.createdAt || '').toLocaleString()}
          </Text>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 4,
    fontSize: 14,
    overflow: 'hidden',
  },
  statsBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  statsLabel: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  statsDetail: {
    fontSize: 12,
    color: '#1565c0',
  },
  signOutButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
