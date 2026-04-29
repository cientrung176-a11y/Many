import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { storage, UserInfo } from '../../lib/storage';

type Expense = {
  id: string; amount: number; note?: string;
  category?: { name: string; icon: string; color: string };
  user: { displayName: string };
  createdAt: string;
};

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng ☀️';
  if (h < 18) return 'Chào buổi chiều 🌤️';
  return 'Chào buổi tối 🌙';
}

export default function DashboardScreen() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    const u = await storage.getUser();
    setUser(u);
    try {
      const now = new Date();
      const [expRes, statsRes] = await Promise.all([
        api.get('/expenses', { params: { limit: 20 } }),
        api.get('/stats/month', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
      ]);
      const all: Expense[] = expRes.data;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayExp = all.filter((e) => new Date(e.createdAt) >= todayStart);
      setTodayTotal(todayExp.reduce((s, e) => s + e.amount, 0));
      setMonthTotal(statsRes.data.total);
      setRecent(all.slice(0, 6));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchData();
  }, []));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#16a34a"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>{greeting()}</Text>
            <Text style={styles.name}>{user?.displayName ?? '...'}</Text>
          </View>
          <TouchableOpacity style={styles.addFab} onPress={() => router.push('/add-expense')}>
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.cardRow}>
          <View style={[styles.card, { backgroundColor: '#16a34a' }]}>
            <Text style={styles.cardLabel}>Hôm nay</Text>
            {loading
              ? <ActivityIndicator color="#fff" style={{ marginTop: 6 }} />
              : <Text style={styles.cardAmount}>{fmt(todayTotal)}</Text>
            }
            <Text style={styles.cardSub}>📅 {new Date().toLocaleDateString('vi-VN')}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: '#2563eb' }]}>
            <Text style={styles.cardLabel}>Tháng này</Text>
            {loading
              ? <ActivityIndicator color="#fff" style={{ marginTop: 6 }} />
              : <Text style={styles.cardAmount}>{fmt(monthTotal)}</Text>
            }
            <Text style={styles.cardSub}>
              📆 Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
            </Text>
          </View>
        </View>

        {/* Recent */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gần đây</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#16a34a" style={{ marginVertical: 24 }} />
          ) : recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyText}>Chưa có chi tiêu nào!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-expense')}>
                <Text style={styles.emptyBtnTxt}>+ Thêm chi tiêu đầu tiên</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recent.map((e, i) => (
              <View
                key={e.id}
                style={[styles.item, i === recent.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={[styles.iconBox, { backgroundColor: e.category?.color ?? '#6b7280' }]}>
                  <Text style={{ fontSize: 20 }}>{e.category?.icon ?? '💰'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemNote} numberOfLines={1}>
                    {e.note || e.category?.name || 'Chi tiêu'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {e.user.displayName} · {new Date(e.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <Text style={styles.itemAmount}>-{fmt(e.amount)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  greet: { fontSize: 13, color: '#6b7280' },
  name: { fontSize: 24, fontWeight: '900', color: '#111827', marginTop: 2 },
  addFab: { backgroundColor: '#16a34a', borderRadius: 18, width: 52, height: 52, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#16a34a', shadowOpacity: 0.4, shadowRadius: 8 },
  cardRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  card: { flex: 1, borderRadius: 22, padding: 20, elevation: 4, shadowOpacity: 0.15, shadowRadius: 8 },
  cardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  cardAmount: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 6 },
  cardSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 22, padding: 16, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  seeAll: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#9ca3af', fontSize: 15, marginBottom: 12 },
  emptyBtn: { backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  emptyBtnTxt: { color: '#16a34a', fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemNote: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  itemAmount: { fontSize: 15, fontWeight: '800', color: '#ef4444' },
});
