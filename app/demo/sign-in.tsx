import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

export default function DemoSignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Please enter email and password");
        return;
      }

      if (!email.includes("@")) {
        setError("Invalid email format");
        return;
      }

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock successful sign in
      router.replace("/demo/(tabs)");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.brand}>Nuwrrrld</Text>
        <Text style={styles.demoLabel}>DEMO MODE</Text>
        <Text style={styles.title}>Demo Sign In</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Use any credentials to test the app</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#4b5563"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#4b5563"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Enter Demo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/")} style={styles.link}>
          <Text style={styles.linkText}>Back to main app</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  inner: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { fontSize: 26, fontWeight: "700", color: "#f9fafb", marginBottom: 4 },
  demoLabel: { fontSize: 11, fontWeight: "700", color: "#f59e0b", letterSpacing: 1, marginBottom: 16 },
  title: { fontSize: 18, color: "#6b7280", marginBottom: 20 },
  infoBox: {
    backgroundColor: "#1f2937",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  infoText: { fontSize: 13, color: "#d1d5db" },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f9fafb",
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  error: { color: "#ef4444", fontSize: 13, marginBottom: 8 },
  link: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#3b82f6", fontSize: 14 },
});
