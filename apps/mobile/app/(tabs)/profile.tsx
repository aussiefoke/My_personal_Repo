import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/api';

const TIER_LABELS: Record<string, string> = {
  newbie:   '充电新手',
  regular:  '充电达人',
  expert:   '充电专家',
  guardian: '充电守护者',
};

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
    price_update: '更新价格',
    queue:        '排队报告',
    fault:        '故障上报',
    access_tip:   '进站提示',
    review:       '撰写评价',
    new_station:  '新增站点',
  };

  if (!isLoggedIn()) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestIcon}>👤</Text>
        <Text style={styles.guestTitle}>登录后解锁更多功能</Text>
        <Text style={styles.guestDesc}>
          贡献价格数据、赢取积分、解锁专属徽章
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginBtnText}>立即登录</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tier = user?.tier ?? 'newbie';
  const points = user?.points ?? 0;
  const nextPoints = TIER_NEXT_POINTS[tier];
  const progress = Math.min(points / nextPoints, 1);

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
              {TIER_LABELS[tier]}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>退出</Text>
        </TouchableOpacity>
      </View>

      {/* 积分卡片 */}
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>我的积分</Text>
        <Text style={styles.pointsValue}>{points}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          距下一等级还需 {Math.max(nextPoints - points, 0)} 积分
        </Text>
      </View>

      {/* 积分说明 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>如何获取积分</Text>
        <View style={styles.earnGrid}>
          {[
            { action: '更新价格', points: 15, icon: '💰' },
            { action: '排队报告', points: 8,  icon: '🚗' },
            { action: '故障上报', points: 12, icon: '🔧' },
            { action: '撰写评价', points: 10, icon: '⭐' },
            { action: '进站提示', points: 10, icon: '📍' },
            { action: '新增站点', points: 20, icon: '➕' },
          ].map((item) => (
            <View key={item.action} style={styles.earnItem}>
              <Text style={styles.earnIcon}>{item.icon}</Text>
              <Text style={styles.earnAction}>{item.action}</Text>
              <Text style={styles.earnPoints}>+{item.points}分</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 积分记录 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>积分记录</Text>
        {loading ? (
          <ActivityIndicator color="#1DB954" style={{ marginTop: 16 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>暂无记录，去贡献数据赚积分吧！</Text>
        <TouchableOpacity
  style={styles.contributeBtn}
  onPress={() => router.push('/')}
>
  <Text style={styles.contributeBtnText}>去地图找充电站</Text>
</TouchableOpacity>
          </View>
        ) : (
          transactions.slice(0, 10).map((t, i) => (
            <View key={i} style={styles.txRow}>
              <View>
                <Text style={styles.txAction}>
                  {ACTION_LABELS[t.actionType] ?? t.actionType}
                </Text>
                <Text style={styles.txTime}>
                  {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <Text style={styles.txPoints}>+{t.amount}分</Text>
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
  guestIcon: { fontSize: 64, marginBottom: 16 },
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

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },

  earnGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  earnItem: {
    width: '30%', backgroundColor: '#f8f8f8', borderRadius: 10,
    padding: 10, alignItems: 'center', gap: 4,
  },
  earnIcon: { fontSize: 24 },
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