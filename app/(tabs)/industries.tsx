import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/api";

interface Industry {
  name: string;
  etf: string;
  price: number;
  change_pct: number;
  signal?: string;
}

export default function IndustriesScreen() {
  const { fetchBackend } = useApi();

  const { data, isLoading, error } = useQuery<Industry[]>({
    queryKey: ["industry-intel"],
    queryFn: () => fetchBackend<Industry[]>("/industry-intel"),
    staleTime: 15 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={styles.loadingText}>Loading industries…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠ Could not load industry data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Industry Intel</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.etf}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.etf}>{item.etf}</Text>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.price}>${item.price?.toFixed(2) ?? "—"}</Text>
              <Text style={[styles.change, { color: item.change_pct >= 0 ? "#10b981" : "#ef4444" }]}>
                {item.change_pct >= 0 ? "+" : ""}{item.change_pct?.toFixed(2) ?? "0.00"}%
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#030712" },
  heading: { fontSize: 22, fontWeight: "700", color: "#f9fafb", padding: 20, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowRight: { alignItems: "flex-end" },
  etf: { fontSize: 15, fontWeight: "700", color: "#f9fafb" },
  name: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  price: { fontSize: 14, color: "#f9fafb", fontWeight: "600" },
  change: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  loadingText: { color: "#6b7280", marginTop: 12, fontSize: 14 },
  errorText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});
