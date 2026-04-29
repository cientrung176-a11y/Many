import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Clipboard } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { storage, UserInfo } from '../../lib/storage';
import api from '../../lib/api';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function SettingRow({
  icon, iconBg, label, sublabel, onPress, danger, chevron = true,
}: {
  icon: IoniconsName; iconBg: string; label: string;
  sublabel?: string; onPress: () => void; danger?: boolean; chevron?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={[styles.rowLabel, danger && { color: '#ef4444' }]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
      </View>
      {chevron && <Ionicons name="chevron-forward" size={16} color="#d1d5db" />}
    </TouchableOpacity>
  );
}

type HouseholdInfo = { id: string; name: string; inviteCode: string };

export default function SettingsScreen() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [members, setMembers] = useState<{ id: string; displayName: string }[]>([]);
  const [joiningCode, setJoiningCode] = useState('');

  useEffect(() => {
    storage.getUser().then(setUser);
    api.get('/household/me')
      .then((r) => {
        setHousehold(r.data.household);
        setMembers(r.data.members ?? []);
      })
      .catch(() => {});
  }, []);

  async function handleJoinHousehold() {
    Alert.prompt('Tham gia gia đình', 'Nhập mã mời 6 ký tự', async (code) => {
      if (!code?.trim()) return;
      try {
        const res = await api.post('/household/join', { inviteCode: code.trim().toUpperCase() });
        if (user) {
          const updated = { ...user, householdId: res.data.householdId, householdName: res.data.householdName, inviteCode: res.data.inviteCode };
          await storage.setUser(updated);
          setUser(updated);
        }
        setHousehold({ id: res.data.householdId, name: res.data.householdName, inviteCode: res.data.inviteCode });
        Alert.alert('Thành công', res.data.message);
      } catch (e: any) { Alert.alert('Lỗi', e.message); }
    }, 'plain-text', '', 'default');
  }

  async function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive',
        onPress: async () => {
          await storage.clear();
          router.replace('/login');
        },
      },
    ]);
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={styles.displayName}>{user?.displayName ?? '...'}</Text>
            <Text style={styles.username}>@{user?.username ?? '...'}</Text>
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>
        </View>

        {/* Household */}
        <Text style={styles.sectionTitle}>GIA ĐÌNH</Text>
        {household ? (
          <View style={[styles.card, { padding: 16, marginBottom: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>🏠</Text>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{household.name}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>{members.length} thành viên</Text>
              </View>
            </View>
            <View style={styles.inviteRow}>
              <View>
                <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 }}>MÃ MỜI</Text>
                <Text style={styles.inviteCode}>{household.inviteCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => { Clipboard.setString(household.inviteCode); Alert.alert('Đã copy!', `Mã: ${household.inviteCode}`); }}
              >
                <Ionicons name="copy-outline" size={16} color="#16a34a" />
                <Text style={styles.copyBtnTxt}>Sao chép</Text>
              </TouchableOpacity>
            </View>
            {members.length > 0 && (
              <View style={{ marginTop: 12, gap: 6 }}>
                {members.map((m) => (
                  <Text key={m.id} style={{ fontSize: 13, color: '#374151' }}>👤 {m.displayName}</Text>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.card, { marginBottom: 20 }]}>
            <SettingRow
              icon="home-outline"
              iconBg="#f59e0b"
              label="Tham gia gia đình"
              sublabel="Nhập mã mời để chia sẻ chi tiêu"
              onPress={handleJoinHousehold}
            />
          </View>
        )}

        {/* Bảo mật */}
        <Text style={styles.sectionTitle}>BẢO MẬT</Text>
        <View style={styles.card}>
          <SettingRow
            icon="key-outline"
            iconBg="#8b5cf6"
            label="Đổi mật khẩu"
            sublabel="Cập nhật mật khẩu định kỳ"
            onPress={() => router.push('/change-password')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="refresh-outline"
            iconBg="#06b6d4"
            label="Chi tiêu định kỳ"
            sublabel="Tự động hóa các khoản cố định"
            onPress={() => router.push('/recurring' as any)}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="log-out-outline"
            iconBg="#ef4444"
            label="Đăng xuất"
            onPress={handleLogout}
            danger
            chevron={false}
          />
        </View>

        {/* Cài đặt ứng dụng */}
        <Text style={styles.sectionTitle}>ỨNG DỤNG</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            iconBg="#f59e0b"
            label="Thông báo"
            sublabel="Sắp có"
            onPress={() => Alert.alert('Sắp ra mắt', 'Tính năng đang được phát triển')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="moon-outline"
            iconBg="#374151"
            label="Chế độ tối"
            sublabel="Sắp có"
            onPress={() => Alert.alert('Sắp ra mắt', 'Tính năng đang được phát triển')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="language-outline"
            iconBg="#3b82f6"
            label="Ngôn ngữ"
            sublabel="Tiếng Việt"
            onPress={() => Alert.alert('Sắp ra mắt', 'Tính năng đang được phát triển')}
          />
        </View>

        {/* Thông tin */}
        <Text style={styles.sectionTitle}>THÔNG TIN</Text>
        <View style={styles.card}>
          <SettingRow
            icon="star-outline"
            iconBg="#f97316"
            label="Đánh giá ứng dụng"
            onPress={() => Alert.alert('Cảm ơn!', 'Phản hồi của bạn giúp chúng tôi cải thiện')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="shield-checkmark-outline"
            iconBg="#10b981"
            label="Chính sách bảo mật"
            onPress={() => Alert.alert('Chính sách bảo mật', 'Dữ liệu của bạn được mã hóa và bảo mật tuyệt đối')}
          />
        </View>

        <Text style={styles.version}>SpendWise v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  scroll: { padding: 20, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  displayName: { fontSize: 19, fontWeight: '800', color: '#111827' },
  username: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  email: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#9ca3af',
    letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 68 },
  version: { textAlign: 'center', color: '#d1d5db', fontSize: 12, marginTop: 8 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  inviteCode: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: 4, fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  copyBtnTxt: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
});
