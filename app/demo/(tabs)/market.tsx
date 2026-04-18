import { View, Text, StyleSheet } from "react-native";

export default function MarketScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market Overview</Text>
      <Text style={styles.subtitle}>Demo Page</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Market data would appear here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  placeholder: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  placeholderText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
