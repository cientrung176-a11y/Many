import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { useExpenseContext } from '../../lib/ExpenseContext';
import { saveToWidget, currentMonthName } from '../../modules/widget';

type Expense = {
  id: string; amount: number; note?: string;
  category?: { id: string; name: string; icon: string; color: string };
  user: { displayName: string; username: string };
  createdAt: string;
  images: string[];
};
type Category = { id: string; name: string; icon: string; color: string };
type Filters = {
  categoryId: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
};
const EMPTY_FILTERS: Filters = { categoryId: '', minAmount: '', maxAmount: '', startDate: '', endDate: '' };
const DATE_PRESETS = [
  { label: 'Tháng này', get: () => { const n = new Date(); return { startDate: `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, endDate: '' }; } },
  { label: '30 ngày', get: () => { const n = new Date(); const s = new Date(n); s.setDate(s.getDate()-29); return { startDate: s.toISOString().slice(0,10), endDate: '' }; } },
  { label: 'Tuần này', get: () => { const n = new Date(); const s = new Date(n); s.setDate(s.getDate()-s.getDay()); return { startDate: s.toISOString().slice(0,10), endDate: '' }; } },
];

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫'; }

const AVATAR_COLORS = ['#16a34a','#2563eb','#9333ea','#dc2626','#ea580c','#0891b2','#65a30d'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(); }
function isFiltered(f: Filters) { return Object.values(f).some(Boolean); }

export default function ExpensesScreen() {
  const { version } = useExpenseContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  async function fetchExpenses(q?: string, f?: Filters) {
    try {
      const activeFilters = f ?? filters;
      const params: Record<string, string> = {};
      if (q?.trim()) params.search = q.trim();
      if (activeFilters.categoryId) params.categoryId = activeFilters.categoryId;
      if (activeFilters.minAmount) params.minAmount = activeFilters.minAmount;
      if (activeFilters.maxAmount) params.maxAmount = activeFilters.maxAmount;
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      const res = await api.get('/expenses', { params });
      const data: Expense[] = res.data;
      setExpenses(data);
      const monthTotal = data.reduce((s, e) => s + e.amount, 0);
      setTotal(monthTotal);
      saveToWidget({
        totalThisMonth: monthTotal,
        countThisMonth: data.length,
        monthName: currentMonthName(),
      });
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); fetchExpenses(search, filters); }, []));

  useEffect(() => { fetchExpenses(search, filters); }, [version]);

  function handleSearch(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchExpenses(text), 400);
  }

  function applyFilters() {
    setFilters(draftFilters);
    setShowFilter(false);
    setLoading(true);
    fetchExpenses(search, draftFilters);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setShowFilter(false);
    setLoading(true);
    fetchExpenses(search, EMPTY_FILTERS);
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

      {/* Search + Filter bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8 }}>
        <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}>
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
        <TouchableOpacity
          style={[styles.filterBtn, isFiltered(filters) && styles.filterBtnActive]}
          onPress={() => { setDraftFilters(filters); setShowFilter(true); }}
        >
          <Ionicons name="options-outline" size={20} color={isFiltered(filters) ? '#fff' : '#16a34a'} />
          {isFiltered(filters) && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {isFiltered(filters) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 6 }} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
          {filters.categoryId && (
            <View style={styles.chip}>
              <Text style={styles.chipTxt}>{categories.find(c => c.id === filters.categoryId)?.icon} {categories.find(c => c.id === filters.categoryId)?.name}</Text>
              <TouchableOpacity onPress={() => { const f={...filters,categoryId:''}; setFilters(f); setDraftFilters(f); fetchExpenses(search,f); }}>
                <Ionicons name="close" size={12} color="#16a34a" />
              </TouchableOpacity>
            </View>
          )}
          {(filters.minAmount || filters.maxAmount) && (
            <View style={styles.chip}>
              <Text style={styles.chipTxt}>{filters.minAmount ? fmt(+filters.minAmount) : '0'} – {filters.maxAmount ? fmt(+filters.maxAmount) : '∞'}</Text>
              <TouchableOpacity onPress={() => { const f={...filters,minAmount:'',maxAmount:''}; setFilters(f); setDraftFilters(f); fetchExpenses(search,f); }}>
                <Ionicons name="close" size={12} color="#16a34a" />
              </TouchableOpacity>
            </View>
          )}
          {(filters.startDate || filters.endDate) && (
            <View style={styles.chip}>
              <Text style={styles.chipTxt}>{filters.startDate || '...'} → {filters.endDate || 'nay'}</Text>
              <TouchableOpacity onPress={() => { const f={...filters,startDate:'',endDate:''}; setFilters(f); setDraftFilters(f); fetchExpenses(search,f); }}>
                <Ionicons name="close" size={12} color="#16a34a" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={[styles.chip, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]} onPress={clearFilters}>
            <Text style={[styles.chipTxt, { color: '#ef4444' }]}>Xóa tất cả</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

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
      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Bộ lọc</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Category */}
              <Text style={styles.filterLabel}>Danh mục</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, draftFilters.categoryId === c.id && { backgroundColor: c.color + '20', borderColor: c.color }]}
                    onPress={() => setDraftFilters(f => ({ ...f, categoryId: f.categoryId === c.id ? '' : c.id }))}
                  >
                    <Text>{c.icon} {c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={styles.filterLabel}>Khoảng tiền (₫)</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TextInput
                  style={[styles.filterInput, { flex: 1 }]}
                  placeholder="Tối thiểu"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={draftFilters.minAmount}
                  onChangeText={(v) => setDraftFilters(f => ({ ...f, minAmount: v.replace(/\D/g,'') }))}
                  returnKeyType="done"
                />
                <Text style={{ alignSelf: 'center', color: '#9ca3af' }}>–</Text>
                <TextInput
                  style={[styles.filterInput, { flex: 1 }]}
                  placeholder="Tối đa"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={draftFilters.maxAmount}
                  onChangeText={(v) => setDraftFilters(f => ({ ...f, maxAmount: v.replace(/\D/g,'') }))}
                  returnKeyType="done"
                />
              </View>

              {/* Date presets */}
              <Text style={styles.filterLabel}>Khoảng ngày</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {DATE_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.label}
                    style={[styles.presetBtn, draftFilters.startDate === p.get().startDate && { backgroundColor: '#16a34a' }]}
                    onPress={() => { const { startDate, endDate } = p.get(); setDraftFilters(f => ({ ...f, startDate, endDate })); }}
                  >
                    <Text style={[styles.presetTxt, draftFilters.startDate === p.get().startDate && { color: '#fff' }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TextInput
                  style={[styles.filterInput, { flex: 1 }]}
                  placeholder="Từ (yyyy-mm-dd)"
                  placeholderTextColor="#9ca3af"
                  value={draftFilters.startDate}
                  onChangeText={(v) => setDraftFilters(f => ({ ...f, startDate: v }))}
                  returnKeyType="done"
                />
                <TextInput
                  style={[styles.filterInput, { flex: 1 }]}
                  placeholder="Đến (yyyy-mm-dd)"
                  placeholderTextColor="#9ca3af"
                  value={draftFilters.endDate}
                  onChangeText={(v) => setDraftFilters(f => ({ ...f, endDate: v }))}
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnTxt}>Áp dụng bộ lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnTxt}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  filterBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#fbbf24' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#bbf7d0' },
  chipTxt: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '88%' },
  filterLabel: { fontSize: 12, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 10 },
  filterInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', gap: 4 },
  presetBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  presetTxt: { fontSize: 12, fontWeight: '700', color: '#374151' },
  applyBtn: { backgroundColor: '#16a34a', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  applyBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  clearBtn: { alignItems: 'center', padding: 12 },
  clearBtnTxt: { color: '#ef4444', fontWeight: '700' },
});
