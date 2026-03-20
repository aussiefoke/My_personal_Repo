import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { apiClient } from '../../lib/api';

const TIER_COLORS: Record<string, string> = {
  newbie:   '#888',
  regular:  '#1DB954',
  expert:   '#FF9500',
  guardian: '#FF3B30',
};

const TIER_NEXT_POINTS: Record<string, number> = {
  newbie:   100,
  regular:  500,
  expert:   2000,
  guardian: 9999,
};

export default function ProfileScreen() {
  const { user, token, logout, isLoggedIn } = useAuthStore();
  const { language, setLanguage, t } = useLanguageStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) loadTransactions();
  }, [token]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/me/transactions');
      setTransactions(res.data.transactions ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ACTION_LABELS: Record<string, string> = {
    price_update: t('contribute.price_update'),
    queue:        t('contribute.queue_report'),
    fault:        t('contribute.fault_report'),
    access_tip:   t('contribute.checkin'),
    review:       t('profile.write_review'),
    new_station:  t('profile.new_station'),
  };

  if (!isLoggedIn()) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestTitle}>{t('profile.guest_title')}</Text>
        <Text style={styles.guestDesc}>{t('profile.guest_desc')}</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginBtnText}>{t('profile.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tier = user?.tier ?? 'newbie';
  const points = user?.points ?? 0;
  const nextPoints = TIER_NEXT_POINTS[tier];
  const progress = Math.min(points / nextPoints, 1);

  const co2Saved = (points * 0.5).toFixed(1);
  const treesSaved = (points * 0.5 / 18).toFixed(1);
  const kmSaved = (points * 0.5 / 0.094 / 1000).toFixed(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* 用户信息卡片 */}
      <View style={styles.userCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.phone?.slice(-4) ?? '??'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.phone}>+86 {user?.phone}</Text>
          <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[tier] + '22' }]}>
            <Text style={[styles.tierText, { color: TIER_COLORS[tier] }]}>
              {t(`level.${tier}`)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>

      {/* 积分卡片 */}
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>{t('profile.points')}</Text>
        <Text style={styles.pointsValue}>{points}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {t('profile.points_to_next')} {Math.max(nextPoints - points, 0)} {t('profile.points_unit')}
        </Text>
      </View>

      {/* 碳减排卡片 */}
      <View style={styles.carbonCard}>
        <Text style={styles.sectionTitle}>{t('profile.carbon_title')}</Text>
        <View style={styles.carbonRow}>
          <View style={styles.carbonStat}>
            <Text style={styles.carbonValue}>{co2Saved}</Text>
            <Text style={styles.carbonLabel}>kg CO₂</Text>
          </View>
          <View style={styles.carbonDivider} />
          <View style={styles.carbonStat}>
            <Text style={styles.carbonValue}>{treesSaved}</Text>
            <Text style={styles.carbonLabel}>{t('profile.trees')}</Text>
          </View>
          <View style={styles.carbonDivider} />
          <View style={styles.carbonStat}>
            <Text style={styles.carbonValue}>{kmSaved}</Text>
            <Text style={styles.carbonLabel}>{t('profile.km_saved')}</Text>
          </View>
        </View>
        <Text style={styles.carbonNote}>{t('profile.carbon_note')}</Text>
      </View>

      {/* 语言切换 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.langToggleWrap}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'zh' && styles.langBtnActive]}
            onPress={() => setLanguage('zh')}
          >
            <Text style={[styles.langText, language === 'zh' && styles.langTextActive]}>
              🇨🇳 中文
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
              🇬🇧 English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 积分说明 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.how_to_earn')}</Text>
        <View style={styles.earnGrid}>
          {[
            { key: 'contribute.price_update', pts: 15 },
            { key: 'contribute.queue_report',  pts: 8  },
            { key: 'contribute.fault_report',  pts: 12 },
            { key: 'profile.write_review',     pts: 10 },
            { key: 'contribute.checkin',       pts: 10 },
            { key: 'profile.new_station',      pts: 20 },
          ].map((item) => (
            <View key={item.key} style={styles.earnItem}>
              <Text style={styles.earnAction}>{t(item.key)}</Text>
              <Text style={styles.earnPoints}>+{item.pts}{t('profile.points_unit')}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 积分记录 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.transactions')}</Text>
        {loading ? (
          <ActivityIndicator color="#1DB954" style={{ marginTop: 16 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('profile.no_records')}</Text>
            <TouchableOpacity
              style={styles.contributeBtn}
              onPress={() => router.push('/')}
            >
              <Text style={styles.contributeBtnText}>{t('profile.go_map')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          transactions.slice(0, 10).map((tx, i) => (
            <View key={i} style={styles.txRow}>
              <View>
                <Text style={styles.txAction}>
                  {ACTION_LABELS[tx.actionType] ?? tx.actionType}
                </Text>
                <Text style={styles.txTime}>
                  {new Date(tx.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-AU')}
                </Text>
              </View>
              <Text style={styles.txPoints}>+{tx.amount}{t('profile.points_unit')}</Text>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  guestContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: '#fff',
  },
  guestTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  guestDesc: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  loginBtn: {
    backgroundColor: '#1DB954', borderRadius: 12,
    paddingHorizontal: 40, paddingVertical: 14,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  userCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1DB95422', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#1DB954' },
  userInfo: { flex: 1, gap: 4 },
  phone: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  tierBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20,
  },
  tierText: { fontSize: 12, fontWeight: '600' },
  logoutBtn: { padding: 8 },
  logoutText: { fontSize: 13, color: '#999' },

  pointsCard: {
    backgroundColor: '#1DB954', borderRadius: 16, padding: 20,
    shadowColor: '#1DB954', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  pointsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  pointsValue: { fontSize: 48, fontWeight: '800', color: '#fff', lineHeight: 56 },
  progressBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3, marginTop: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

  carbonCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  carbonRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginTop: 12, marginBottom: 12,
  },
  carbonStat: { alignItems: 'center', flex: 1 },
  carbonValue: { fontSize: 22, fontWeight: '800', color: '#1DB954' },
  carbonLabel: { fontSize: 11, color: '#999', marginTop: 4, textAlign: 'center' },
  carbonDivider: { width: 1, height: 40, backgroundColor: '#f0f0f0' },
  carbonNote: { fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 16 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },

  langToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 3,
  },
  langBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
  },
  langBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 4, elevation: 2,
  },
  langText: { fontSize: 14, color: '#888', fontWeight: '500' },
  langTextActive: { color: '#1a1a1a', fontWeight: '700' },

  earnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  earnItem: {
    width: '30%', backgroundColor: '#f8f8f8', borderRadius: 10,
    padding: 10, alignItems: 'center', gap: 4,
  },
  earnAction: { fontSize: 11, color: '#666', textAlign: 'center' },
  earnPoints: { fontSize: 13, fontWeight: '700', color: '#1DB954' },

  emptyBox: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  contributeBtn: {
    backgroundColor: '#1DB95422', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  contributeBtnText: { color: '#1DB954', fontSize: 14, fontWeight: '600' },

  txRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  txAction: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  txTime: { fontSize: 12, color: '#999', marginTop: 2 },
  txPoints: { fontSize: 16, fontWeight: '700', color: '#1DB954' },
});