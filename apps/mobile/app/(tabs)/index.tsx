import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { rankingApi } from '../../lib/api';
import { useLanguageStore } from '../../store/languageStore';

interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  status: string | null;
  latestPrice: {
    totalFlat: number | null;
    totalPeak: number | null;
    totalValley: number | null;
  } | null;
  score: number;
  recommendLabel: string;
}

const DEFAULT_LAT = 22.5396;
const DEFAULT_LNG = 114.0577;

export default function MapScreen() {
  const { t } = useLanguageStore();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLng, setUserLng] = useState(DEFAULT_LNG);
  const [locationLabel, setLocationLabel] = useState<string>('');

  useEffect(() => {
    setLocationLabel(t('map.locating'));
    initLocation();
  }, []);

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
        loadStations(DEFAULT_LAT, DEFAULT_LNG);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setUserLat(latitude);
      setUserLng(longitude);
      setLocationLabel(t('map.current_location'));
      loadStations(latitude, longitude);
    } catch (e) {
      console.error('定位失败:', e);
      setLocationLabel(t('map.location_failed'));
      loadStations(DEFAULT_LAT, DEFAULT_LNG);
    }
  };

  const loadStations = async (lat: number, lng: number) => {
    try {
      const res = await rankingApi.nearby(lat, lng, 'best', 30);
      setStations(res.data.stations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  const navigateTo = (station: Station) => {
    const { lat, lng, name } = station;
    const encodedName = encodeURIComponent(name);
    Alert.alert(t('map.choose_nav'), '', [
      {
        text: t('map.amap'),
        onPress: () => {
          Linking.openURL(
            `iosamap://path?sourceApplication=ChargeSmart&dlat=${lat}&dlon=${lng}&dname=${encodedName}&dev=0&t=0`
          ).catch(() => Linking.openURL('https://apps.apple.com/cn/app/id461703208'));
        },
      },
      {
        text: t('map.baidu_map'),
        onPress: () => {
          Linking.openURL(
            `baidumap://map/direction?destination=latlng:${lat},${lng}|name:${encodedName}&mode=driving&src=ChargeSmart`
          ).catch(() => Linking.openURL('https://apps.apple.com/cn/app/id452186370'));
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const mapToken = 'pk.eyJ1IjoibHh5dHd3NTIwIiwiYSI6ImNtbXc0dnVubDJvOWkyb3BzcDVyZXQwaHAifQ.BriWL088vkKRNgwTLZ9Oxg';

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .price-pin { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .price-bubble {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 72px; padding: 6px 10px 4px 10px; border-radius: 12px;
      border: 3px solid #fff; box-shadow: 0 3px 12px rgba(0,0,0,0.4);
    }
    .price-main { color: #fff; font-size: 20px; font-weight: 900; line-height: 1.1; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .price-sub { color: rgba(255,255,255,0.9); font-size: 11px; font-weight: 600; margin-top: 1px; }
    .price-tail { width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; margin-top: -1px; }
    .user-dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: #1DB954; border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(29,185,84,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    mapboxgl.accessToken = '${mapToken}';
    var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [${userLng}, ${userLat}],
      zoom: 12
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    var stations = ${JSON.stringify(stations.map(s => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      price: getCurrentPrice(s),
      score: s.score,
      label: s.recommendLabel,
      distance: s.distanceKm,
    })))};

    map.on('load', function() {
      var userEl = document.createElement('div');
      userEl.className = 'user-dot';
      new mapboxgl.Marker({ element: userEl })
        .setLngLat([${userLng}, ${userLat}])
        .addTo(map);

      stations.forEach(function(s) {
        var color = s.score > 0.7 ? '#16a34a' : s.score > 0.4 ? '#ea580c' : '#dc2626';
        var priceText = s.price ? '¥' + s.price.toFixed(2) : '--';
        var el = document.createElement('div');
        el.className = 'price-pin';
        el.innerHTML =
          '<div class="price-bubble" style="background:' + color + '">' +
            '<span class="price-main">' + priceText + '</span>' +
            '<span class="price-sub">元/度</span>' +
          '</div>' +
          '<div class="price-tail" style="border-top:12px solid ' + color + '"></div>';
        el.addEventListener('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify(s));
        });
        new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([s.lng, s.lat])
          .addTo(map);
      });
    });
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>{t('map.loading_location')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.locationBar}>
            <Text style={styles.locationText}>{locationLabel}</Text>
            <TouchableOpacity onPress={initLocation}>
              <Text style={styles.relocateText}>{t('map.relocate')}</Text>
            </TouchableOpacity>
          </View>

          <WebView
            style={styles.map}
            source={{ html: mapHtml }}
            originWhitelist={['*']}
            mixedContentMode="always"
            javaScriptEnabled
            domStorageEnabled
            onMessage={(e) => {
              const data = JSON.parse(e.nativeEvent.data);
              const station = stations.find(s => s.id === data.id);
              if (station) setSelected(station);
            }}
          />

          {selected && (
            <View style={styles.bottomCard}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push(`/station/${selected.id}`)}>
                <Text style={styles.cardName}>{selected.name}</Text>
                <Text style={styles.viewDetail}>{t('map.view_detail')}</Text>
              </TouchableOpacity>
              <Text style={styles.cardAddress}>{selected.address}</Text>
              <View style={styles.cardRow}>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatValue, { color: getScoreColor(selected.score) }]}>
                    ¥{getCurrentPrice(selected)?.toFixed(2) ?? '--'}
                  </Text>
                  <Text style={styles.cardStatLabel}>{t('map.price_per_kwh')}</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={styles.cardStatValue}>{selected.distanceKm}km</Text>
                  <Text style={styles.cardStatLabel}>{t('station.km_away')}</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatValue, { color: '#1DB954' }]}>
                    {Math.round(selected.score * 100)}{t('rank.score_unit')}
                  </Text>
                  <Text style={styles.cardStatLabel}>{t('rank.score')}</Text>
                </View>
              </View>
              <Text style={[styles.cardLabel, { color: getScoreColor(selected.score) }]}>
                {selected.recommendLabel}
              </Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateTo(selected)}>
                <Text style={styles.navBtnText}>{t('station.navigate')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },

  locationBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  locationText: { fontSize: 13, color: '#333' },
  relocateText: { fontSize: 13, color: '#1DB954', fontWeight: '600' },

  bottomCard: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },
  closeBtnText: { fontSize: 16, color: '#999' },
  cardName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', paddingRight: 24 },
  viewDetail: { fontSize: 12, color: '#1DB954', marginBottom: 4, marginTop: 2 },
  cardAddress: { fontSize: 13, color: '#666', marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  cardStat: { alignItems: 'center' },
  cardStatValue: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  cardStatLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  cardLabel: { fontSize: 13, textAlign: 'center', fontWeight: '500', marginBottom: 10 },
  navBtn: {
    backgroundColor: '#1DB954', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});