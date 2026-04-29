import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView, TextInput as TextInputType,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { storage } from '../lib/storage';

type Step = 'account' | 'household';
type HouseholdMode = 'create' | 'join';

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('account');

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [hhMode, setHhMode] = useState<HouseholdMode>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [loading, setLoading] = useState(false);

  const usernameRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);
  const passRef = useRef<TextInputType>(null);
  const confirmRef = useRef<TextInputType>(null);

  function validateAccount() {
    if (!displayName.trim() || !username.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền tên, tên đăng nhập và mật khẩu');
      return false;
    }
    if (username.trim().length < 3) {
      Alert.alert('Không hợp lệ', 'Tên đăng nhập tối thiểu 3 ký tự');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu tối thiểu 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Không khớp', 'Mật khẩu xác nhận không khớp');
      return false;
    }
    return true;
  }

  function goToHousehold() {
    if (validateAccount()) setStep('household');
  }

  async function handleRegister() {
    if (!validateAccount()) return;
    if (hhMode === 'create' && !householdName.trim()) {
      Alert.alert('Thiếu tên', 'Vui lòng nhập tên gia đình');
      return;
    }
    if (hhMode === 'join' && !inviteCode.trim()) {
      Alert.alert('Thiếu mã', 'Vui lòng nhập mã mời');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string> = {
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        password,
      };
      if (email.trim()) body.email = email.trim();
      if (hhMode === 'create') body.householdName = householdName.trim();
      else body.inviteCode = inviteCode.trim().toUpperCase();

      const res = await api.post('/auth/register', body);
      await storage.setToken(res.data.token);
      await storage.setUser(res.data.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Đăng ký thất bại', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">

          <TouchableOpacity style={styles.backBtn} onPress={() => step === 'household' ? setStep('account') : router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.backTxt}>{step === 'household' ? 'Quay lại' : 'Đăng nhập'}</Text>
          </TouchableOpacity>

          {/* Step indicator */}
          <View style={styles.steps}>
            {(['account', 'household'] as Step[]).map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, step === s && styles.stepDotActive, i < ['account', 'household'].indexOf(step) && styles.stepDotDone]}>
                  <Text style={styles.stepDotTxt}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, step === s && { color: '#fff' }]}>
                  {s === 'account' ? 'Tài khoản' : 'Gia đình'}
                </Text>
              </View>
            ))}
          </View>

          {step === 'account' ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>THÔNG TIN CÁ NHÂN</Text>

              <View style={styles.inputGroup}>
                <Ionicons name="happy-outline" size={18} color="#9ca3af" style={styles.icon} />
                <TextInput style={styles.input} placeholder="Tên hiển thị" placeholderTextColor="#9ca3af"
                  value={displayName} onChangeText={setDisplayName} returnKeyType="next"
                  onSubmitEditing={() => usernameRef.current?.focus()} />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.icon} />
                <TextInput ref={usernameRef} style={styles.input} placeholder="Tên đăng nhập (không dấu)"
                  placeholderTextColor="#9ca3af" value={username}
                  onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
                  autoCapitalize="none" autoCorrect={false} returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()} />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={18} color="#9ca3af" style={styles.icon} />
                <TextInput ref={emailRef} style={styles.input} placeholder="Email (không bắt buộc)"
                  placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail}
                  autoCapitalize="none" keyboardType="email-address" returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()} />
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>BẢO MẬT</Text>

              <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.icon} />
                <TextInput ref={passRef} style={[styles.input, { flex: 1 }]} placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword}
                  secureTextEntry={!showPass} returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()} />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#9ca3af" style={styles.icon} />
                <TextInput ref={confirmRef} style={styles.input} placeholder="Xác nhận mật khẩu"
                  placeholderTextColor="#9ca3af" value={confirmPassword} onChangeText={setConfirmPassword}
                  secureTextEntry={!showPass} returnKeyType="done" onSubmitEditing={goToHousehold} />
              </View>

              <TouchableOpacity style={styles.registerBtn} onPress={goToHousehold}>
                <Text style={styles.registerBtnTxt}>Tiếp tục →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
                <Text style={styles.loginLinkTxt}>Đã có tài khoản? <Text style={{ color: '#16a34a', fontWeight: '700' }}>Đăng nhập</Text></Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gia đình của bạn 🏠</Text>
              <Text style={styles.cardSub}>Chia sẻ chi tiêu với người thân</Text>

              {/* Tabs */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, hhMode === 'create' && styles.tabActive]}
                  onPress={() => setHhMode('create')}
                >
                  <Text style={[styles.tabTxt, hhMode === 'create' && styles.tabTxtActive]}>Tạo gia đình mới</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, hhMode === 'join' && styles.tabActive]}
                  onPress={() => setHhMode('join')}
                >
                  <Text style={[styles.tabTxt, hhMode === 'join' && styles.tabTxtActive]}>Tham gia bằng mã</Text>
                </TouchableOpacity>
              </View>

              {hhMode === 'create' ? (
                <>
                  <Text style={styles.helpText}>Bạn sẽ nhận được mã mời để chia sẻ với người thân</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons name="home-outline" size={18} color="#9ca3af" style={styles.icon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Tên gia đình (vd: Nhà mình)"
                      placeholderTextColor="#9ca3af"
                      value={householdName}
                      onChangeText={setHouseholdName}
                      autoCorrect={false}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                      editable
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.helpText}>Nhập mã 6 ký tự do người thân chia sẻ</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons name="key-outline" size={18} color="#9ca3af" style={styles.icon} />
                    <TextInput style={[styles.input, { letterSpacing: 4, fontWeight: '700' }]}
                      placeholder="ABC123" placeholderTextColor="#9ca3af"
                      value={inviteCode} onChangeText={(t) => setInviteCode(t.toUpperCase())}
                      autoCapitalize="characters" maxLength={6} returnKeyType="done"
                      onSubmitEditing={handleRegister} />
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.registerBtn, loading && { opacity: 0.75 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnTxt}>Hoàn tất đăng ký</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#16a34a' },
  container: { flexGrow: 1, padding: 24, paddingTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 24 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#fff' },
  stepDotDone: { backgroundColor: '#bbf7d0' },
  stepDotTxt: { fontSize: 13, fontWeight: '800', color: '#16a34a' },
  stepLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1, marginBottom: 10 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    backgroundColor: '#f9fafb', paddingHorizontal: 14, marginBottom: 10,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 13 },
  eyeBtn: { padding: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#16a34a' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTxtActive: { color: '#fff' },
  helpText: { fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 18 },
  registerBtn: {
    backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 12, elevation: 3,
    shadowColor: '#16a34a', shadowOpacity: 0.35, shadowRadius: 8,
  },
  registerBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  loginLink: { alignItems: 'center', paddingVertical: 14 },
  loginLinkTxt: { fontSize: 15, color: '#6b7280' },
});
