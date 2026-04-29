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

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const newRef = useRef<TextInputType>(null);
  const confirmRef = useRef<TextInputType>(null);

  async function handleChange() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Không khớp', 'Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      Alert.alert('Thành công', 'Mật khẩu đã được đổi', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={32} color="#16a34a" />
            </View>
            <Text style={styles.desc}>Mật khẩu mới phải tối thiểu 6 ký tự</Text>

            <Text style={styles.label}>Mật khẩu hiện tại</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.icon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor="#9ca3af"
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOld}
                returnKeyType="next"
                onSubmitEditing={() => newRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowOld(!showOld)} style={styles.eyeBtn}>
                <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Mật khẩu mới</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="key-outline" size={18} color="#9ca3af" style={styles.icon} />
              <TextInput
                ref={newRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="#9ca3af"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#9ca3af" style={styles.icon} />
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNew}
                returnKeyType="done"
                onSubmitEditing={handleChange}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.75 }]}
              onPress={handleChange}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnTxt}>Lưu mật khẩu mới</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  container: { flexGrow: 1, padding: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12,
  },
  desc: { textAlign: 'center', color: '#9ca3af', fontSize: 13, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 8 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    backgroundColor: '#f9fafb', paddingHorizontal: 14,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 13 },
  eyeBtn: { padding: 4 },
  saveBtn: {
    backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 20, elevation: 3,
    shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 8,
  },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
