import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/api";

interface Signal {
  symbol: string;
  signal: string;
  price: number;
  rsi?: number;
  macd?: string;
}

export default function SignalsScreen() {
  const { fetchBackend } = useApi();

  const { data, isLoading, error } = useQuery<Signal[]>({
    queryKey: ["signals"],
    queryFn: () => fetchBackend<Signal[]>("/signals"),
    staleTime: 60 * 60 * 1000, // 1 hour — matches web revalidate
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={styles.loadingText}>Loading signals…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠ Could not load signals</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Technical Signals</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isBullish = item.signal?.toLowerCase().includes("buy") || item.signal?.toLowerCase().includes("bullish");
          const isBearish = item.signal?.toLowerCase().includes("sell") || item.signal?.toLowerCase().includes("bearish");
          const signalColor = isBullish ? "#10b981" : isBearish ? "#ef4444" : "#6b7280";

          return (
            <View style={styles.row}>
              <View>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.price}>${item.price?.toFixed(2) ?? "—"}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.signal, { color: signalColor }]}>{item.signal}</Text>
                {item.rsi !== undefined && (
                  <Text style={styles.meta}>RSI {item.rsi.toFixed(1)}</Text>
                )}
              </View>
            </View>
          );
        }}
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
  rowRight: { alignItems: "flex-end" },
  symbol: { fontSize: 15, fontWeight: "700", color: "#f9fafb" },
  price: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  signal: { fontSize: 13, fontWeight: "600" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  loadingText: { color: "#6b7280", marginTop: 12, fontSize: 14 },
  errorText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});
