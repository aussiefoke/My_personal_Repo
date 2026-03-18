import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';

interface StationDetail {
  id: string;
  name: string;
  operatorId: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  chargerCountDc: number;
  chargerCountAc: number;
  status: string;
  reliabilityScore: number;
  parkingNote: string;
  accessNote: string;
  latestPrice: {
    elecFeePeak: number;
    elecFeeFlat: number;
    elecFeeValley: number;
    serviceFee: number;
    totalPeak: number;
    totalFlat: number;
    totalValley: number;
  } | null;
  chargers: {
    id: string;
    type: string;
    powerKw: number;
    connectorType: string;
    status: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    body: string;
    createdAt: string;
  }[];
  recentReports: {
    id: string;
    type: string;
    payload: string;
    createdAt: string;
  }[];
}

const OPERATOR_NAMES: Record<string, string> = {
  teld:           '特来电',
  star_charge:    '星星充电',
  state_grid:     '国家电网',
  yunquickcharge: '云快充',
  xiaoju:         '小桔充电',
  byd:            '比亚迪',
};

const CHARGER_TYPE_NAMES: Record<string, string> = {
  DC_fast:  '直流快充',
  AC_slow:  '交流慢充',
  DC_super: '超级快充',
};

const TIME_PERIODS = [
  { label: '峰时', time: '08:00 - 22:00', key: 'totalPeak' },
  { label: '平时', time: '12:00 - 17:00', key: 'totalFlat' },
  { label: '谷时', time: '22:00 - 08:00', key: 'totalValley' },
];

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [station, setStation] = useState<StationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStation();
  }, [id]);

  const loadStation = async () => {
    try {
      const res = await apiClient.get(`/stations/${id}/details`);
      setStation(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPeriod = () => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 12) return 'peak';
    if (hour >= 12 && hour < 17) return 'flat';
    if (hour >= 17 && hour < 22) return 'peak';
    return 'valley';
  };

  const navigateTo = () => {
    if (!station) return;
    const { lat, lng, name } = station;
    const encodedName = encodeURIComponent(name);

    Alert.alert('选择导航方式', '', [
      {
        text: '高德地图',
        onPress: () => {
          Linking.openURL(
            `iosamap://path?sourceApplication=ChargeSmart&dlat=${lat}&dlon=${lng}&dname=${encodedName}&dev=0&t=0`
          ).catch(() => Linking.openURL('https://apps.apple.com/cn/app/id461703208'));
        },
      },
      {
        text: '百度地图',
        onPress: () => {
          Linking.openURL(
            `baidumap://map/direction?destination=latlng:${lat},${lng}|name:${encodedName}&mode=driving&src=ChargeSmart`
          ).catch(() => Linking.openURL('https://apps.apple.com/cn/app/id452186370'));
        },
      },
      { text: '取消', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (!station) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>充电站信息加载失败</Text>
      </View>
    );
  }

  const period = getCurrentPeriod();
  const currentPrice = period === 'valley'
    ? station.latestPrice?.totalValley
    : station.latestPrice?.totalFlat;

  const reliabilityPct = Math.round((station.reliabilityScore ?? 0.5) * 100);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.operatorName}>
              {OPERATOR_NAMES[station.operatorId] ?? station.operatorId}
            </Text>
            <Text style={styles.address}>{station.address}</Text>
          </View>
        </View>

        {/* 实时状态 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>实时状态</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>
                {station.chargerCountDc + station.chargerCountAc}
              </Text>
              <Text style={styles.statusLabel}>总充电桩</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{station.chargerCountDc}</Text>
              <Text style={styles.statusLabel}>直流快充</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{station.chargerCountAc}</Text>
              <Text style={styles.statusLabel}>交流慢充</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: '#1DB954' }]}>
                {reliabilityPct}%
              </Text>
              <Text style={styles.statusLabel}>可靠性</Text>
            </View>
          </View>
        </View>

        {/* 当前价格高亮 */}
        {station.latestPrice && (
          <View style={styles.priceHighlight}>
            <View>
              <Text style={styles.priceHighlightLabel}>当前电价</Text>
              <Text style={styles.priceHighlightValue}>
                ¥{currentPrice?.toFixed(2)}/度
              </Text>
            </View>
            <View style={styles.priceHighlightRight}>
              <Text style={styles.priceHighlightLabel}>服务费</Text>
              <Text style={styles.priceHighlightSub}>
                ¥{station.latestPrice.serviceFee.toFixed(2)}/度
              </Text>
            </View>
          </View>
        )}

        {/* 分时电价表 */}
        {station.latestPrice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>分时电价</Text>
            {TIME_PERIODS.map((p) => {
              const price = station.latestPrice![p.key as keyof typeof station.latestPrice] as number;
              const isNow =
                (p.key === 'totalPeak' && period === 'peak') ||
                (p.key === 'totalFlat' && period === 'flat') ||
                (p.key === 'totalValley' && period === 'valley');
              return (
                <View key={p.key} style={[styles.priceRow, isNow && styles.priceRowActive]}>
                  <View style={styles.priceRowLeft}>
                    <Text style={[styles.periodLabel, isNow && styles.periodLabelActive]}>
                      {p.label}
                    </Text>
                    <Text style={styles.periodTime}>{p.time}</Text>
                  </View>
                  <Text style={[styles.periodPrice, isNow && styles.periodPriceActive]}>
                    ¥{price?.toFixed(2)}/度
                  </Text>
                  {isNow && <View style={styles.nowBadge}><Text style={styles.nowBadgeText}>当前</Text></View>}
                </View>
              );
            })}
          </View>
        )}

        {/* 充电桩列表 */}
        {station.chargers && station.chargers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>充电桩详情</Text>
            {station.chargers.map((c) => (
              <View key={c.id} style={styles.chargerRow}>
                <View>
                  <Text style={styles.chargerType}>
                    {CHARGER_TYPE_NAMES[c.type] ?? c.type}
                  </Text>
                  <Text style={styles.chargerSpec}>
                    {c.powerKw}kW · {c.connectorType ?? 'GB/T'}
                  </Text>
                </View>
                <View style={[
                  styles.chargerStatus,
                  { backgroundColor: c.status === 'available' ? '#1DB95422' : '#f0f0f0' }
                ]}>
                  <Text style={[
                    styles.chargerStatusText,
                    { color: c.status === 'available' ? '#1DB954' : '#999' }
                  ]}>
                    {c.status === 'available' ? '空闲' :
                     c.status === 'occupied' ? '占用' :
                     c.status === 'fault' ? '故障' : '未知'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 停车说明 */}
        {(station.parkingNote || station.accessNote) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>停车与进站</Text>
            {station.parkingNote && (
              <View style={styles.noteRow}>
                <Text style={styles.noteLabel}>停车说明</Text>
                <Text style={styles.noteValue}>{station.parkingNote}</Text>
              </View>
            )}
            {station.accessNote && (
              <View style={styles.noteRow}>
                <Text style={styles.noteLabel}>进站提示</Text>
                <Text style={styles.noteValue}>{station.accessNote}</Text>
              </View>
            )}
          </View>
        )}

        {/* 用户评价 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>用户评价</Text>
          {station.reviews && station.reviews.length > 0 ? (
            station.reviews.map((r) => (
              <View key={r.id} style={styles.reviewRow}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewRating}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
                {r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>暂无评价</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 底部导航按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navBtn} onPress={navigateTo}>
          <Text style={styles.navBtnText}>开始导航</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#999', fontSize: 14 },

  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 56,
  },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  headerInfo: { gap: 4 },
  stationName: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  operatorName: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  address: { fontSize: 13, color: '#888', marginTop: 2 },

  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 14,
  },

  statusRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  statusItem: { alignItems: 'center', flex: 1 },
  statusValue: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  statusLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  divider: { width: 1, height: 40, backgroundColor: '#f0f0f0' },

  priceHighlight: {
    backgroundColor: '#1DB954',
    marginTop: 10,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceHighlightLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  priceHighlightValue: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4 },
  priceHighlightRight: { alignItems: 'flex-end' },
  priceHighlightSub: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 4 },

  priceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  priceRowActive: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8 },
  priceRowLeft: { flex: 1 },
  periodLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  periodLabelActive: { color: '#1DB954' },
  periodTime: { fontSize: 12, color: '#999', marginTop: 2 },
  periodPrice: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  periodPriceActive: { color: '#1DB954', fontSize: 18 },
  nowBadge: {
    backgroundColor: '#1DB954', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8,
  },
  nowBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  chargerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  chargerType: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  chargerSpec: { fontSize: 12, color: '#888', marginTop: 2 },
  chargerStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  chargerStatusText: { fontSize: 12, fontWeight: '600' },

  noteRow: { marginBottom: 10 },
  noteLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  noteValue: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },

  reviewRow: {
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewRating: { fontSize: 14, color: '#FF9500' },
  reviewDate: { fontSize: 12, color: '#999' },
  reviewBody: { fontSize: 13, color: '#444', lineHeight: 20 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 16 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    borderTopWidth: 0.5, borderTopColor: '#eee',
  },
  navBtn: {
    backgroundColor: '#1DB954', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  navBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});