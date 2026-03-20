import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';

const ADS = [
  { bgColor: '#0a1628', accentColor: '#1DB954' },
  { bgColor: '#1a0a28', accentColor: '#A855F7' },
  { bgColor: '#1a1200', accentColor: '#F59E0B' },
];

export default function SplashAd() {
  const [countdown, setCountdown] = useState(5);
  const opacity = useRef(new Animated.Value(0)).current;
  const [ad] = useState(() => ADS[Math.floor(Math.random() * ADS.length)]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);

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

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.skipText}>跳过 {countdown}s</Text>
        </TouchableOpacity>

        <View style={styles.sponsorTag}>
          <Text style={styles.sponsorText}>广告</Text>
        </View>

        <View style={styles.adContent}>
          <Text style={[styles.adTitle, { color: ad.accentColor }]}>
            广告位招租
          </Text>
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
  container: { flex: 1, backgroundColor: '#fff' },

  adArea: {
    flex: 75,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 56, right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: { color: '#fff', fontSize: 13 },
  sponsorTag: {
    position: 'absolute',
    top: 56, left: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 4,
  },
  sponsorText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  adContent: { gap: 12 },
  adTitle: { fontSize: 36, fontWeight: '800', letterSpacing: 2 },

  brandArea: {
    flex: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  brandName: { fontSize: 32, fontWeight: '800', color: '#1a1a1a', letterSpacing: 4 },
  brandEn: { fontSize: 14, fontWeight: '600', letterSpacing: 3 },
  brandSlogan: { fontSize: 13, color: '#999', marginTop: 4 },
});