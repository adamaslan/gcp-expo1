import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const QUICK_LINKS = [
    { label: "Market Overview", route: "/market" as const, color: "#3b82f6" },
    { label: "Signals", route: "/signals" as const, color: "#10b981" },
    { label: "Industries", route: "/industries" as const, color: "#8b5cf6" },
    { label: "Screener", route: "/screener" as const, color: "#f59e0b" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brand}>Nuwrrrld</Text>
        <Text style={styles.subtitle}>Financial Intelligence</Text>
        {user?.emailAddresses?.[0]?.emailAddress ? (
          <Text style={styles.email}>{user.emailAddresses[0].emailAddress}</Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        {QUICK_LINKS.map(({ label, route, color }) => (
          <TouchableOpacity
            key={route}
            style={[styles.card, { borderLeftColor: color }]}
            onPress={() => router.push(route)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardLabel}>{label}</Text>
            <Text style={[styles.cardArrow, { color }]}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => signOut()}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingTop: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f9fafb",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
  email: {
    fontSize: 13,
    color: "#3b82f6",
    marginTop: 8,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 18,
    borderLeftWidth: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f9fafb",
  },
  cardArrow: {
    fontSize: 18,
    fontWeight: "700",
  },
  signOutBtn: {
    marginTop: 40,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  signOutText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
