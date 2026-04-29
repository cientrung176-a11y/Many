import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image, Modal,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../lib/api';
import { getImageUrl } from '../lib/config';
import { useExpenseContext } from '../lib/ExpenseContext';

type Category = { id: string; name: string; icon: string; color: string };

function formatAmount(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

function parseRawAmount(formatted: string): number {
  return Number(formatted.replace(/\./g, '').replace(/,/g, ''));
}

export default function AddExpenseScreen() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(editId);
  const { refresh } = useExpenseContext();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [keepImages, setKeepImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEdit);
  const [showCatModal, setShowCatModal] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    if (isEdit && editId) {
      api.get(`/expenses/${editId}`)
        .then((r) => {
          const e = r.data;
          setAmount(formatAmount(String(Math.round(e.amount))));
          setNote(e.note ?? '');
          setKeepImages(Array.isArray(e.images) ? e.images : []);
          if (e.category) setSelectedCat(e.category);
        })
        .catch(() => Alert.alert('Lỗi', 'Không thể tải thông tin chi tiêu'))
        .finally(() => setInitLoading(false));
    }
  }, []);

  async function pickFromGallery() {
    if (images.length + keepImages.length >= 5) {
      Alert.alert('Giới hạn', 'Tối đa 5 ảnh mỗi chi tiêu'); return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75, allowsMultipleSelection: false,
    });
    if (!r.canceled) setImages((prev) => [...prev, r.assets[0].uri]);
  }

  async function takePhoto() {
    if (images.length + keepImages.length >= 5) {
      Alert.alert('Giới hạn', 'Tối đa 5 ảnh mỗi chi tiêu'); return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền trong Cài đặt'); return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!r.canceled) setImages((prev) => [...prev, r.assets[0].uri]);
  }

  function removeNewImage(uri: string) {
    setImages((prev) => prev.filter((u) => u !== uri));
  }

  function removeKeepImage(path: string) {
    setKeepImages((prev) => prev.filter((p) => p !== path));
  }

  async function handleSubmit() {
    const raw = parseRawAmount(amount);
    if (!amount.trim() || isNaN(raw) || raw <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('amount', String(raw));
      if (note.trim()) form.append('note', note.trim());
      if (selectedCat) form.append('categoryId', selectedCat.id);
      if (isEdit) form.append('keepImages', JSON.stringify(keepImages));

      images.forEach((uri) => {
        const filename = uri.split('/').pop() ?? 'photo.jpg';
        const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
        form.append('images', { uri, name: filename, type: `image/${ext}` } as any);
      });

      if (isEdit && editId) {
        await api.put(`/expenses/${editId}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/expenses', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      refresh();
      Alert.alert('Thành công', isEdit ? 'Đã cập nhật chi tiêu' : 'Đã lưu chi tiêu', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = parseRawAmount(amount) > 0 && !loading;
  const totalImages = keepImages.length + images.length;

  if (initLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#16a34a" size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Sửa chi tiêu' : 'Thêm chi tiêu'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

          {/* Amount */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Số tiền (₫)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₫</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={amount}
                onChangeText={(v) => setAmount(formatAmount(v))}
                keyboardType="numeric"
                returnKeyType="done"
                maxLength={15}
              />
            </View>
          </View>

          {/* Category */}
          <TouchableOpacity style={styles.field} onPress={() => setShowCatModal(true)}>
            <View style={[styles.fieldIcon, { backgroundColor: selectedCat?.color ?? '#e5e7eb' }]}>
              <Text style={{ fontSize: 20 }}>{selectedCat?.icon ?? '🏷️'}</Text>
            </View>
            <Text style={[styles.fieldTxt, !selectedCat && styles.placeholder]}>
              {selectedCat?.name ?? 'Chọn danh mục'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>

          {/* Note */}
          <View style={styles.field}>
            <View style={[styles.fieldIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="create-outline" size={20} color="#16a34a" />
            </View>
            <TextInput
              style={[styles.fieldTxt, { flex: 1 }]}
              placeholder="Ghi chú (tùy chọn)"
              placeholderTextColor="#9ca3af"
              value={note}
              onChangeText={setNote}
              multiline
              returnKeyType="done"
            />
          </View>

          {/* Image section */}
          <View style={styles.imgSection}>
            <Text style={styles.imgLabel}>Ảnh ({totalImages}/5)</Text>
            <View style={styles.imageRow}>
              <TouchableOpacity style={styles.imageBtn} onPress={takePhoto} disabled={totalImages >= 5}>
                <Ionicons name="camera-outline" size={22} color={totalImages >= 5 ? '#d1d5db' : '#16a34a'} />
                <Text style={[styles.imageBtnTxt, totalImages >= 5 && { color: '#d1d5db' }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageBtn} onPress={pickFromGallery} disabled={totalImages >= 5}>
                <Ionicons name="image-outline" size={22} color={totalImages >= 5 ? '#d1d5db' : '#16a34a'} />
                <Text style={[styles.imageBtnTxt, totalImages >= 5 && { color: '#d1d5db' }]}>Thư viện</Text>
              </TouchableOpacity>
            </View>

            {/* Existing images (edit mode) */}
            {keepImages.length > 0 && (
              <FlatList
                horizontal data={keepImages} keyExtractor={(p) => p}
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }}
                renderItem={({ item: path }) => (
                  <View style={styles.thumbBox}>
                    <Image source={{ uri: getImageUrl(path)! }} style={styles.thumb} />
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => removeKeepImage(path)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            {/* New images */}
            {images.length > 0 && (
              <FlatList
                horizontal data={images} keyExtractor={(u) => u}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: uri }) => (
                  <View style={styles.thumbBox}>
                    <Image source={{ uri }} style={styles.thumb} />
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => removeNewImage(uri)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                    <View style={styles.newBadge}><Text style={styles.newBadgeTxt}>Mới</Text></View>
                  </View>
                )}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>{isEdit ? 'Cập nhật' : 'Lưu chi tiêu'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category modal */}
      <Modal visible={showCatModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chọn danh mục</Text>
            <View style={styles.catGrid}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catItem, selectedCat?.id === c.id && { borderColor: c.color, backgroundColor: c.color + '18' }]}
                  onPress={() => { setSelectedCat(c); setShowCatModal(false); }}
                >
                  <Text style={{ fontSize: 28 }}>{c.icon}</Text>
                  <Text style={styles.catName} numberOfLines={1}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowCatModal(false)}>
              <Text style={styles.modalCloseTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb', borderRadius: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  amountCard: { backgroundColor: '#16a34a', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, elevation: 4, shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 10 },
  amountLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 36, fontWeight: '900', color: '#fff', marginRight: 6 },
  amountInput: { fontSize: 44, fontWeight: '900', color: '#fff', minWidth: 100, textAlign: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, gap: 12 },
  fieldIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldTxt: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  placeholder: { color: '#9ca3af', fontWeight: '400' },
  imgSection: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2 },
  imgLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  imageRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  imageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1.5, borderColor: '#bbf7d0' },
  imageBtnTxt: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  thumbBox: { width: 90, height: 90, marginRight: 8, borderRadius: 12, overflow: 'visible', position: 'relative' },
  thumb: { width: 90, height: 90, borderRadius: 12, resizeMode: 'cover' },
  thumbRemove: { position: 'absolute', top: -8, right: -8, zIndex: 10 },
  newBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#16a34a', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  newBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
  submitBtn: { backgroundColor: '#16a34a', borderRadius: 18, padding: 20, alignItems: 'center', marginTop: 4, elevation: 4, shadowColor: '#16a34a', shadowOpacity: 0.4, shadowRadius: 8 },
  submitTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 20 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  catItem: { width: 82, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  catName: { fontSize: 11, color: '#374151', marginTop: 6, textAlign: 'center', fontWeight: '500' },
  modalClose: { alignItems: 'center', marginTop: 20, padding: 14, backgroundColor: '#fef2f2', borderRadius: 14 },
  modalCloseTxt: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
