import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";

interface HealthStatus {
  clerk?: boolean;
  google_oauth?: boolean;
  timestamp: string;
  status?: string;
}

interface ConfigStatus {
  [key: string]: boolean | string;
}

export default function StatusScreen() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      setError(null);

      const [healthRes, configRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/config"),
      ]);

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      } else {
        setError("Failed to fetch health status");
      }

      if (configRes.ok) {
        setConfig(await configRes.json());
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Status</Text>
        <Text style={styles.timestamp}>
          {new Date().toLocaleTimeString()}
        </Text>
      </View>

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {health && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Checks</Text>

          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIndicator,
                health.clerk ? styles.healthy : styles.unhealthy,
              ]}
            />
            <Text style={styles.statusLabel}>Clerk</Text>
            <Text style={styles.statusValue}>
              {health.clerk ? "✅ OK" : "❌ Down"}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIndicator,
                health.google_oauth ? styles.healthy : styles.unhealthy,
              ]}
            />
            <Text style={styles.statusLabel}>Google OAuth</Text>
            <Text style={styles.statusValue}>
              {health.google_oauth ? "✅ OK" : "❌ Down"}
            </Text>
          </View>

          <Text style={styles.timestamp}>
            Last check: {new Date(health.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}

      {config && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>

          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Status</Text>
            <Text style={[styles.configValue, config.isValid && styles.success]}>
              {config.isValid ? "✅ Valid" : "❌ Invalid"}
            </Text>
          </View>

          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Clerk</Text>
            <Text style={[styles.configValue, config.clerkConfigured && styles.success]}>
              {config.clerkConfigured ? "✅ Configured" : "❌ Missing"}
            </Text>
          </View>

          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Google OAuth</Text>
            <Text style={[styles.configValue, config.googleConfigured && styles.success]}>
              {config.googleConfigured ? "✅ Configured" : "❌ Missing"}
            </Text>
          </View>

          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Webhooks</Text>
            <Text style={[styles.configValue, config.webhooksConfigured && styles.success]}>
              {config.webhooksConfigured ? "✅ Configured" : "⚠️ Optional"}
            </Text>
          </View>

          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Environment</Text>
            <Text style={styles.configValue}>{config.environment}</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Auto-refreshes every 30 seconds</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#6b7280",
  },
  error: {
    backgroundColor: "#7f1d1d",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 14,
  },
  section: {
    backgroundColor: "#111827",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f9fafb",
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  healthy: {
    backgroundColor: "#10b981",
  },
  unhealthy: {
    backgroundColor: "#ef4444",
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: "#d1d5db",
  },
  statusValue: {
    fontSize: 14,
    color: "#f9fafb",
  },
  configItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  configLabel: {
    fontSize: 14,
    color: "#d1d5db",
  },
  configValue: {
    fontSize: 14,
    color: "#f9fafb",
  },
  success: {
    color: "#10b981",
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
