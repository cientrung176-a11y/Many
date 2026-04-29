import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView, TextInput as TextInputType,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import api from '../lib/api';
import { storage } from '../lib/storage';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const passRef = useRef<TextInputType>(null);

  const [request, response, promptGoogleAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) handleGoogleToken(authentication.accessToken);
    }
  }, [response]);

  async function handleGoogleToken(accessToken: string) {
    setGoogleLoading(true);
    try {
      const res = await api.post('/auth/google', { access_token: accessToken });
      await storage.setToken(res.data.token);
      await storage.setUser(res.data.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Google Sign In thất bại', e.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        username: identifier.trim().toLowerCase(),
        password,
      });
      await storage.setToken(res.data.token);
      await storage.setUser(res.data.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>💰</Text>
            </View>
            <Text style={styles.appName}>SpendWise</Text>
            <Text style={styles.tagline}>Quản lý chi tiêu thông minh</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chào mừng trở lại</Text>
            <Text style={styles.cardSub}>Đăng nhập để tiếp tục</Text>

            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tên đăng nhập hoặc email"
                placeholderTextColor="#9ca3af"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                ref={passRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="Mật khẩu"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.75 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Đăng nhập</Text>
              }
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerTxt}>hoặc</Text>
              <View style={styles.line} />
            </View>

            {GOOGLE_CLIENT_ID ? (
              <TouchableOpacity
                style={[styles.googleBtn, (googleLoading || !request) && { opacity: 0.6 }]}
                onPress={() => promptGoogleAsync()}
                disabled={!request || googleLoading}
              >
                {googleLoading
                  ? <ActivityIndicator color="#374151" />
                  : (
                    <>
                      <Text style={{ fontSize: 20, marginRight: 8 }}>G</Text>
                      <Text style={styles.googleBtnTxt}>Đăng nhập bằng Google</Text>
                    </>
                  )
                }
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/register')}>
              <Text style={styles.registerTxt}>
                Chưa có tài khoản? <Text style={{ color: '#16a34a', fontWeight: '700' }}>Đăng ký ngay</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#16a34a' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#bbf7d0', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 28 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  cardSub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    backgroundColor: '#f9fafb', paddingHorizontal: 14, marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#111827', paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, elevation: 3,
    shadowColor: '#16a34a', shadowOpacity: 0.35, shadowRadius: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerTxt: { color: '#9ca3af', fontSize: 13, marginHorizontal: 12 },
  registerBtn: { alignItems: 'center', paddingVertical: 4 },
  registerTxt: { fontSize: 15, color: '#6b7280' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingVertical: 14, marginBottom: 12, backgroundColor: '#fff',
  },
  googleBtnTxt: { fontSize: 15, fontWeight: '700', color: '#374151' },
});
