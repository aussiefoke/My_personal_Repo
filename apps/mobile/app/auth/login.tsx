import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { authApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuthStore();

  const sendOtp = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.sendOtp(phone);
      setStep('otp');
      // 60秒倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      setError('发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp(phone, code);
      setToken(res.data.token);
      setUser(res.data.user);
      router.replace('/(tabs)');
    } catch (e) {
      setError('验证码错误或已过期');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>充电智选</Text>
          <Text style={styles.logoSub}>ChargeSmart</Text>
          <Text style={styles.logoDesc}>登录后可贡献数据、获取积分</Text>
        </View>

        {/* 表单 */}
        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              <Text style={styles.label}>手机号</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>+86</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请输入手机号"
                  keyboardType="phone-pad"
                  maxLength={11}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={sendOtp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>获取验证码</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>验证码</Text>
              <Text style={styles.phoneHint}>已发送至 +86 {phone}</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="请输入6位验证码"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={verifyOtp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>登录</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={sendOtp}
                disabled={countdown > 0}
              >
                <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                  {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送验证码'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* 跳过登录 */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.skipText}>暂不登录，先看看</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoText: { fontSize: 36, fontWeight: '800', color: '#1a1a1a', letterSpacing: 3 },
  logoSub: { fontSize: 14, color: '#1DB954', fontWeight: '600', letterSpacing: 3, marginTop: 4 },
  logoDesc: { fontSize: 13, color: '#999', marginTop: 8 },
  form: { gap: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  phoneHint: { fontSize: 13, color: '#888', marginTop: -6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  prefix: { fontSize: 16, color: '#1a1a1a', fontWeight: '600' },
  input: { flex: 1, fontSize: 16, color: '#1a1a1a' },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 22,
    letterSpacing: 8,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  error: { fontSize: 13, color: '#FF3B30', marginTop: -4 },
  btn: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 14, color: '#1DB954', fontWeight: '500' },
  resendDisabled: { color: '#999' },
  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 14, color: '#999' },
});