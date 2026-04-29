import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserInfo = {
  id: string;
  username: string;
  displayName: string;
  email?: string | null;
  householdId?: string | null;
  householdName?: string | null;
  inviteCode?: string | null;
};

export const storage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem('token');
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem('token', token);
  },

  async getUser(): Promise<UserInfo | null> {
    const s = await AsyncStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  },
  async setUser(user: UserInfo): Promise<void> {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove(['token', 'user']);
  },
};
