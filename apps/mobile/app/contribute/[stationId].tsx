import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import * as Location from 'expo-location';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';

export default function ContributeScreen() {
  const { stationId, stationName } = useLocalSearchParams<{
    stationId: string;
    stationName: string;
  }>();
  const { isLoggedIn } = useAuthStore();
  const { t } = useLanguageStore();

  const CONTRIBUTION_TYPES = [
    { key: 'price_update', label: t('contribute.price_update'), points: 15, desc: t('contribute.price_update_desc') },
    { key: 'fault',        label: t('contribute.fault_report'), points: 12, desc: t('contribute.fault_report_desc') },
    { key: 'queue',        label: t('contribute.queue_report'), points: 8,  desc: t('contribute.queue_report_desc') },
    { key: 'access_tip',   label: t('contribute.checkin'),      points: 10, desc: t('contribute.checkin_desc') },
  ];

  const [selectedType, setSelectedType] = useState('price_update');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedContrib = CONTRIBUTION_TYPES.find(c => c.key === selectedType);

  const handleSubmit = async () => {
    if (!isLoggedIn()) {
      Alert.alert(t('station.login_required'), t('station.login_to_scan'), [
        { text: t('station.go_login'), onPress: () => router.push('/auth/login') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
      return;
    }

    if (selectedType === 'price_update' && !price) {
      Alert.alert(t('contribute.price_required'), t('contribute.price_required_desc'));
      return;
    }

    setSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('station.camera_permission'), t('contribute.location_required'));
        setSubmitting(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const payload: any = { note };
      if (selectedType === 'price_update' && price) {
        payload.price = parseFloat(price);
      }

      await apiClient.post('/contributions', {
        stationId,
        type: selectedType,
        payload,
        userLat: location.coords.latitude,
        userLng: location.coords.longitude,
      });

      Alert.alert(
        t('contribute.success'),
        `${t('contribute.success_desc')} +${selectedContrib?.points} ${t('profile.points_unit')}`,
        [{ text: t('common.confirm'), onPress: () => router.back() }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? t('contribute.fail_desc');
      Alert.alert(t('contribute.fail'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('contribute.title')}</Text>
          <Text style={styles.stationName} numberOfLines={1}>
            {decodeURIComponent(stationName ?? '')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('contribute.select_type')}</Text>
          {CONTRIBUTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.typeCard, selectedType === type.key && styles.typeCardActive]}
              onPress={() => setSelectedType(type.key)}
            >
              <View style={styles.typeCardLeft}>
                <Text style={[styles.typeCardLabel, selectedType === type.key && styles.typeCardLabelActive]}>
                  {type.label}
                </Text>
                <Text style={styles.typeCardDesc}>{type.desc}</Text>
              </View>
              <View style={[styles.pointsBadge, selectedType === type.key && styles.pointsBadgeActive]}>
                <Text style={[styles.pointsBadgeText, selectedType === type.key && styles.pointsBadgeTextActive]}>
                  +{type.points}{t('profile.points_unit')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selectedType === 'price_update' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('contribute.current_price')}</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.pricePrefix}>¥</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                placeholder={t('contribute.price_placeholder')}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={styles.priceSuffix}>{t('contribute.per_kwh')}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('contribute.note')}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t('contribute.note_placeholder')}
            placeholderTextColor="#999"
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.noteCount}>{note.length}/200</Text>
        </View>

        <View style={styles.ruleBox}>
          <Text style={styles.ruleTitle}>{t('contribute.rules_title')}</Text>
          <Text style={styles.ruleText}>{t('contribute.rule_1')}</Text>
          <Text style={styles.ruleText}>{t('contribute.rule_2')}</Text>
          <Text style={styles.ruleText}>{t('contribute.rule_3')}</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>
                {t('contribute.submit')} · +{selectedContrib?.points} {t('profile.points_unit')}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { paddingBottom: 20 },

  header: { backgroundColor: '#fff', padding: 16, paddingTop: 56, gap: 4 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  stationName: { fontSize: 13, color: '#888' },

  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  typeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#eee',
    marginBottom: 10, backgroundColor: '#fafafa',
  },
  typeCardActive: { borderColor: '#1DB954', backgroundColor: '#f0fdf4' },
  typeCardLeft: { flex: 1 },
  typeCardLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  typeCardLabelActive: { color: '#1DB954' },
  typeCardDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  pointsBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, backgroundColor: '#f0f0f0',
  },
  pointsBadgeActive: { backgroundColor: '#1DB954' },
  pointsBadgeText: { fontSize: 13, fontWeight: '700', color: '#888' },
  pointsBadgeTextActive: { color: '#fff' },

  priceInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  pricePrefix: { fontSize: 20, fontWeight: '700', color: '#1DB954', marginRight: 4 },
  priceInput: { flex: 1, fontSize: 24, fontWeight: '700', color: '#1a1a1a', paddingVertical: 10 },
  priceSuffix: { fontSize: 14, color: '#888' },

  noteInput: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1a1a1a', minHeight: 100,
  },
  noteCount: { fontSize: 11, color: '#ccc', textAlign: 'right', marginTop: 4 },

  ruleBox: {
    margin: 16, padding: 14, backgroundColor: '#fff',
    borderRadius: 12, gap: 6,
  },
  ruleTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  ruleText: { fontSize: 12, color: '#888', lineHeight: 20 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    borderTopWidth: 0.5, borderTopColor: '#eee',
  },
  submitBtn: {
    backgroundColor: '#1DB954', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});