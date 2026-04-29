import { NativeModules, Platform } from 'react-native';

const { UserDefaultsBridge } = NativeModules;

export interface WidgetData {
  totalThisMonth: number;
  countThisMonth: number;
  monthName: string;
}

/**
 * Writes expense summary data to iOS UserDefaults (App Group),
 * so the WidgetKit extension can read it.
 * No-op on Android or if module is unavailable.
 */
export async function saveToWidget(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!UserDefaultsBridge?.setWidgetData) return;
  try {
    await UserDefaultsBridge.setWidgetData(data);
  } catch {
    // Silently ignore — widget data is non-critical
  }
}

/** Returns the Vietnamese month name for the current date */
export function currentMonthName(): string {
  const now = new Date();
  return `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
}
