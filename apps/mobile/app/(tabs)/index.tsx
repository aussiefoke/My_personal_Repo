import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { stationApi } from '../../lib/api';

interface Station {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  status: string;
  reliabilityScore: number;
  chargerCountDc: number;
  chargerCountAc: number;
}

export default function HomeScreen() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 深圳福田坐标（之后换成真实用户位置）
    stationApi.nearby(22.5396, 114.0577, 10)
      .then(res => {
        setStations(res.data.stations);
        setLoading(false);
      })
      .catch(err => {
        setError('加载失败，请检查网络');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1DB954" />
      <Text style={styles.loadingText}>正在查找附近充电站...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>附近充电站 ({stations.length})</Text>
      <FlatList
        data={stations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.stationName}>{item.name}</Text>
              <View style={[styles.statusBadge,
                { backgroundColor: item.status === 'active' ? '#1DB954' : '#999' }]}>
                <Text style={styles.statusText}>
                  {item.status === 'active' ? '运营中' : '未知'}
                </Text>
              </View>
            </View>
            <Text style={styles.address}>{item.address}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.distance}>📍 {item.distanceKm} km</Text>
              <Text style={styles.chargers}>
                快充 {item.chargerCountDc} 个 · 慢充 {item.chargerCountAc} 个
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  errorText: { color: 'red', fontSize: 14 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  stationName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  address: { fontSize: 13, color: '#666', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  distance: { fontSize: 13, color: '#1DB954', fontWeight: '500' },
  chargers: { fontSize: 13, color: '#888' },
});