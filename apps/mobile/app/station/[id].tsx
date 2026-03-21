import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';

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

interface ScanResult {
  kwh: number;
  co2Saved: string;
  kmEquivalent: string;
  treesEquivalent: string;
  pointsEarned: number;
  found: boolean;
  reason?: string;
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

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguageStore();
  const [station, setStation] = useState<StationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [claiming, setClaiming] = useState(false);
  const { isLoggedIn } = useAuthStore();

  const TIME_PERIODS = [
    { label: t('station.peak'), time: '08:00 - 22:00', key: 'totalPeak' },
    { label: t('station.flat'), time: '12:00 - 17:00', key: 'totalFlat' },
    { label: t('station.valley'), time: '22:00 - 08:00', key: 'totalValley' },
  ];

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

  const handleScan = async (useCamera: boolean) => {
    if (!isLoggedIn()) {
      Alert.alert(t('station.login_required'), t('station.login_to_scan'), [
        { text: t('station.go_login'), onPress: () => router.push('/auth/login') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
      return;
    }

    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('station.camera_permission'), t('station.camera_permission_desc'));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('station.photo_permission'), t('station.photo_permission_desc'));
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            base64: true,
            quality: 0.7,
          });

      if (!result.canceled && result.assets[0].base64) {
        setScanning(true);
        try {
          const res = await apiClient.post('/ai/scan-receipt', {
            imageBase64: result.assets[0].base64,
            mimeType: result.assets[0].mimeType ?? 'image/jpeg',
          });
          setScanResult(res.data);
        } catch (e) {
          Alert.alert(t('station.scan_failed'), t('station.scan_failed_desc'));
        } finally {
          setScanning(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaim = async () => {
    if (!scanResult || !station) return;
    setClaiming(true);
    try {
      const res = await apiClient.post('/ai/claim-carbon-points', {
        kwh: scanResult.kwh,
        stationId: station.id,
      });
      Alert.alert(
        t('station.points_claimed'),
        `+${res.data.pointsEarned} ${t('profile.points_unit')}\n${scanResult.co2Saved}kg CO₂`,
        [{ text: t('common.confirm'), onPress: () => setScanResult(null) }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? t('station.claim_failed');
      Alert.alert(t('station.claim_failed'), msg);
    } finally {
      setClaiming(false);
    }
  };

  const navigateTo = () => {
    if (!station) return;
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
        <Text style={styles.errorText}>{t('common.error')}</Text>
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

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.operatorName}>
              {OPERATOR_NAMES[station.operatorId] ?? station.operatorId}
            </Text>
            <Text style={styles.address}>{station.address}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('station.realtime_status')}</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>
                {station.chargerCountDc + station.chargerCountAc}
              </Text>
              <Text style={styles.statusLabel}>{t('station.total_chargers')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{station.chargerCountDc}</Text>
              <Text style={styles.statusLabel}>{t('station.dc_fast')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{station.chargerCountAc}</Text>
              <Text style={styles.statusLabel}>{t('station.ac_slow')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: '#1DB954' }]}>
                {reliabilityPct}%
              </Text>
              <Text style={styles.statusLabel}>{t('station.reliability')}</Text>
            </View>
          </View>
        </View>

        {station.latestPrice && (
          <View style={styles.priceHighlight}>
            <View>
              <Text style={styles.priceHighlightLabel}>{t('station.current_price')}</Text>
              <Text style={styles.priceHighlightValue}>
                ¥{currentPrice?.toFixed(2)}{t('station.per_kwh')}
              </Text>
            </View>
            <View style={styles.priceHighlightRight}>
              <Text style={styles.priceHighlightLabel}>{t('station.service_fee')}</Text>
              <Text style={styles.priceHighlightSub}>
                ¥{station.latestPrice.serviceFee.toFixed(2)}{t('station.per_kwh')}
              </Text>
            </View>
          </View>
        )}

        {station.latestPrice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('station.time_of_use')}</Text>
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
                    ¥{price?.toFixed(2)}{t('station.per_kwh')}
                  </Text>
                  {isNow && (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>{t('station.now')}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {station.chargers && station.chargers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('station.charger_details')}</Text>
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
                    {c.status === 'available' ? t('station.available') :
                     c.status === 'occupied' ? t('station.occupied') :
                     c.status === 'fault' ? t('station.fault') : t('station.unknown')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('station.carbon_section')}</Text>
          <Text style={styles.scanDesc}>{t('station.carbon_desc')}</Text>

          {scanning ? (
            <View style={styles.scanningBox}>
              <ActivityIndicator size="large" color="#1DB954" />
              <Text style={styles.scanningText}>{t('station.scanning')}</Text>
            </View>
          ) : !scanResult ? (
            <View style={styles.scanBtnRow}>
              <TouchableOpacity style={styles.scanBtn} onPress={() => handleScan(false)}>
                <Text style={styles.scanBtnText}>{t('station.from_gallery')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scanBtn, styles.scanBtnOutline]}
                onPress={() => handleScan(true)}
              >
                <Text style={[styles.scanBtnText, { color: '#1DB954' }]}>{t('station.take_photo')}</Text>
              </TouchableOpacity>
            </View>
          ) : scanResult.found ? (
            <View style={styles.scanResultBox}>
              <Text style={styles.scanKwh}>{t('station.recognized_kwh')}{scanResult.kwh} {t('station.kwh_unit')}</Text>
              <View style={styles.carbonGrid}>
                <View style={styles.carbonItem}>
                  <Text style={styles.carbonItemValue}>{scanResult.co2Saved} kg</Text>
                  <Text style={styles.carbonItemSub}>CO₂</Text>
                </View>
                <View style={styles.carbonItem}>
                  <Text style={styles.carbonItemValue}>{scanResult.kmEquivalent} km</Text>
                  <Text style={styles.carbonItemSub}>{t('station.km_saved')}</Text>
                </View>
                <View style={styles.carbonItem}>
                  <Text style={styles.carbonItemValue}>{scanResult.treesEquivalent}</Text>
                  <Text style={styles.carbonItemSub}>{t('station.trees')}</Text>
                </View>
              </View>
              <View style={styles.pointsEarnedRow}>
                <Text style={styles.pointsEarnedText}>
                  +{scanResult.pointsEarned} {t('profile.points_unit')}
                </Text>
                <TouchableOpacity
                  style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
                  onPress={handleClaim}
                  disabled={claiming}
                >
                  {claiming
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.claimBtnText}>{t('station.claim_points')}</Text>
                  }
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setScanResult(null)}>
                <Text style={styles.rescanText}>{t('station.rescan')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.scanResultBox}>
              <Text style={styles.scanNotFound}>
                {scanResult.reason ?? t('station.scan_not_found')}
              </Text>
              <TouchableOpacity onPress={() => setScanResult(null)}>
                <Text style={styles.rescanText}>{t('station.rescan')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.carbonDisclaimer}>{t('station.carbon_disclaimer')}</Text>
        </View>

        {(station.parkingNote || station.accessNote) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('station.parking_access')}</Text>
            {station.parkingNote && (
              <View style={styles.noteRow}>
                <Text style={styles.noteLabel}>{t('station.parking_note')}</Text>
                <Text style={styles.noteValue}>{station.parkingNote}</Text>
              </View>
            )}
            {station.accessNote && (
              <View style={styles.noteRow}>
                <Text style={styles.noteLabel}>{t('station.access_note')}</Text>
                <Text style={styles.noteValue}>{station.accessNote}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('station.reviews')}</Text>
          {station.reviews && station.reviews.length > 0 ? (
            station.reviews.map((r) => (
              <View key={r.id} style={styles.reviewRow}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewRating}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-AU')}
                  </Text>
                </View>
                {r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('station.no_reviews')}</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.contributeBtn}
          onPress={() => router.push(`/contribute/${station.id}?stationName=${encodeURIComponent(station.name)}`)}
        >
          <Text style={styles.contributeBtnText}>{t('station.report')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={navigateTo}>
          <Text style={styles.navBtnText}>{t('station.navigate')}</Text>
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

  header: { backgroundColor: '#fff', padding: 16, paddingTop: 56 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  headerInfo: { gap: 4 },
  stationName: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  operatorName: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  address: { fontSize: 13, color: '#888', marginTop: 2 },

  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statusItem: { alignItems: 'center', flex: 1 },
  statusValue: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  statusLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  divider: { width: 1, height: 40, backgroundColor: '#f0f0f0' },

  priceHighlight: {
    backgroundColor: '#1DB954', marginTop: 10, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
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

  scanDesc: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 18 },
  scanBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  scanBtn: {
    flex: 1, backgroundColor: '#1DB954', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  scanBtnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#1DB954' },
  scanBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scanningBox: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  scanningText: { fontSize: 14, color: '#888' },
  scanResultBox: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, gap: 12 },
  scanKwh: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },

  carbonGrid: { flexDirection: 'row', gap: 12 },
  carbonItem: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 4,
  },
  carbonItemValue: { fontSize: 15, fontWeight: '800', color: '#1DB954' },
  carbonItemSub: { fontSize: 12, color: '#666' },
  carbonDisclaimer: {
    fontSize: 11, color: '#999', marginTop: 10, textAlign: 'center', lineHeight: 16,
  },

  pointsEarnedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pointsEarnedText: { fontSize: 16, fontWeight: '800', color: '#1DB954' },
  claimBtn: {
    backgroundColor: '#1DB954', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  claimBtnDisabled: { opacity: 0.6 },
  claimBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scanNotFound: { fontSize: 14, color: '#FF3B30', textAlign: 'center' },
  rescanText: { fontSize: 13, color: '#888', textAlign: 'center' },

  noteRow: { marginBottom: 10 },
  noteLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  noteValue: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },

  reviewRow: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewRating: { fontSize: 14, color: '#FF9500' },
  reviewDate: { fontSize: 12, color: '#999' },
  reviewBody: { fontSize: 13, color: '#444', lineHeight: 20 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 16 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    borderTopWidth: 0.5, borderTopColor: '#eee',
    flexDirection: 'row', gap: 12,
  },
  contributeBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#1DB954',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  contributeBtnText: { color: '#1DB954', fontSize: 15, fontWeight: '700' },
  navBtn: {
    flex: 1, backgroundColor: '#1DB954',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});