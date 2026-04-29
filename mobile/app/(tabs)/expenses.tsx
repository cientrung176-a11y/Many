import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { useExpenseContext } from '../../lib/ExpenseContext';

type Expense = {
  id: string; amount: number; note?: string;
  category?: { name: string; icon: string; color: string };
  user: { displayName: string; username: string };
  createdAt: string;
  images: string[];
};

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫'; }

const AVATAR_COLORS = ['#16a34a','#2563eb','#9333ea','#dc2626','#ea580c','#0891b2','#65a30d'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(); }

export default function ExpensesScreen() {
  const { version } = useExpenseContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchExpenses(q?: string) {
    try {
      const params: Record<string, string> = {};
      if (q?.trim()) params.search = q.trim();
      const res = await api.get('/expenses', { params });
      const data: Expense[] = res.data;
      setExpenses(data);
      setTotal(data.reduce((s, e) => s + e.amount, 0));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); fetchExpenses(search); }, []));

  useEffect(() => { fetchExpenses(search); }, [version]);

  function handleSearch(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchExpenses(text), 400);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chi tiêu</Text>
          {!loading && (
            <Text style={styles.subtitle}>{expenses.length} khoản · Tổng: {fmt(total)}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-expense')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addTxt}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm ghi chú, danh mục..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ flex: 1, marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchExpenses(); }}
              tintColor="#16a34a"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>💸</Text>
              <Text style={styles.emptyTxt}>Chưa có chi tiêu nào</Text>
              <Text style={styles.emptySub}>Nhấn + để thêm khoản đầu tiên</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-expense')}>
                <Text style={styles.emptyBtnTxt}>+ Thêm chi tiêu</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: e }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/expense/${e.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBox, { backgroundColor: e.category?.color ?? '#6b7280' }]}>
                <Text style={{ fontSize: 22 }}>{e.category?.icon ?? '💰'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.note} numberOfLines={1}>
                  {e.note || e.category?.name || 'Chi tiêu'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={[styles.avatar, { backgroundColor: avatarColor(e.user.displayName) }]}>
                    <Text style={styles.avatarTxt}>{initials(e.user.displayName)}</Text>
                  </View>
                  <Text style={styles.meta}>{e.user.displayName}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.meta}>{new Date(e.createdAt).toLocaleDateString('vi-VN')}</Text>
                  {e.images?.length > 0 && <Ionicons name="image-outline" size={13} color="#9ca3af" />}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amount}>-{fmt(e.amount)}</Text>
                <Ionicons name="chevron-forward" size={14} color="#d1d5db" style={{ marginTop: 2 }} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a34a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, gap: 4, elevation: 3 },
  addTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, elevation: 2, shadowOpacity: 0.05, shadowRadius: 6 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 15, fontWeight: '700', color: '#111827' },
  avatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  meta: { fontSize: 12, color: '#9ca3af' },
  metaDot: { fontSize: 12, color: '#d1d5db' },
  amount: { fontSize: 16, fontWeight: '900', color: '#ef4444' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTxt: { fontSize: 17, color: '#374151', fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#16a34a', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16,
    marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10,
    elevation: 1, borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
});
