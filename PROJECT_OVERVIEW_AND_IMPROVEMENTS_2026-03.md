# Flolaプロジェクト 現状把握と改善ポイント（全体概要 + 具体改修提案）

## 0. このドキュメントの目的

本資料は、Flolaの現状把握に加えて、**「何を・どこまで・どう直すか」** を実行可能な粒度に落とし込んだ改善計画です。  
「方針」だけでなく、対象ファイル、改修内容、受け入れ基準（Done条件）まで定義します。

---

## 1. 全体像（現状）

Flolaは「家計簿 + 資産管理 + 自動連携（Gmail/GAS・スクレイパー）+ 管理画面」を統合した構成です。

- フロント/バックエンド: Next.js App Router + Server Actions
- データ基盤: Supabase（`transactions` / `monthly_balances` / `salary_slips` / `system_logs` / `job_status` など）
- 外部連携:
  - Gmail通知 → GAS → Next.js Webhook（取引取り込み）
  - Playwrightスクレイパー（野村/DC） → Supabase（資産残高取り込み）
- 管理UI: カテゴリ/口座/資産グループ管理、ジョブ実行、ログ確認、給与分析

設計思想としては「受動的な記録アプリ」ではなく「取り込み → 提案 → 承認」の能動運用を目指しています。

---

## 2. 強み（すでに良い点）

1. **業務フローが一気通貫**  
   取引承認、資産推移、給与解析、運用監視まで同一プロダクトで完結。

2. **現実運用に寄ったデータ設計**  
   `user_*` の上書き列により、AI・自動連携の誤差を後から補正できる。

3. **拡張可能性がある**  
   `asset_groups` 等の拡張で、口座分類や可視化軸の増加に対応しやすい。

4. **監視の土台が存在**  
   `system_logs` と `job_status` を活用した運用可視化のベースがある。

---

## 3. 改善優先度（重要度順）

## P0（最優先）: セキュリティ・実行信頼性

### P0-1. Webhook/Status API認証方式の改善
**課題**: `?key=` / `?token=` のクエリ認証は漏洩リスクが高い。  
**改修方針**:
- `Authorization: Bearer <token>` に移行（第一段階）
- 可能なら HMAC署名（`x-flola-signature`）へ発展（第二段階）
- 既存クエリ認証は移行期間のみ許容し、段階的に廃止
- 移行互換が必要な場合は `ALLOW_LEGACY_QUERY_AUTH=true` で一時的にクエリ認証を許可（期限を決めて廃止）

**対象**:
- `web/app/api/webhook/gmail/route.ts`
- `web/app/api/status/route.ts`

**Done条件**:
- クエリ認証なしで動作
- 401/403レスポンスが統一フォーマット
- 監査ログに認証失敗回数を記録

### P0-2. 給与PDF解析のクロスプラットフォーム化
**課題**: Python実行パスがWindows固定でLinux/Vercel互換性が低い。  
**改修方針**:
- 実行コマンドを `PAYROLL_PYTHON_CMD` で上書き可能にする
- 未設定時は `python3` → `python` の順にフォールバック
- 実行失敗時に原因（python未導入/スクリプト不在/JSON parse失敗）をエラー分類

**対象**:
- `web/app/actions.ts`（`analyzePayrollPdf`）
- `web/README.md`（必要ENVの追記）

**Done条件**:
- Windows/Linux/macOSで同じコードパスで動作
- エラー内容が利用者に判別可能

### P0-3. 管理系Actionの認可ガード追加
**課題**: Server Actionsに管理者ロール境界が薄い。  
**改修方針**:
- `assertAdmin()` を共通化し、管理系Actionの先頭で必ず実行
- 対象はカテゴリ/口座/資産グループ更新、ジョブ実行、削除系全般

**対象**:
- `web/app/actions.ts`（分割前）
- 分割後は `web/app/actions/admin.ts` 相当

**Done条件**:
- 非管理者で403
- 認可ロジックの重複がない

---

