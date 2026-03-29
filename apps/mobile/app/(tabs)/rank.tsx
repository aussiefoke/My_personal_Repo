import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Linking, Alert
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { rankingApi } from '../../lib/api';
import { useLanguageStore } from '../../store/languageStore';

const DEFAULT_LAT = 22.5396;
const DEFAULT_LNG = 114.0577;

interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  status: string | null;
  chargerCountDc: number | null;
  chargerCountAc: number | null;
  latestPrice: {
    totalFlat: number | null;
    totalPeak: number | null;
    totalValley: number | null;
  } | null;
  availableCount: number;
  score: number;
  recommendLabel: string;
}

export default function RankScreen() {
  const { t } = useLanguageStore();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('best');
  const [location, setLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [locationReady, setLocationReady] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');

  const SORT_OPTIONS = [
    { key: 'best',      label: t('rank.sort_best') },
    { key: 'cheapest',  label: t('rank.sort_cheapest') },
    { key: 'nearest',   label: t('rank.sort_nearest') },
    { key: 'available', label: t('rank.sort_available') },
  ];

  useEffect(() => {
    initLocation();
  }, []);

  useEffect(() => {
    if (locationReady) {
      loadRanking(sortBy, location.lat, location.lng);
    }
  }, [sortBy, locationReady]);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('map.location_denied_title'),
          t('map.location_denied_desc'),
          [
            { text: t('map.go_settings'), onPress: () => Linking.openSettings() },
            { text: t('map.use_default'), style: 'cancel' },
          ]
        );
        setLocationLabel(t('map.default_location'));
        setLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        setLocationReady(true);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setLocation({ lat: latitude, lng: longitude });
      setLocationLabel(t('map.current_location'));
      setLocationReady(true);
    } catch (e) {
      console.error('定位失败:', e);
      setLocationLabel(t('map.default_location'));
      setLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      setLocationReady(true);
    }
  };

  const loadRanking = async (sort: string, lat: number, lng: number) => {
    try {
      setLoading(true);
      const res = await rankingApi.nearby(lat, lng, sort, 30);
      setStations(res.data.stations ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRanking(sortBy, location.lat, location.lng);
  };

  const getCurrentPrice = (station: Station) => {
    const hour = new Date().getHours();
    if (!station.latestPrice) return null;
    if (hour >= 8 && hour < 22) return station.latestPrice.totalFlat;
    return station.latestPrice.totalValley;
  };

  const getScoreColor = (score: number) => {
    if (score > 0.7) return '#1DB954';
    if (score > 0.4) return '#FF9500';
    return '#FF3B30';
  };

  const getRankMedal = (index: number) => {
    if (index === 0) return { label: '1', color: '#FFD700', bg: '#FFF8E1' };
    if (index === 1) return { label: '2', color: '#9E9E9E', bg: '#F5F5F5' };
    if (index === 2) return { label: '3', color: '#CD7F32', bg: '#FBF0E6' };
    return { label: `${index + 1}`, color: '#999', bg: '#f5f5f5' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>{t('rank.calculating')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.locationBar}>
        <Text style={styles.locationText}>{locationLabel}</Text>
        <TouchableOpacity onPress={initLocation}>
          <Text style={styles.relocateText}>{t('map.relocate')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortBtn, sortBy === opt.key && styles.sortBtnActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[styles.sortBtnText, sortBy === opt.key && styles.sortBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.algorithmBar}>
        <Text style={styles.algorithmText}>{t('rank.algorithm')}</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
        }
      >
        {stations.map((station, index) => {
          const medal = getRankMedal(index);
          const price = getCurrentPrice(station);
          const scoreColor = getScoreColor(station.score);

          return (
            <TouchableOpacity
              key={station.id}
              style={styles.card}
              onPress={() => router.push(`/station/${station.id}`)}
            >
              <View style={[styles.medal, { backgroundColor: medal.bg }]}>
                <Text style={[styles.medalText, { color: medal.color }]}>{medal.label}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{station.name}</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>{station.address}</Text>

                <View style={styles.cardStats}>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatValue, { color: scoreColor }]}>
                      {price !== null ? `¥${price.toFixed(2)}` : '--'}
                    </Text>
                    <Text style={styles.cardStatLabel}>{t('station.per_kwh')}</Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatValue}>{station.distanceKm}km</Text>
                    <Text style={styles.cardStatLabel}>{t('station.km_away')}</Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatValue}>{station.availableCount}</Text>
                    <Text style={styles.cardStatLabel}>{t('station.available')}</Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatValue, { color: scoreColor }]}>
                      {Math.round(station.score * 100)}
                    </Text>
                    <Text style={styles.cardStatLabel}>{t('rank.score')}</Text>
                  </View>
                </View>

                <View style={[styles.labelTag, { backgroundColor: scoreColor + '18' }]}>
                  <Text style={[styles.labelText, { color: scoreColor }]}>
                    {station.recommendLabel}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          );
        })}

        {stations.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('common.error')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },

  locationBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  locationText: { fontSize: 13, color: '#333' },
  relocateText: { fontSize: 13, color: '#1DB954', fontWeight: '600' },

  sortBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  sortScroll: { paddingHorizontal: 16, gap: 8 },
  sortBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#f0f0f0',
  },
  sortBtnActive: { backgroundColor: '#1DB954' },
  sortBtnText: { fontSize: 13, color: '#666', fontWeight: '500' },
  sortBtnTextActive: { color: '#fff', fontWeight: '700' },

  algorithmBar: {
    backgroundColor: '#F0FBF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4F0DF',
  },
  algorithmText: { fontSize: 11, color: '#1DB954', textAlign: 'center' },

  list: { flex: 1 },
  listContent: { padding: 12, gap: 10, paddingBottom: 30 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  medal: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  medalText: { fontSize: 14, fontWeight: '800' },

  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardAddress: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 8 },

  cardStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardStatLabel: { fontSize: 10, color: '#999', marginTop: 1 },
  cardDivider: { width: 0.5, height: 28, backgroundColor: '#eee' },

  labelTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  labelText: { fontSize: 11, fontWeight: '600' },

  cardArrow: { fontSize: 20, color: '#ccc', flexShrink: 0 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#999' },
});