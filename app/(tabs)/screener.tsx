import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/api";

interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume?: number;
  market_cap?: number;
}

function formatLargeNum(n?: number): string {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

export default function ScreenerScreen() {
  const { fetchBackend } = useApi();

  const { data, isLoading, error } = useQuery<ScreenerResult[]>({
    queryKey: ["screener"],
    queryFn: () => fetchBackend<ScreenerResult[]>("/screener"),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={styles.loadingText}>Screening stocks…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠ Could not load screener</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Stock Screener</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.market_cap ? (
                <Text style={styles.meta}>MCap {formatLargeNum(item.market_cap)}</Text>
              ) : null}
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
  symbol: { fontSize: 15, fontWeight: "700", color: "#f9fafb" },
  name: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  meta: { fontSize: 11, color: "#4b5563", marginTop: 2 },
  price: { fontSize: 14, color: "#f9fafb", fontWeight: "600" },
  change: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  loadingText: { color: "#6b7280", marginTop: 12, fontSize: 14 },
  errorText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});
