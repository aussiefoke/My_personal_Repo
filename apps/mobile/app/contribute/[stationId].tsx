import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const CONTRIBUTION_TYPES = [
  { key: 'price_update', label: '更新价格', points: 15, desc: '报告当前充电价格' },
  { key: 'fault',        label: '故障上报', points: 12, desc: '充电桩故障或损坏' },
  { key: 'queue',        label: '排队报告', points: 8,  desc: '当前排队等候情况' },
  { key: 'access_tip',   label: '进站提示', points: 10, desc: '进站路线或注意事项' },
];

export default function ContributeScreen() {
  const { stationId, stationName } = useLocalSearchParams<{
    stationId: string;
    stationName: string;
  }>();
  const { isLoggedIn } = useAuthStore();

  const [selectedType, setSelectedType] = useState('price_update');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedContrib = CONTRIBUTION_TYPES.find(c => c.key === selectedType);

  const handleSubmit = async () => {
    if (!isLoggedIn()) {
      Alert.alert('请先登录', '登录后才能贡献数据', [
        { text: '去登录', onPress: () => router.push('/auth/login') },
        { text: '取消', style: 'cancel' },
      ]);
      return;
    }

    if (selectedType === 'price_update' && !price) {
      Alert.alert('请输入价格', '更新价格需要填写当前电价');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = { note };
      if (selectedType === 'price_update' && price) {
        payload.price = parseFloat(price);
      }

      await apiClient.post('/contributions', {
        stationId,
        type: selectedType,
        payload: JSON.stringify(payload),
      });

      Alert.alert(
        '提交成功',
        `感谢你的贡献！已获得 +${selectedContrib?.points} 积分`,
        [{ text: '好的', onPress: () => router.back() }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? '提交失败，请稍后重试';
      Alert.alert('提交失败', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>贡献数据</Text>
          <Text style={styles.stationName} numberOfLines={1}>
            {decodeURIComponent(stationName ?? '')}
          </Text>
        </View>

        {/* 贡献类型选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择贡献类型</Text>
          {CONTRIBUTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeCard,
                selectedType === type.key && styles.typeCardActive,
              ]}
              onPress={() => setSelectedType(type.key)}
            >
              <View style={styles.typeCardLeft}>
                <Text style={[
                  styles.typeCardLabel,
                  selectedType === type.key && styles.typeCardLabelActive,
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.typeCardDesc}>{type.desc}</Text>
              </View>
              <View style={[
                styles.pointsBadge,
                selectedType === type.key && styles.pointsBadgeActive,
              ]}>
                <Text style={[
                  styles.pointsBadgeText,
                  selectedType === type.key && styles.pointsBadgeTextActive,
                ]}>
                  +{type.points}分
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 价格输入（仅更新价格时显示） */}
        {selectedType === 'price_update' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>当前电价</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.pricePrefix}>¥</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                placeholder="输入当前电价，例如 0.98"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={styles.priceSuffix}>/度</Text>
            </View>
          </View>
        )}

        {/* 备注 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>备注（可选）</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="补充说明，例如：快充桩3号故障，4号正常"
            placeholderTextColor="#999"
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.noteCount}>{note.length}/200</Text>
        </View>

        {/* 防作弊说明 */}
        <View style={styles.ruleBox}>
          <Text style={styles.ruleTitle}>贡献规则</Text>
          <Text style={styles.ruleText}>· 需在充电站 300 米范围内提交</Text>
          <Text style={styles.ruleText}>· 每站每天最多提交 3 条</Text>
          <Text style={styles.ruleText}>· 经 2 人以上验证后积分生效</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 底部提交按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>
                提交贡献 · 获得 +{selectedContrib?.points} 积分
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
    padding: 12, fontSize: 14, color: '#1a1a1a',
    minHeight: 100,
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