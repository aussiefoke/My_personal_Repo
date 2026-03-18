import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';

// ---- 赞助商广告数据 ----
// 以后新增赞助商只需要往这个数组里加一条
const ADS = [
  {
    sponsor: '特来电',
    bgColor: '#0a1628',
    accentColor: '#1DB954',
    tag: '充电品牌赞助',
    title: '特来电，充电更放心',
    subtitle: '全国8万+充电站，覆盖高速·商场·社区',
    cta: '立即查看附近特来电',
  },
  {
    sponsor: '星星充电',
    bgColor: '#1a0a28',
    accentColor: '#A855F7',
    tag: '充电品牌赞助',
    title: '星星充电，快充不等待',
    subtitle: '最快30分钟充至80%，超快DC快充桩',
    cta: '查找附近星星充电站',
  },
  {
    sponsor: '比亚迪',
    bgColor: '#1a1200',
    accentColor: '#F59E0B',
    tag: '汽车品牌赞助',
    title: '比亚迪，新能源领跑者',
    subtitle: '刀片电池·安全·耐用·超长续航',
    cta: '了解比亚迪充电方案',
  },
];

export default function SplashAd() {
  const [countdown, setCountdown] = useState(5);
  const opacity = useRef(new Animated.Value(0)).current;

  // 每次启动随机选一个广告
  const [ad] = useState(() => ADS[Math.floor(Math.random() * ADS.length)]);

 useEffect(() => {
  Animated.timing(opacity, {
    toValue: 1,
    duration: 500,
    useNativeDriver: true,
  }).start();

  const timer = setInterval(() => {
    setCountdown((prev) => {
      if (prev <= 1) {
        clearInterval(timer);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  // 单独用 setTimeout 处理跳转，不放在 setCountdown 里
  const navTimer = setTimeout(() => {
    router.replace('/(tabs)');
  }, 5000);

  return () => {
    clearInterval(timer);
    clearTimeout(navTimer);
  };
}, []);
  return (
    <Animated.View style={[styles.container, { opacity }]}>

      {/* 广告区域 75% */}
      <View style={[styles.adArea, { backgroundColor: ad.bgColor }]}>

        {/* 跳过按钮 */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.skipText}>跳过 {countdown}s</Text>
        </TouchableOpacity>

        {/* 赞助商标签 */}
        <View style={styles.sponsorTag}>
          <Text style={styles.sponsorText}>{ad.tag} · {ad.sponsor}</Text>
        </View>

        {/* 广告内容 */}
        <View style={styles.adContent}>
          <Text style={[styles.adTitle, { color: ad.accentColor }]}>
            {ad.title}
          </Text>
          <Text style={styles.adSubtitle}>{ad.subtitle}</Text>

          {/* CTA 按钮 */}
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: ad.accentColor }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.ctaText}>{ad.cta}</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* 品牌区域 25% */}
      <View style={styles.brandArea}>
        <Text style={styles.brandName}>充电智选</Text>
        <Text style={[styles.brandEn, { color: ad.accentColor }]}>
          ChargeSmart
        </Text>
        <Text style={styles.brandSlogan}>智能找充电，省钱又省心</Text>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // 广告区 75%
  adArea: {
    flex: 75,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
  },
  sponsorTag: {
    position: 'absolute',
    top: 56,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sponsorText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  adContent: {
    gap: 12,
  },
  adTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  adSubtitle: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 22,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // 品牌区 25%
  brandArea: {
    flex: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 4,
  },
  brandEn: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 3,
  },
  brandSlogan: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
});