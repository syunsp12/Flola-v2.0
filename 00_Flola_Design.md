# 資産管理プラットフォーム "Flola v2" 詳細設計書

**Version:** 3.0 (Final Architecture)
**Date:** 2025-12-28
**Status:** Approved for Development

---

## 1. システム概要

### 1.1 プロジェクトの目的
従来の「記録するだけの家計簿」から脱却し、決済や給与明細の発行をトリガーにシステム側からユーザーへ承認を求める「能動的なファイナンシャル・アシスタント」を構築する。

### 1.2 コアコンセプト
1.  **Mobile First & Widget Integration:**
    Androidウィジェットで未承認件数を常に意識させ、スマホアプリ(PWA)で隙間時間に処理を完了させる。
2.  **Strict Accounting Model:**
    「支出」と「振替（資金移動）」を厳格に区別し、純資産の正確な把握と二重計上の防止を実現する。
3.  **Orchestration & Observability:**
    分散する自動化処理（GAS, GitHub Actions）の実行ログを中央（Supabase）に集約し、Next.js管理画面から監視・制御（再実行）可能にする。

---

## 2. システムアーキテクチャ

**Next.js (Vercel)** をコントロールセンターとし、各ワーカー（GAS/GitHub Actions）を疎結合に統合する構成。

### 2.1 アーキテクチャ図

```mermaid
graph TD
    %% --- クライアント層 ---
    subgraph "Client Layer"
        Android[📱 Android (Widget / Chrome)]
        User((User))
    end

    %% --- コントロールセンター (Vercel) ---
    subgraph "Control Center (Next.js)"
        UI_App[App UI (家計簿画面)]
        UI_Admin[Admin UI (管理画面)]
        API[API Routes]
        Logic_AI[AI Analyzer]
    end

    %% --- データ基盤 (Supabase) ---
    subgraph "Data Hub"
        DB_Biz[(Business Data)]
        DB_Sys[(System Logs)]
    end

    %% --- ワーカー (分散処理) ---
    subgraph "Distributed Workers"
        GAS[⚡ GAS (Email Parser)]
        GHA[🤖 GitHub Actions (Scraper)]
    end

    %% --- 外部サービス ---
    Gemini[🧠 Gemini API]

    %% データフロー
    GAS -- "1. 取引データ & 実行ログ" --> API
    GHA -- "2. 資産データ & 実行ログ" --> DB_Biz & DB_Sys
    
    API -- "3. データ保存 & ログ記録" --> DB_Biz & DB_Sys
    API <--> Gemini
    
    Android -- "4. 未承認数ポーリング" --> API
    User <--> UI_App
    User <--> UI_Admin
    
    %% オーケストレーション
    UI_Admin -- "5. 再実行トリガー" --> API
    API -- "6. Workflow Dispatch" --> GHA
```

### 2.2 技術スタック
*   **Frontend/Backend:** Next.js 14+ (App Router), TypeScript
*   **UI Framework:** Tailwind CSS, Shadcn/ui
*   **Database:** Supabase (PostgreSQL)
*   **AI:** Google Gemini 1.5 Flash
*   **Workers:** Google Apps Script (Gmail), Python/Playwright (GitHub Actions)
*   **Mobile:** Android Widget (via HTTP Shortcuts / KWGT)

---

## 3. データベース設計 (Schema)

ビジネスロジック用データと、システム管理用データを分離して定義する。

### 3.1 ビジネスドメイン (Business Data)

**1. `accounts` (口座マスタ)**
資産の「場所」を定義。
*   `id`: UUID (PK)
*   `name`: Text (例: 三井住友銀行, Oliveフレキシブルペイ)
*   `type`: Enum (`bank`, `credit_card`, `securities`, `pension`, `wallet`)
*   `is_liability`: Boolean (負債フラグ。Trueなら残高マイナス扱い)

**2. `categories` (カテゴリマスタ)**
支出・収入の分類。
*   `id`: Serial (PK)
*   `name`: Text (例: 食費, 給与)
*   `type`: Enum (`income`, `expense`) ※振替にカテゴリは不要
*   `keywords`: Text[] (AI自動分類用ヒント)

