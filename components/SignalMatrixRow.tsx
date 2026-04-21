import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { TimeframeMatrix, Timeframe, Signal, SignalOutput } from "../backend/schemas/signal";
import { EvidenceExpandedView } from "./EvidenceExpandedView";

const SIGNAL_ARROWS: Record<Signal, string> = {
  strong_buy: "⬆",
  buy: "↑",
  hold: "→",
  sell: "↓",
  strong_sell: "⬇",
};

const SIGNAL_COLORS: Record<Signal, string> = {
  strong_buy: "#00C853",
  buy: "#69F0AE",
  hold: "#FFD740",
  sell: "#FF6D00",
  strong_sell: "#D50000",
};

const TIMEFRAMES: Timeframe[] = ["1D", "5D", "1M", "3M", "6M", "1Y"];

interface SignalMatrixRowProps {
  matrix: TimeframeMatrix;
}

export function SignalMatrixRow({ matrix }: SignalMatrixRowProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe | null>(null);

  const hasDivergence = matrix.divergence_pattern !== "aligned_bullish" && matrix.divergence_pattern !== "aligned_bearish";
  const alignPct = Math.round(matrix.alignment_score * 100);

  const activeSignal: SignalOutput | null =
    activeTimeframe ? matrix.timeframes[activeTimeframe] ?? null : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.ticker}>{matrix.ticker}</Text>

        {/* 6-cell timeframe matrix */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cells}>
          {TIMEFRAMES.map((tf) => {
            const sig = matrix.timeframes[tf];
            if (!sig) return null;
            const color = SIGNAL_COLORS[sig.signal];
            const conf = sig.confidence;
            const isActive = activeTimeframe === tf;

            return (
              <TouchableOpacity
                key={tf}
                accessibilityLabel={`${tf} timeframe: ${sig.signal.replace("_", " ")}, ${Math.round(conf * 100)}% confidence. Tap for details.`}
                accessibilityRole="button"
                onPress={() => setActiveTimeframe(isActive ? null : tf)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: color + "22",
                    borderColor: isActive ? color : color + "66",
                    borderWidth: isActive ? 2 : 1,
                    padding: 4 + conf * 4,  // padding scales with confidence
                  },
                ]}
              >
                <Text style={styles.tfLabel}>{tf}</Text>
                <Text style={[styles.arrow, { color }]}>{SIGNAL_ARROWS[sig.signal]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Alignment bar */}
        <View style={styles.alignContainer}>
          <View style={styles.alignBarBg}>
            <View
              style={[
                styles.alignBarFill,
                {
                  width: `${alignPct}%` as unknown as number,
                  backgroundColor:
                    matrix.alignment_score > 0.7
                      ? "#00C853"
                      : matrix.alignment_score < 0.4
                      ? "#D50000"
                      : "#FFD740",
                },
              ]}
            />
          </View>
          <Text style={styles.alignLabel}>{alignPct}%</Text>
        </View>

        {hasDivergence && (
          <Text
            style={styles.setupIcon}
            accessibilityLabel={`Divergence pattern: ${matrix.divergence_pattern.replace(/_/g, " ")}`}
          >
            💡
          </Text>
        )}
      </View>

      {hasDivergence && (
        <Text style={styles.divergenceText}>{matrix.divergence_interpretation}</Text>
      )}

      {activeSignal && (
        <EvidenceExpandedView
          evidence={activeSignal.evidence}
          signal={activeSignal.signal}
          confidence={activeSignal.confidence}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 6, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    padding: 10,
  },
  ticker: { color: "#fff", fontSize: 14, fontWeight: "700", width: 48 },
  cells: { flex: 1 },
  cell: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    minWidth: 38,
  },
  tfLabel: { color: "#aaa", fontSize: 9, fontWeight: "600" },
  arrow: { fontSize: 16 },
  alignContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  alignBarBg: {
    width: 40,
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    overflow: "hidden",
  },
  alignBarFill: { height: 6, borderRadius: 3 },
  alignLabel: { color: "#888", fontSize: 10 },
  setupIcon: { fontSize: 16 },
  divergenceText: {
    color: "#bbb",
    fontSize: 12,
    fontStyle: "italic",
    paddingHorizontal: 10,
  },
});
