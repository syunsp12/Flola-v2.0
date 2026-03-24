# Lint解消 バーンダウン計画（ファイル単位・見積付き）

<<<<<<< ours
最終計測: `npx eslint . -f json`  
=======
最終計測: `npx eslint . -f json`（2026-03-12更新）  
>>>>>>> theirs
対象: `web/`

## 1. 現状サマリ

<<<<<<< ours
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
=======
- Errors: **0**（開始時 78 → **-78**）
- Warnings: **0**（開始時 74 → **-74**）
- 主要ルール
  - `@typescript-eslint/no-explicit-any`: 0
  - 主要Warning: 0（全件解消）

## 2. ファイル別バックログ（Error件数順）

- ✅ Errorは全件解消（`npx eslint . -f json` で `errors=0`）。
- ✅ Warning も全件解消（`npx eslint . -f json` で `warnings=0`）。

合計見積: **0人日（lint完了）**
>>>>>>> theirs

## 3. 実施フェーズ

### Phase 1（着手済み）
- `components/bottom-nav.tsx` の `set-state-in-effect` 解消
- `app/tools/page.tsx` の `any` 解消

### Phase 2（次）
- `types/ui.ts`, `app/page.tsx`, `components/asset-chart.tsx` を先に小さく解消（1日）

<<<<<<< ours
### Phase 3（中規模）
- `app/analyze/page.tsx`, `app/tools/salary/page.tsx`, `components/AdminDashboard.tsx`（1.3日）

### Phase 4（大物）
- `app/admin/page.tsx`, `app/assets/page.tsx`, `app/inbox/inbox-client.tsx`, `components/Assets.tsx`（3.5日）
=======
#### Phase 2 進捗（着手済み）
- `types/ui.ts`: `metadata/details` の `any` を `Record<string, unknown>` 化
- `app/page.tsx`: カテゴリ集計の `any` を除去、未使用importを削除
- `components/asset-chart.tsx`: `formatter` の `any` を除去、型を `number | string | undefined` に修正
- `components/Dashboard.tsx`: `formatter` の `any` を除去
- `components/Transactions.tsx`: `suggestion` を型定義化して `any` を除去
- `components/AdminDashboard.tsx`: タブ/カテゴリ選択の `as any` を除去

### Phase 3（中規模）
- `components/AdminDashboard.tsx`（0.3日）

#### Phase 3 進捗（着手済み）
- `app/analyze/page.tsx`: `accounts/assetHistory/assetGroups/salaryHistory` の `any[]` を専用型へ置換
- `app/tools/salary/page.tsx`: `result/accounts/catch` の `any` を型定義 + `unknown` に置換

### Phase 4（完了）
- `components/Assets.tsx` を型定義ベースへ再構成し、`any`/`static-components`/`set-state-in-effect` を解消

#### Phase 4 進捗（完了）
- `app/admin/page.tsx`: `jobs/logs` の `any[]` を型定義へ置換、`catch(any)` を `unknown` 化
- `app/assets/page.tsx`: `AccountCard` とページ状態を型定義化、`catch(any)` を `unknown` 化、`children` props エラーを修正
- `app/inbox/inbox-client.tsx`: `Transaction`/`Account`/props の `any` を型定義化、`catch(any)` を削除
- `components/Assets.tsx`: グラフ/ツールチップ/補助UIを型定義化し Error 0 を達成
>>>>>>> theirs

## 4. Definition of Done

- `npx eslint <対象ファイル>` が error=0
- 変更ファイルに対して `npm run build` が成功
- 型定義は `unknown`/専用型で吸収し、`any` の新規追加なし

## 5. 運用ルール

- PRごとに解消件数を記載（例: `no-explicit-any: -12`）
- バーンダウン表を更新
- 変更が大きいファイルは分割PR推奨（レビュー負荷を下げるため）
