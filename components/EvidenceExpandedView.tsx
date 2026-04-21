import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Clipboard,
} from "react-native";
import { Evidence, Signal } from "../backend/schemas/signal";

const DIRECTION_ICONS: Record<string, string> = {
  bullish: "✓",
  mildly_bullish: "~",
  neutral: "~",
  mildly_bearish: "~",
  bearish: "⚠",
};

const DIRECTION_COLORS: Record<string, string> = {
  bullish: "#69F0AE",
  mildly_bullish: "#B9F6CA",
  neutral: "#FFD740",
  mildly_bearish: "#FFAB40",
  bearish: "#FF6D00",
};

interface EvidenceExpandedViewProps {
  evidence: Evidence[];
  signal: Signal;
  confidence: number;
}

export function EvidenceExpandedView({ evidence, signal, confidence }: EvidenceExpandedViewProps) {
  const sorted = [...evidence].sort((a, b) => {
    // Counter-arguments always last
    if (a.source === "counter_argument") return 1;
    if (b.source === "counter_argument") return -1;
    return b.weight - a.weight;
  });

  const totalBullish = evidence
    .filter((e) => e.direction === "bullish" || e.direction === "mildly_bullish")
    .reduce((s, e) => s + e.weight, 0);
  const totalBearish = evidence
    .filter((e) => e.direction === "bearish" || e.direction === "mildly_bearish")
    .reduce((s, e) => s + e.weight, 0);
  const totalNeutral = 1 - totalBullish - totalBearish;

  const confPct = Math.round(confidence * 100);

  function handleCopy() {
    Clipboard.setString(JSON.stringify(evidence, null, 2));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Why {signal.toUpperCase().replace("_", " ")}? ({confPct}% confidence)
      </Text>

      {sorted.map((item) => {
        const icon = DIRECTION_ICONS[item.direction] ?? "~";
        const color = DIRECTION_COLORS[item.direction] ?? "#ccc";
        const weightPct = Math.round(item.weight * 100);

        return (
          <View key={item.id} style={styles.evidenceRow}>
            <Text style={[styles.icon, { color }]}>{icon}</Text>
            <View style={styles.evidenceBody}>
              <Text style={styles.evidenceLabel}>
                {item.source_detail.replace(/_/g, " ")}: {item.value}
              </Text>
              {/* Weight bar proportional to weight */}
              <View style={styles.weightBarBg}>
                <View
                  style={[
                    styles.weightBarFill,
                    { width: `${weightPct}%` as unknown as number, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.weightLabel, { color }]}>
              {item.direction.replace(/_/g, " ")} · {weightPct}%
            </Text>
          </View>
        );
      })}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Bullish weight: {Math.round(totalBullish * 100)}%{"  "}·{"  "}
          Bearish weight: {Math.round(totalBearish * 100)}%{"  "}·{"  "}
          Neutral: {Math.round(totalNeutral * 100)}%
        </Text>
      </View>

      <TouchableOpacity
        style={styles.copyBtn}
        onPress={handleCopy}
        accessibilityLabel="Copy evidence chain as JSON"
        accessibilityRole="button"
      >
        <Text style={styles.copyBtnText}>Copy evidence chain</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#12122a",
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    gap: 8,
  },
  header: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  icon: { fontSize: 16, width: 18 },
  evidenceBody: { flex: 1, gap: 3 },
  evidenceLabel: { color: "#ddd", fontSize: 13 },
  weightBarBg: {
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    overflow: "hidden",
  },
  weightBarFill: { height: 4, borderRadius: 2 },
  weightLabel: { fontSize: 11, textAlign: "right", minWidth: 80 },
  summary: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 8,
    marginTop: 4,
  },
  summaryText: { color: "#aaa", fontSize: 12 },
  copyBtn: {
    backgroundColor: "#2a2a4a",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
  },
  copyBtnText: { color: "#7c7cff", fontSize: 13 },
});
