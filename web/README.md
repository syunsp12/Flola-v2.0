# Flola Web

Flola の Web アプリ（Next.js App Router）です。

## 開発

```bash
cd web
npm install
npm run dev
```

## 必須環境変数（抜粋）

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_KEY`
- `ALLOW_LEGACY_QUERY_AUTH`（任意。`true` のとき `?key=` / `?token=` を移行期間として許可）

## 管理者判定

管理系 Server Action は以下のいずれかで admin 扱いになります。

- `user.app_metadata.role === 'admin'`
- `ADMIN_EMAILS`（カンマ区切り）にログインユーザーのメールアドレスが含まれる

例:

```bash
ADMIN_EMAILS=alice@example.com,bob@example.com
```

## 給与PDF解析

給与解析は Python スクリプト（`collectors/payroll_parser.py`）を呼び出します。

- `PAYROLL_PYTHON_CMD` を設定するとそのコマンドを優先利用
- 未設定時は `python3` → `python` の順でフォールバック

例:

```bash
PAYROLL_PYTHON_CMD=python3
```

失敗時の代表エラーコード:

- `PYTHON_NOT_FOUND`
- `PARSER_SCRIPT_NOT_FOUND`
- `PARSER_OUTPUT_INVALID_JSON`
- `PARSER_EXECUTION_FAILED`


## テスト受け入れ方針（PR前チェック）

最低限、以下を実施してからPRに結果を記載してください。

```bash
cd web
npm ci
npm run lint
npm run build
```

変更が限定的な場合の補助コマンド:

```bash
cd web
npx eslint app/api/status/route.ts app/api/webhook/gmail/route.ts app/actions.ts
```

### API認証変更時の受け入れ確認

- `Authorization: Bearer <ADMIN_API_KEY>` で 200
- ヘッダなしで 401
- 不正トークンで 403

### 管理Action変更時の受け入れ確認

- adminユーザーで成功
- 非adminユーザーで拒否（Forbidden）
