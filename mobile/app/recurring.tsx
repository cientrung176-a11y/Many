import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, ScrollView, Keyboard,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { useExpenseContext } from '../lib/ExpenseContext';

type Category = { id: string; name: string; icon: string; color: string };
type RecurringItem = {
  id: string; amount: number; note?: string; frequency: string;
  nextDate: string; active: boolean; category?: Category;
};

const FREQ_LABELS: Record<string, string> = { daily: 'Hàng ngày', weekly: 'Hàng tuần', monthly: 'Hàng tháng' };
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫'; }

function formatAmount(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
}

function parseRaw(s: string) { return Number(s.replace(/\D/g, '')); }

export default function RecurringScreen() {
  const { refresh } = useExpenseContext();
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  async function load() {
    try {
      const res = await api.get('/recurring');
      setItems(res.data);
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api.post('/recurring/process').then(() => { refresh(); }).catch(() => {});
  }, []);

  async function handleToggle(id: string) {
    try {
      const res = await api.patch(`/recurring/${id}/toggle`);
      setItems((prev) => prev.map((i) => (i.id === id ? res.data : i)));
    } catch { Alert.alert('Lỗi', 'Không thể thay đổi trạng thái'); }
  }

  async function handleDelete(id: string) {
    Alert.alert('Xóa', 'Xóa chi tiêu định kỳ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/recurring/${id}`);
            setItems((prev) => prev.filter((i) => i.id !== id));
          } catch { Alert.alert('Lỗi', 'Xóa thất bại'); }
        },
      },
    ]);
  }

  async function handleSave() {
    const raw = parseRaw(amount);
    if (!raw || raw <= 0) { Alert.alert('Lỗi', 'Nhập số tiền hợp lệ'); return; }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        amount: raw, note: note.trim() || undefined,
        categoryId: selectedCat?.id, frequency,
      };
      if (frequency === 'monthly') body.dayOfMonth = Number(dayOfMonth) || 1;
      if (frequency === 'weekly') body.dayOfWeek = dayOfWeek;
      const res = await api.post('/recurring', body);
      setItems((prev) => [res.data, ...prev]);
      setShowAdd(false);
      setAmount(''); setNote(''); setSelectedCat(null); setFrequency('monthly');
    } catch (e: any) { Alert.alert('Lỗi', e.message); }
    setSaving(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Chi tiêu định kỳ</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ flex: 1 }} size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔄</Text>
              <Text style={styles.emptyTxt}>Chưa có chi tiêu định kỳ</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAdd(true)}>
                <Text style={styles.emptyBtnTxt}>+ Thêm mới</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, !item.active && styles.cardInactive]}>
              <View style={[styles.iconBox, { backgroundColor: item.category?.color ?? '#6b7280' }]}>
                <Text style={{ fontSize: 22 }}>{item.category?.icon ?? '🔄'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardAmount}>{fmt(item.amount)}</Text>
                <Text style={styles.cardMeta}>
                  {FREQ_LABELS[item.frequency]} · Tiếp theo: {new Date(item.nextDate).toLocaleDateString('vi-VN')}
                </Text>
                {item.note ? <Text style={styles.cardNote} numberOfLines={1}>{item.note}</Text> : null}
              </View>
              <View style={{ gap: 8, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleToggle(item.id)}>
                  <View style={[styles.toggle, item.active && styles.toggleOn]}>
                    <View style={[styles.toggleThumb, item.active && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add modal — single Modal, category picker is inline */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => { setShowCatModal(false); setShowAdd(false); }}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {showCatModal ? (
              /* ── Inline category picker ── */
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setShowCatModal(false)} style={{ marginRight: 12 }}>
                    <Ionicons name="arrow-back" size={20} color="#111827" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Chọn danh mục</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 20 }}>
                    {categories.length === 0 ? (
                      <Text style={{ color: '#9ca3af', marginTop: 20 }}>Đang tải danh mục...</Text>
                    ) : (
                      categories.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.catItem, selectedCat?.id === c.id && { borderColor: c.color, backgroundColor: c.color + '20' }]}
                          onPress={() => { setSelectedCat(c); setShowCatModal(false); }}
                        >
                          <Text style={{ fontSize: 26 }}>{c.icon}</Text>
                          <Text style={{ fontSize: 11, marginTop: 4, color: '#374151', textAlign: 'center' }} numberOfLines={1}>{c.name}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </ScrollView>
              </>
            ) : (
              /* ── Add form ── */
              <>
                <Text style={styles.modalTitle}>Thêm định kỳ</Text>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">

                  <TextInput
                    style={styles.input}
                    placeholder="Số tiền"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={(v) => setAmount(formatAmount(v))}
                    placeholderTextColor="#9ca3af"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Ghi chú (tùy chọn)"
                    value={note}
                    onChangeText={setNote}
                    autoCorrect={false}
                    placeholderTextColor="#9ca3af"
                  />

                  {/* Category — inline toggle */}
                  <TouchableOpacity style={styles.catPicker} onPress={() => setShowCatModal(true)}>
                    <Text style={{ fontSize: 18 }}>{selectedCat?.icon ?? '🏷️'}</Text>
                    <Text style={{ flex: 1, color: selectedCat ? '#111827' : '#9ca3af', marginLeft: 8 }}>
                      {selectedCat?.name ?? 'Chọn danh mục'}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </TouchableOpacity>

                  {/* Frequency */}
                  <Text style={styles.label}>Tần suất</Text>
                  <View style={styles.freqRow}>
                    {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
                        onPress={() => setFrequency(f)}
                      >
                        <Text style={[styles.freqTxt, frequency === f && styles.freqTxtActive]}>
                          {FREQ_LABELS[f]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {frequency === 'monthly' && (
                    <>
                      <Text style={styles.label}>Ngày trong tháng (1-28)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={dayOfMonth}
                        onChangeText={setDayOfMonth}
                        maxLength={2}
                        placeholderTextColor="#9ca3af"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </>
                  )}

                  {frequency === 'weekly' && (
                    <>
                      <Text style={styles.label}>Ngày trong tuần</Text>
                      <View style={styles.freqRow}>
                        {WEEKDAYS.map((d, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[styles.dayBtn, dayOfWeek === i && styles.freqBtnActive]}
                            onPress={() => setDayOfWeek(i)}
                          >
                            <Text style={[styles.freqTxt, dayOfWeek === i && styles.freqTxtActive]}>{d}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Lưu</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                    <Text style={styles.cancelBtnTxt}>Hủy</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111827' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, elevation: 2 },
  cardInactive: { opacity: 0.5 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardNote: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: '#d1d5db', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: '#16a34a' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTxt: { fontSize: 16, color: '#9ca3af', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#16a34a', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', marginBottom: 10 },
  catPicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  freqBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', minWidth: 80 },
  freqBtnActive: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  freqTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  freqTxtActive: { color: '#16a34a' },
  dayBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  saveBtn: { backgroundColor: '#16a34a', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { alignItems: 'center', padding: 14, marginTop: 8 },
  cancelBtnTxt: { color: '#ef4444', fontWeight: '700' },
  catItem: { width: 76, alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb' },
});
