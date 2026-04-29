import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SnackbarState = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

let _show: ((msg: string, opts?: { action?: string; onAction?: () => void }) => void) | null = null;
let _hide: (() => void) | null = null;

export function showSnackbar(msg: string, opts?: { action?: string; onAction?: () => void }) {
  _show?.(msg, opts);
}

export function hideSnackbar() {
  _hide?.();
}

export function Snackbar() {
  const [state, setState] = useState<SnackbarState>({ visible: false, message: '' });
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    _show = (message, opts) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState({ visible: true, message, actionLabel: opts?.action, onAction: opts?.onAction });
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          () => setState({ visible: false, message: '' })
        );
      }, 4500);
    };
    _hide = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => setState({ visible: false, message: '' })
      );
    };
    return () => {
      _show = null; _hide = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!state.visible) return null;

  return (
    <Animated.View style={[styles.bar, { opacity }]}>
      <Text style={styles.msg} numberOfLines={2}>{state.message}</Text>
      {state.actionLabel && state.onAction && (
        <TouchableOpacity onPress={() => { hideSnackbar(); state.onAction?.(); }}>
          <Text style={styles.action}>{state.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 90, left: 16, right: 16,
    backgroundColor: '#1f2937', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12,
    zIndex: 9999,
  },
  msg: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  action: { color: '#4ade80', fontWeight: '800', fontSize: 14, marginLeft: 12 },
});
