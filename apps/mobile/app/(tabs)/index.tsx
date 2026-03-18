import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { rankingApi } from '../../lib/api';

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

export default function MapScreen() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const res = await rankingApi.nearby(22.5396, 114.0577, 'best', 30);
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

  // 生成地图 HTML（OpenStreetMap + Leaflet.js）
 const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }

    .price-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .price-bubble {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 72px;
      padding: 6px 10px 4px 10px;
      border-radius: 12px;
      border: 3px solid #fff;
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
    }
    .price-main {
      color: #fff;
      font-size: 20px;
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: -0.5px;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .price-sub {
      color: rgba(255,255,255,0.9);
      font-size: 11px;
      font-weight: 600;
      margin-top: 1px;
    }
    .price-tail {
      width: 0;
      height: 0;
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      margin-top: -1px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([22.5396, 114.0577], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

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

    stations.forEach(function(s) {
      var color = s.score > 0.7 ? '#16a34a' : s.score > 0.4 ? '#ea580c' : '#dc2626';
      var priceText = s.price ? '¥' + s.price.toFixed(2) : '--';

      var icon = L.divIcon({
        className: '',
        html:
          '<div class="price-pin">' +
            '<div class="price-bubble" style="background:' + color + '">' +
              '<span class="price-main">' + priceText + '</span>' +
              '<span class="price-sub">元/度</span>' +
            '</div>' +
            '<div class="price-tail" style="border-top:12px solid ' + color + '"></div>' +
          '</div>',
        iconSize: [80, 58],
        iconAnchor: [40, 58],
        popupAnchor: [0, -60],
      });

      var marker = L.marker([s.lat, s.lng], { icon: icon }).addTo(map);
      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify(s));
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
          <Text style={styles.loadingText}>正在查找附近充电站...</Text>
        </View>
      ) : (
        <>
          <WebView
            style={styles.map}
            source={{ html: mapHtml }}
            onMessage={(e) => {
              const station = stations.find(s => s.id === JSON.parse(e.nativeEvent.data).id);
              if (station) setSelected(station);
            }}
            javaScriptEnabled
            domStorageEnabled
          />

          {/* 底部信息卡片 */}
          {selected && (
            <View style={styles.bottomCard}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.cardName}>{selected.name}</Text>
              <Text style={styles.cardAddress}>{selected.address}</Text>
              <View style={styles.cardRow}>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatValue, { color: getScoreColor(selected.score) }]}>
                    ¥{getCurrentPrice(selected)?.toFixed(2) ?? '--'}
                  </Text>
                  <Text style={styles.cardStatLabel}>当前单价/度</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={styles.cardStatValue}>{selected.distanceKm}km</Text>
                  <Text style={styles.cardStatLabel}>距离</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatValue, { color: '#1DB954' }]}>
                    {Math.round(selected.score * 100)}分
                  </Text>
                  <Text style={styles.cardStatLabel}>综合评分</Text>
                </View>
              </View>
              <Text style={[styles.cardLabel, { color: getScoreColor(selected.score) }]}>
                {selected.recommendLabel}
              </Text>
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
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },
  closeBtnText: { fontSize: 16, color: '#999' },
  cardName: { fontSize: 17, fontWeight: '700', marginBottom: 4, paddingRight: 24 },
  cardAddress: { fontSize: 13, color: '#666', marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  cardStat: { alignItems: 'center' },
  cardStatValue: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  cardStatLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  cardLabel: { fontSize: 13, textAlign: 'center', fontWeight: '500' },
});