## P1: 保守性・開発速度

### P1-1. `actions.ts` の責務分離
**課題**: 1ファイルに機能が集中し、影響範囲が読みづらい。  
**改修方針（分割案）**:
- `web/app/actions/transactions.ts`
- `web/app/actions/assets.ts`
- `web/app/actions/admin.ts`
- `web/app/actions/payroll.ts`
- `web/app/actions/ai.ts`
- `web/app/actions/index.ts`（再エクスポート）

**Done条件**:
- `actions.ts` は薄い入口のみ or 廃止
- 1ファイルあたり責務が単一化

### P1-2. UIライブラリ方針の一本化
**課題**: Mantine / shadcn / NextUI 混在で見た目・実装が分散。  
**改修方針**:
- 基準ライブラリを1つ選定（例: Mantine主軸）
- 新規コンポーネントは主軸のみ許可
- 既存は「触るタイミングで寄せる」漸進移行

**Done条件**:
- UI方針を `web/README.md` に明文化
- 新規PRでのライブラリ混在を抑制

### P1-3. README / Runbook整備
**課題**: 開発・運用手順がテンプレ状態。  
**改修方針**:
- ローカル起動、ENV一覧、ジョブ実行、障害対応手順を記載
- 「GAS側設定」「Supabase RLS」「GitHub Actions secrets」を章立て

**Done条件**:
- 新規参加者がREADMEのみで起動可能

---

## P2: データ品質・運用品質

### P2-1. 重複検知の強化
**課題**: 摘要揺れに弱い。  
**改修方針**:
- 正規化済み摘要列（例: `normalized_description`）を導入
- `source_event_id` がある連携は最優先でユニーク判定
- 可能な範囲でDB制約に寄せる

**Done条件**:
- 重複率（手動検知件数）が目に見えて低下

### P2-2. 監視SLOと通知
**課題**: エラー可視化はあるが通知が弱い。  
**改修方針**:
- 失敗時にSlack通知（最低限）
- `job_status` から成功率/遅延を可視化
- 連続失敗時の自動エスカレーションルール追加

**Done条件**:
- 障害検知が「UIを見るまで気づかない」状態を解消

### P2-3. AI分類品質の計測ループ
**課題**: 推論品質が定量化されていない。  
**改修方針**:
- 指標: 提案採用率 / 修正率 / 誤分類Topカテゴリ
- 月次でプロンプトとキーワードを更新

**Done条件**:
- どの改善で精度が上がったか追跡可能

---

## 4. 具体改修バックログ（そのままIssue化可能）

### Epic A: Security Hardening
1. API認証ヘッダ化（Webhook/Status）
2. 認証失敗ログの統一化
3. 管理Actionに `assertAdmin()` 適用

### Epic B: Runtime Reliability
1. `analyzePayrollPdf` の実行コマンド抽象化
2. Python実行エラー分類
3. 給与解析の事前ヘルスチェック（`python --version`）

### Epic C: Codebase Refactor
1. `actions.ts` 分割
2. 共有型定義の整理（`types/`へ集約）
3. import経路の正規化（循環参照防止）

### Epic D: Data & Ops Quality
1. 重複判定キー改善（normalized + source_event_id）
2. ジョブ通知（Slack）
3. AI精度KPIダッシュボード

---

## 5. 6〜8週間実行計画（工数感付き）

### Week 1–2（P0対応）
- API認証ヘッダ化（2〜3人日）
- `assertAdmin()` 導入（1〜2人日）
- 給与解析クロスプラットフォーム化（2〜3人日）

### Week 3–5（P1対応）
- `actions.ts` 分割（4〜6人日）
- README/Runbook整備（2〜3人日）
- UI方針定義（1人日）

### Week 6–8（P2対応）
- 重複検知改善 + migration（3〜5人日）
- 監視通知（2〜3人日）
- AI品質KPI可視化（3〜4人日）

---

## 6. 優先実装のサンプル仕様（抜粋）

