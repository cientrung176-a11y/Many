import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, Modal, Dimensions, FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { getImageUrl } from '../../lib/config';
import { useExpenseContext } from '../../lib/ExpenseContext';
import { showSnackbar } from '../../lib/Snackbar';

const { width: SW, height: SH } = Dimensions.get('window');

type Expense = {
  id: string; amount: number; note?: string;
  category?: { name: string; icon: string; color: string };
  user: { id: string; displayName: string; username: string };
  createdAt: string; updatedAt: string;
  images: string[];
};

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫'; }

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useExpenseContext();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/expenses/${id}`)
      .then((r) => setExpense(r.data))
      .catch(() => Alert.alert('Lỗi', 'Không thể tải chi tiêu', [
        { text: 'Quay lại', onPress: () => router.back() },
      ]))
      .finally(() => setLoading(false));
  }, [id]);

  function handleDelete() {
    router.back();
    let undone = false;
    showSnackbar('Đã xóa chi tiêu', {
      action: 'Hoàn tác',
      onAction: () => { undone = true; },
    });
    setTimeout(async () => {
      if (undone) return;
      try {
        await api.delete(`/expenses/${id}`);
        refresh();
      } catch {
        showSnackbar('Xóa thất bại — thử lại');
      }
    }, 4800);
  }

  function handleEdit() {
    router.push(`/add-expense?id=${id}` as any);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#16a34a" size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!expense) return null;

  const imageUrls = (expense.images ?? []).map(getImageUrl).filter(Boolean) as string[];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Amount hero */}
        <View style={[styles.amountCard, { backgroundColor: expense.category?.color ?? '#16a34a' }]}>
          <Text style={styles.catEmoji}>{expense.category?.icon ?? '💰'}</Text>
          <Text style={styles.amountText}>{fmt(expense.amount)}</Text>
          <Text style={styles.catName}>{expense.category?.name ?? 'Chi tiêu'}</Text>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <InfoRow icon="person-outline" label="Người chi" value={expense.user.displayName} />
          <View style={styles.divider} />
          <InfoRow icon="calendar-outline" label="Thời gian" value={formatDate(expense.createdAt)} />
          {expense.note ? (
            <>
              <View style={styles.divider} />
              <InfoRow icon="create-outline" label="Ghi chú" value={expense.note} multiline />
            </>
          ) : null}
        </View>

        {/* Images */}
        {imageUrls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>ẢNH ĐÍNH KÈM ({imageUrls.length})</Text>
            <FlatList
              horizontal
              data={imageUrls}
              keyExtractor={(u) => u}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              renderItem={({ item: uri }) => (
                <TouchableOpacity onPress={() => setLightboxImg(uri)} activeOpacity={0.85}>
                  <Image source={{ uri }} style={styles.imgThumb} />
                  <View style={styles.zoomHint}>
                    <Ionicons name="expand-outline" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Ionicons name="pencil-outline" size={20} color="#fff" />
          <Text style={styles.editBtnTxt}>Chỉnh sửa chi tiêu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteFullBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={styles.deleteFullBtnTxt}>Xóa chi tiêu</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={Boolean(lightboxImg)} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxImg(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {lightboxImg && (
            <Image
              source={{ uri: lightboxImg }}
              style={{ width: SW, height: SH * 0.75 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  icon, label, value, multiline,
}: {
  icon: string; label: string; value: string; multiline?: boolean;
}) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBox}>
        <Ionicons name={icon as any} size={18} color="#16a34a" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value} numberOfLines={multiline ? undefined : 2}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 3 },
  value: { fontSize: 15, color: '#111827', fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  amountCard: { borderRadius: 28, padding: 32, alignItems: 'center', marginBottom: 16, elevation: 6, shadowOpacity: 0.2, shadowRadius: 12 },
  catEmoji: { fontSize: 44, marginBottom: 8 },
  amountText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  catName: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2, shadowOpacity: 0.05, shadowRadius: 8 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 12 },
  imgThumb: { width: 140, height: 140, borderRadius: 16, resizeMode: 'cover' },
  zoomHint: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: 4 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16a34a', borderRadius: 18, padding: 18, marginBottom: 10,
    elevation: 4, shadowColor: '#16a34a', shadowOpacity: 0.35, shadowRadius: 8,
  },
  editBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  deleteFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 18, padding: 18,
  },
  deleteFullBtnTxt: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
});
