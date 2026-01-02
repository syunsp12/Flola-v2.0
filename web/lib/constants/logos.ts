/**
 * Flola ロゴ・マスタ
 * システム全体で使用するアイコンやロゴのURLを一括管理します。
 * publicフォルダ内のファイル（/logo.jpg等）も指定可能です。
 */

export const LOGO_MASTER = {
  // 口座名（キーワード）とロゴURLの対応
  accounts: {
    '三井住友銀行': 'https://www.smbc.co.jp/favicon.ico', // 例（実際はより高解像度なURLを推奨）
    '三井住友カード': 'https://www.smbc-card.com/favicon.ico',
    'Olive': 'https://www.smbc.co.jp/favicon.ico',
    '三菱UFJ銀行': 'https://www.bk.mufg.jp/favicon.ico',
    'みずほ銀行': 'https://www.mizuhobank.co.jp/favicon.ico',
    '楽天銀行': 'https://www.rakuten-bank.co.jp/favicon.ico',
    'ソニー銀行': 'https://sonybank.net/favicon.ico',
    'SBI証券': 'https://search.sbisec.co.jp/favicon.ico',
    'Viewカード': 'https://www.jreast.co.jp/favicon.ico',
    // 独自のローカルファイルを使用する場合の例
    // 'マイ銀行': '/logos/my-bank.png', 
  },

  // クレジットカードブランドのロゴURL
  brands: {
    'visa': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg',
    'mastercard': 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
    'jcb': 'https://upload.wikimedia.org/wikipedia/commons/4/40/JCB_logo.svg',
    'amex': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
    'diners': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Diners_Club_Logo3.svg',
  }
} as const;

export type CardBrand = keyof typeof LOGO_MASTER.brands;
