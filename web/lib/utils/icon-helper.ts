import { LOGO_MASTER, CardBrand } from '../constants/logos';

/**
 * 口座名や設定値から最適なアイコンURLを返す
 */
export function getSmartIconUrl(name: string, iconUrl?: string | null): string | null {
  // 1. 個別設定のURL（手動入力）があれば最優先
  if (iconUrl) return iconUrl;

  // 2. マスタからキーワード検索
  const matchedEntry = Object.entries(LOGO_MASTER.accounts).find(([key]) => 
    name.toLowerCase().includes(key.toLowerCase())
  );

  return matchedEntry ? matchedEntry[1] : null;
}

/**
 * カードブランド名からロゴURLを返す
 */
export function getCardBrandLogo(brand: string | null): string | null {
  if (!brand) return null;
  const b = brand.toLowerCase() as CardBrand;
  return LOGO_MASTER.brands[b] || null;
}