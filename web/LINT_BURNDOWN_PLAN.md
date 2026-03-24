# Lint解消 バーンダウン計画（ファイル単位・見積付き）

最終計測: `npx eslint . -f json`  
対象: `web/`

## 1. 現状サマリ

- Errors: **78**
- Warnings: **74**
- 主要ルール
  - `@typescript-eslint/no-explicit-any`: 70
  - `react-hooks/set-state-in-effect`: 4
  - `react-hooks/static-components`: 3

## 2. ファイル別バックログ（Error件数順）

| 優先 | ファイル | Errors | 主なルール | 見積 |
|---|---|---:|---|---:|
| P1 | `components/Assets.tsx` | 26 | `no-explicit-any` | 1.5d |
| P1 | `app/inbox/inbox-client.tsx` | 12 | `no-explicit-any` | 1.0d |
| P1 | `app/assets/page.tsx` | 11 | `no-explicit-any` | 1.0d |
| P1 | `app/admin/page.tsx` | 9 | `no-explicit-any` | 1.0d |
| P2 | `app/tools/salary/page.tsx` | 5 | `no-explicit-any` | 0.5d |
| P2 | `app/analyze/page.tsx` | 4 | `no-explicit-any` | 0.5d |
| P2 | `app/tools/page.tsx` | 2 | `no-explicit-any` | 0.3d |
| P2 | `components/AdminDashboard.tsx` | 2 | `no-explicit-any` | 0.3d |
| P2 | `types/ui.ts` | 2 | `no-explicit-any` | 0.2d |
| P3 | `app/page.tsx` | 1 | `no-explicit-any` | 0.2d |
| P3 | `components/Dashboard.tsx` | 1 | `no-explicit-any` | 0.2d |
| P3 | `components/Transactions.tsx` | 1 | `no-explicit-any` | 0.2d |
| P3 | `components/asset-chart.tsx` | 1 | `no-explicit-any` | 0.2d |
| P3 | `components/bottom-nav.tsx` | 1 | `set-state-in-effect` | 0.2d |

合計見積: **6.8人日**

## 3. 実施フェーズ

### Phase 1（着手済み）
- `components/bottom-nav.tsx` の `set-state-in-effect` 解消
- `app/tools/page.tsx` の `any` 解消

### Phase 2（次）
- `types/ui.ts`, `app/page.tsx`, `components/asset-chart.tsx` を先に小さく解消（1日）

### Phase 3（中規模）
- `app/analyze/page.tsx`, `app/tools/salary/page.tsx`, `components/AdminDashboard.tsx`（1.3日）

### Phase 4（大物）
- `app/admin/page.tsx`, `app/assets/page.tsx`, `app/inbox/inbox-client.tsx`, `components/Assets.tsx`（3.5日）

## 4. Definition of Done

- `npx eslint <対象ファイル>` が error=0
- 変更ファイルに対して `npm run build` が成功
- 型定義は `unknown`/専用型で吸収し、`any` の新規追加なし

## 5. 運用ルール

- PRごとに解消件数を記載（例: `no-explicit-any: -12`）
- バーンダウン表を更新
- 変更が大きいファイルは分割PR推奨（レビュー負荷を下げるため）
