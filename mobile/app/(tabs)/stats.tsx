import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { BarChart, PieChart } from 'react-native-chart-kit';
import api from '../../lib/api';

// const W = Dimensions.get('window').width;

type CatStat = { name: string; icon: string; color: string; total: number; count: number };
type Stats = { total: number; count: number; byCategory: CatStat[]; byDay: Record<string, number>; byUser: Record<string, number> };
type Compare = { current: number; previous: number; diff: number; pct: string | null; currentMonth: string; previousMonth: string };
type Insight = { type: 'info' | 'warning' | 'positive'; icon: string; text: string };

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫'; }
function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

// const CHART_CFG = {
//   backgroundColor: '#fff',
//   backgroundGradientFrom: '#fff',
//   backgroundGradientTo: '#fff',
//   decimalPlaces: 0,
//   color: () => '#16a34a',
//   labelColor: () => '#9ca3af',
//   propsForLabels: { fontSize: 10 },
//   barPercentage: 0.6,
// };

const INSIGHT_COLORS: Record<string, string> = {
  warning: '#fef3c7', positive: '#f0fdf4', info: '#eff6ff',
};
const INSIGHT_TEXT: Record<string, string> = {
  warning: '#92400e', positive: '#166534', info: '#1e40af',
};

type Member = { userId: string; displayName: string; username: string; total: number; count: number; percentage: number };
const AVATAR_COLORS = ['#16a34a','#2563eb','#9333ea','#dc2626','#ea580c','#0891b2'];
function avatarColor(n: string) { return AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(n: string) { return n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(); }

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [compare, setCompare] = useState<Compare | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    const now = new Date();
    Promise.all([
      api.get('/stats/month', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
      api.get('/stats/compare'),
      api.get('/stats/insights'),
      api.get('/stats/members'),
    ]).then(([s, c, ins, mem]) => {
      setStats(s.data);
      setCompare(c.data);
      setInsights(ins.data.insights ?? []);
      setMembers(mem.data.members ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#16a34a" size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const now = new Date();
  const pieData = (stats?.byCategory ?? [])
    .filter((c) => c.total > 0)
    .map((c) => ({
      name: c.name,
      amount: Math.round(c.total),
      color: c.color,
      legendFontColor: '#374151',
      legendFontSize: 12,
    }));

  const dayKeys = Object.keys(stats?.byDay ?? {}).map(Number).sort((a, b) => a - b);
  const barLabels = dayKeys.map(String);
  const barValues = dayKeys.map((d) => stats?.byDay[d] ?? 0);

  const barData = {
    labels: barLabels.length > 0 ? barLabels : ['0'],
    datasets: [{ data: barValues.length > 0 ? barValues : [0] }],
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Thống kê</Text>
        <Text style={styles.sub}>Tháng {now.getMonth() + 1}/{now.getFullYear()}</Text>

        {/* Insights */}
        {insights.length > 0 && (
          <View style={{ gap: 8, marginBottom: 12 }}>
            {insights.map((ins, i) => (
              <View key={i} style={[styles.insightCard, { backgroundColor: INSIGHT_COLORS[ins.type] }]}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>{ins.icon}</Text>
                <Text style={[styles.insightTxt, { color: INSIGHT_TEXT[ins.type] }]}>{ins.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tổng tháng */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tổng chi tiêu tháng này</Text>
          <Text style={styles.totalAmount}>{fmt(stats?.total ?? 0)}</Text>
          <Text style={styles.totalCount}>{stats?.count ?? 0} khoản chi tiêu</Text>
        </View>

        {/* So sánh tháng */}
        {compare && (
          <View style={styles.compareCard}>
            <Text style={styles.compareTitle}>📊 So sánh tháng trước</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>Tháng {compare.currentMonth}</Text>
                <Text style={styles.compareCurrent}>{fmt(compare.current)}</Text>
              </View>
              <View style={styles.compareDivider} />
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>Tháng {compare.previousMonth}</Text>
                <Text style={styles.comparePrev}>{fmt(compare.previous)}</Text>
              </View>
            </View>
            {compare.pct !== null && (
              <View style={[styles.diffBadge, { backgroundColor: compare.diff > 0 ? '#fef2f2' : '#f0fdf4' }]}>
                <Text style={[styles.diffText, { color: compare.diff > 0 ? '#ef4444' : '#16a34a' }]}>
                  {compare.diff > 0 ? '▲' : '▼'} {fmtShort(Math.abs(compare.diff))} ({compare.pct}%)
                  {compare.diff > 0 ? ' — Tăng so với tháng trước' : ' — Giảm so với tháng trước'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Top Spender */}
        {members.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Chi tiêu theo thành viên</Text>
            {members.map((m, i) => (
              <View key={m.userId} style={[styles.userRow, { alignItems: 'center' }]}>
                <View style={[styles.memberAvatar, { backgroundColor: avatarColor(m.displayName) }]}>
                  <Text style={styles.memberAvatarTxt}>{initials(m.displayName)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.userName}>{m.displayName}{i === 0 ? ' 👑' : ''}</Text>
                    <Text style={styles.userAmount}>{fmt(m.total)}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${m.percentage}%` as any, backgroundColor: avatarColor(m.displayName) }]} />
                  </View>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{m.percentage}% · {m.count} khoản</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bar chart */}
        {dayKeys.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Chi tiêu theo ngày</Text>
            <View style={{ height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginTop: 8 }}>
              <Text style={{ color: '#9ca3af' }}>Biểu đồ tạm ẩn (test build)</Text>
            </View>
          </View>
        )}

        {/* Pie chart */}
        {pieData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏷️ Theo danh mục</Text>
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginTop: 4 }}>
              <Text style={{ color: '#9ca3af' }}>Biểu đồ tạm ẩn (test build)</Text>
            </View>
          </View>
        )}

        {/* Top categories */}
        {(stats?.byCategory ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Top danh mục</Text>
            {stats!.byCategory.map((c, i) => (
              <View key={c.name} style={styles.catRow}>
                <Text style={styles.catRank}>#{i + 1}</Text>
                <View style={[styles.catDot, { backgroundColor: c.color }]}>
                  <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <Text style={styles.catCount}>{c.count} lần</Text>
                </View>
                <Text style={styles.catAmount}>{fmt(c.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {stats?.total === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📊</Text>
            <Text style={styles.emptyTxt}>Chưa có dữ liệu tháng này</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },
  totalCard: { backgroundColor: '#16a34a', borderRadius: 22, padding: 24, marginBottom: 12, alignItems: 'center' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  totalAmount: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 6 },
  totalCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  compareCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12, elevation: 2 },
  compareTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  compareRow: { flexDirection: 'row', alignItems: 'center' },
  compareCol: { flex: 1, alignItems: 'center' },
  compareLabel: { fontSize: 12, color: '#9ca3af' },
  compareCurrent: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4 },
  comparePrev: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 4 },
  compareDivider: { width: 1, height: 40, backgroundColor: '#e5e7eb', marginHorizontal: 16 },
  diffBadge: { borderRadius: 10, padding: 10, marginTop: 12 },
  diffText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  userName: { fontSize: 15, color: '#374151', fontWeight: '500' },
  userAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catRank: { fontSize: 14, fontWeight: '700', color: '#9ca3af', width: 28 },
  catDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  catName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  catCount: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  catAmount: { fontSize: 14, fontWeight: '800', color: '#374151' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { fontSize: 16, color: '#9ca3af', marginTop: 8 },
  insightCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14 },
  insightTxt: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  memberAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberAvatarTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  progressBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
});
