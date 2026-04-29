// Production API URL
export const API_BASE_URL = 'https://spendwise-api-7e0n.onrender.com';

export function getImageUrl(p: string | null | undefined): string | null {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return `${API_BASE_URL}${p}`;
}
