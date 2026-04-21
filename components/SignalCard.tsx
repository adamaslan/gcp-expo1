import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import { SignalOutput, Signal } from "../backend/schemas/signal";
import { EvidenceExpandedView } from "./EvidenceExpandedView";

const SIGNAL_COLORS: Record<Signal, string> = {
  strong_buy: "#00C853",
  buy: "#69F0AE",
  hold: "#FFD740",
  sell: "#FF6D00",
  strong_sell: "#D50000",
};

const SIGNAL_LABELS: Record<Signal, string> = {
  strong_buy: "STRONG BUY",
  buy: "BUY",
  hold: "HOLD",
  sell: "SELL",
  strong_sell: "STRONG SELL",
};

interface SignalCardProps {
  signal: SignalOutput;
  onPress?: () => void;
}

export function SignalCard({ signal, onPress }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = SIGNAL_COLORS[signal.signal];
  const conf = signal.confidence;

  // Weakness #2: opacity proportional to confidence
  const cardOpacity = 0.3 + 0.7 * conf;
  // Border width in dp proportional to confidence
  const borderWidth = 1 + 4 * conf;

  const confidencePct = Math.round(conf * 100);
  const isAiDegraded = signal.model_id === "rule_fallback";

  const a11yLabel = `${SIGNAL_LABELS[signal.signal]} signal, ${confidencePct}% confidence. ${signal.evidence.length} supporting evidence items. Tap for details.`;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        accessibilityLabel={a11yLabel}
        accessibilityRole="button"
        onPress={() => {
          setExpanded((e) => !e);
          onPress?.();
        }}
        style={[
          styles.card,
          {
            opacity: cardOpacity,
            borderColor: color,
            borderWidth,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.ticker, { color: "#fff" }]}>{signal.ticker}</Text>
          {isAiDegraded && (
            <View style={styles.degradedBadge}>
              <Text style={styles.degradedText}>⚠ AI unavailable</Text>
            </View>
          )}
        </View>

        <Text style={[styles.signalLabel, { color }]}>
          {SIGNAL_LABELS[signal.signal]}
        </Text>

        {/* Confidence pill — Weakness #2 */}
        <View style={[styles.confPill, { backgroundColor: color + "33" }]}>
          <Text style={[styles.confText, { color }]}>{confidencePct}%</Text>
        </View>

        <Text style={styles.rationale} numberOfLines={2}>
          {signal.rationale}
        </Text>

        <Text style={styles.meta}>
          {signal.timeframe} · {signal.prompt_version} · {signal.model_id}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <EvidenceExpandedView
          evidence={signal.evidence}
          signal={signal.signal}
          confidence={conf}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 6 },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticker: { fontSize: 18, fontWeight: "700" },
  signalLabel: { fontSize: 22, fontWeight: "800", letterSpacing: 1 },
  confPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  confText: { fontSize: 13, fontWeight: "600" },
  rationale: { color: "#ccc", fontSize: 13, lineHeight: 18 },
  meta: { color: "#666", fontSize: 11 },
  degradedBadge: {
    backgroundColor: "#FF6D0033",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6D00",
  },
  degradedText: { color: "#FF6D00", fontSize: 11 },
});
