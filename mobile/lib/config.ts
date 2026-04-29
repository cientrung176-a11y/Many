// Production API URL — change this when deploying to cloud
export const API_BASE_URL = 'http://192.168.1.6:3000';

export function getImageUrl(p: string | null | undefined): string | null {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return `${API_BASE_URL}${p}`;
}
