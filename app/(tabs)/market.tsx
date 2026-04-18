import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/api";

interface MarketOverview {
  ai_summary?: string;
  indices?: Array<{ symbol: string; price: number; change_pct: number }>;
  [key: string]: unknown;
}

export default function MarketScreen() {
  const { fetchBackend } = useApi();

  const { data, isLoading, error } = useQuery<MarketOverview>({
    queryKey: ["market-overview"],
    queryFn: () => fetchBackend<MarketOverview>("/market-overview"),
    staleTime: 15 * 60 * 1000, // 15 min — matches web revalidate
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={styles.loadingText}>Loading market data…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠ Could not load market data</Text>
        <Text style={styles.errorDetail}>{(error as Error).message}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Market Overview</Text>

      {data?.indices && data.indices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indices</Text>
          {data.indices.map((idx) => (
            <View key={idx.symbol} style={styles.row}>
              <Text style={styles.symbol}>{idx.symbol}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.price}>${idx.price.toFixed(2)}</Text>
                <Text style={[styles.change, { color: idx.change_pct >= 0 ? "#10b981" : "#ef4444" }]}>
                  {idx.change_pct >= 0 ? "+" : ""}{idx.change_pct.toFixed(2)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {data?.ai_summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Summary</Text>
          <Text style={styles.summaryText}>{data.ai_summary}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#030712", padding: 20 },
  heading: { fontSize: 22, fontWeight: "700", color: "#f9fafb", marginBottom: 20 },
  section: { backgroundColor: "#111827", borderRadius: 10, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1f2937" },
  rowRight: { alignItems: "flex-end" },
  symbol: { fontSize: 15, fontWeight: "600", color: "#f9fafb" },
  price: { fontSize: 15, color: "#f9fafb" },
  change: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  summaryText: { fontSize: 14, color: "#d1d5db", lineHeight: 22 },
  loadingText: { color: "#6b7280", marginTop: 12, fontSize: 14 },
  errorText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
  errorDetail: { color: "#6b7280", fontSize: 13, marginTop: 8, textAlign: "center" },
});