### 6.1 Webhook認証（第一段階）
- Request Header: `Authorization: Bearer <ADMIN_API_KEY>`
- バリデーション順:
  1. Header存在チェック
  2. 形式チェック（`Bearer ` prefix）
  3. トークン一致判定
- エラー:
  - 401: 認証情報なし/形式不正
  - 403: トークン不一致

### 6.2 `assertAdmin()` 仕様
- 入力: Supabase user
- 判定: `profiles.role === 'admin'`（想定）
- 失敗時: `throw new Error('Forbidden')` + 403変換
- 対象Action: create/update/delete/trigger系

### 6.3 給与解析コマンド解決
- 優先順:
  1. `PAYROLL_PYTHON_CMD`
  2. `python3`
  3. `python`
- 失敗時メッセージ例:
  - `PYTHON_NOT_FOUND`
  - `PARSER_SCRIPT_NOT_FOUND`
  - `PARSER_OUTPUT_INVALID_JSON`
  - `PARSER_EXECUTION_FAILED`

---

## 7. 総評

Flolaは**「機能統合と業務適合」の基礎体力が高い**プロジェクトです。  
一方で、次の成長段階へ進むには **セキュリティ境界の明確化 / 実行環境依存の除去 / コード責務分離** が最優先です。  
本資料のバックログ（Epic A〜D）をそのまま実行すれば、**安全性・開発速度・運用品質**を同時に引き上げられます。


---

## 8. テスト受け入れ方針（Acceptance Policy）

本プロジェクトでは、変更内容に応じて **必須テストの最小セット** を定義し、PRマージ前に以下を満たすことを受け入れ条件とします。

### 8.1 受け入れゲート（必須）

1. **静的検査ゲート**
   - TypeScript/ESLintエラーが新規に増えていないこと
   - 変更ファイルに対するlintが成功していること

2. **ビルドゲート**
   - `web` の本番ビルドが成功すること

3. **回帰確認ゲート（変更影響範囲）**
   - API変更: 該当エンドポイントの正常系/異常系（401/403/500）を確認
   - Server Action変更: 権限あり/なしの両方を確認
   - 外部連携変更: 環境変数未設定時の失敗動作とログを確認

4. **ドキュメントゲート**
   - ENV追加/仕様変更がREADMEに反映されていること

### 8.2 変更種別ごとの受け入れ基準

- **Docs only**（ドキュメントのみ）
  - Markdownの整合性確認
  - 記載内容と現行実装に矛盾がないこと

- **API認証/セキュリティ変更**
  - 401/403の返し分け確認
  - 既存の正常リクエストが通ること

- **管理権限変更**
  - adminユーザーで成功
  - 非adminユーザーで拒否

- **バッチ/パーサー変更**
  - コマンド解決順の確認（設定あり/なし）
  - 失敗時エラーコードの確認

### 8.3 実施手順（PRごと）

1. 変更差分を確認し、影響カテゴリを判定（API / Action / Parser / Docs）。
2. 以下コマンドを順番に実行（`web` 配下）。
3. 実行結果をPR本文の `Testing` に貼り付け。
4. 失敗した項目は、
   - バグ修正して再実行、または
   - 既存課題であることを明示し、影響がないことを説明。

### 8.4 推奨コマンド手順

```bash
cd web
npm ci
npm run lint
npm run build
```

必要に応じて変更ファイル限定で実施:

```bash
cd web
npx eslint app/api/status/route.ts app/api/webhook/gmail/route.ts app/actions.ts
```

### 8.5 API受け入れチェック例（Bearer認証）

- 正常系: `Authorization: Bearer <ADMIN_API_KEY>` で 200
- 異常系1: ヘッダなしで 401
- 異常系2: 不正トークンで 403

### 8.6 判定ルール（Merge可否）

- **Merge可**: 必須ゲートを満たし、未解決事項がPRに明記されている
- **Merge不可**: ビルド失敗、認可漏れ、仕様差分未記載、検証結果未提示