**3. `transactions` (取引データ)**
お金の「動き」を記録。
*   `id`: UUID (PK)
*   `date`: Date
*   `amount`: Integer (絶対値・正の数)
*   `type`: Enum (`income`, `expense`, `transfer`)
*   `description`: Text (摘要)
*   `from_account_id`: UUID (支出・振替元)
*   `to_account_id`: UUID (収入・振替先)
*   `category_id`: Integer (支出・収入時のみ)
*   `status`: Enum (`pending`, `confirmed`, `ignore`)
*   `is_subscription`: Boolean (継続課金判定フラグ)
*   `source`: Text (データ発生元: `email`, `manual`, `salary`)

**4. `monthly_balances` (資産履歴)**
時点ごとの資産価値（スナップショット）。
*   `id`: UUID (PK)
*   `record_date`: Date
*   `account_id`: UUID
*   `amount`: Integer (時価評価額)

**5. `salary_slips` (給与明細詳細)**
給与トランザクションの詳細内訳。
*   `id`: UUID (PK)
*   `transaction_id`: UUID (FK)
*   `base_pay`: Integer (基本給)
*   `overtime_pay`: Integer (残業代)
*   `tax`: Integer (控除税額合計)
*   `social_insurance`: Integer (社会保険料合計)
*   `details`: JSONB (その他の細かい手当等)

### 3.2 システムドメイン (System Data)

**1. `system_logs` (実行ログ)**
全システムの稼働状況を一元管理。
*   `id`: UUID (PK)
*   `timestamp`: Timestamptz
*   `source`: Text (例: `gas_vpass_parser`, `github_nomura_scraper`)
*   `level`: Enum (`info`, `warning`, `error`)
*   `message`: Text
*   `metadata`: JSONB (エラー詳細スタックトレース等)

**2. `job_status` (ジョブ状態)**
定期実行ジョブの監視用。
*   `job_id`: Text (PK, 例: `scraper_nomura`)
*   `last_run_at`: Timestamptz
*   `last_status`: Enum (`success`, `failed`)
*   `next_scheduled_at`: Timestamptz

---

## 4. 機能仕様詳細

### 4.1 支出管理パイプライン
1.  **Trigger:** GASがGmailから「利用通知」を検知。
2.  **Webhooks:** GAS → Next.js API (`/api/webhook/transaction`) へPOST。
3.  **Analysis (Next.js):**
    *   **重複排除:** 同一日時・金額のデータチェック。
    *   **AI分類:** Gemini APIへ摘要を送信しカテゴリIDを取得。
    *   **サブスク判定:** 過去3ヶ月の履歴から類似取引を検索しフラグ立て。
4.  **Widget Update:** AndroidウィジェットがAPIをポーリングし、未承認件数を表示。
5.  **User Action:** ユーザーがアプリを開き、AI提案を確認して「承認」。

### 4.2 資産管理オートメーション
1.  **Scraping (GitHub Actions):**
    *   Playwrightで野村証券/DC年金サイトへログイン。
    *   残高・履歴を取得。
    *   Supabase (`monthly_balances`) へ直接書き込み。
    *   実行結果ログを `system_logs` へ書き込み。
2.  **Manual Input (UI):**
    *   銀行残高はアプリの「資産入力」画面から登録（前回値コピー機能あり）。

### 4.3 オーケストレーション (管理画面)
1.  **Dashboard:**
    *   全ジョブの最終実行日時とステータス（緑/赤）を一覧表示。
    *   最近のエラーログを表示。
2.  **Control:**
    *   各ジョブに対して「Run Now」ボタンを設置。
    *   クリック時、Next.js APIから GitHub Actions API (`workflow_dispatch`) をコールしてスクリプトを強制実行。

---

## 5. 開発ロードマップ

### Phase 1: Core Foundation (基盤構築)
*   Next.js プロジェクトセットアップ (Shadcn/ui)
*   Supabase 新スキーマ (Strict Edition + System Logs) の適用
*   基本API (Log記録, Transaction操作) の実装

### Phase 2: Transaction Pipeline (支出管理)
*   GASスクリプトの改修 (API連携対応)
*   Gemini AI 分類ロジックの実装
*   スマホ用「未承認一覧」UIの実装

### Phase 3: Android Integration & Orchestration (連携・監視)
*   Androidウィジェット用APIの実装
*   システム管理画面 (Admin Dashboard) の実装
*   ジョブ状態管理ロジックの実装

### Phase 4: Assets & Salary (資産・給与)
*   既存Pythonスクリプトの移行・GitHub Actions設定
*   給与PDFアップロード＆解析機能の実装

---
```
