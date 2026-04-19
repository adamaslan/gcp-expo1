/**
 * Market screen showing financial data with proper null checks
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator } from 'react-native';
import { getMarketData } from '../lib/api';

interface MarketItem {
  symbol: string;
  price?: number;
  change?: number;
  percentChange?: number;
}

interface MarketData {
  items?: MarketItem[];
}

export default function MarketScreen() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarketData();
  }, []);

  async function loadMarketData() {
    try {
      setLoading(true);
      setError(null);
      const result = await getMarketData();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load market data';
      setError(message);
      // Use mock data on error for demo purposes
      setData({
        items: [
          { symbol: 'AAPL', price: 150.25, change: 2.5, percentChange: 1.7 },
          { symbol: 'GOOGL', price: 2800.75, change: -15.0, percentChange: -0.5 },
          { symbol: 'MSFT', price: 375.5, change: 5.0, percentChange: 1.35 },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading market data...</Text>
      </View>
    );
  }

  const items = data?.items || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market Overview</Text>

      {error && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>Using demo data: {error}</Text>
        </View>
      )}

      <ScrollView style={styles.listContainer}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No market data available</Text>
        ) : (
          items.map((idx) => (
            <View key={idx.symbol} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.symbol}>{idx.symbol || '—'}</Text>
              </View>
              <View style={styles.rowRight}>
                {/* Safe price display with fallback */}
                <Text style={styles.price}>
                  ${idx.price?.toFixed(2) ?? '—'}
                </Text>
                {/* Safe change display with color indicator */}
                {idx.percentChange !== undefined && (
                  <Text
                    style={[
                      styles.change,
                      {
                        color:
                          idx.percentChange > 0
                            ? '#4caf50'
                            : idx.percentChange < 0
                              ? '#f44336'
                              : '#666',
                      },
                    ]}
                  >
                    {idx.percentChange > 0 ? '+' : ''}
                    {idx.percentChange?.toFixed(2)}%
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Text style={styles.timestamp}>
        Last updated: {new Date().toLocaleTimeString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 16,
    color: '#333',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  row: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rowLeft: {
    flex: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  symbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  change: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  timestamp: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    paddingVertical: 12,
  },
});
