# Conda 開発環境（Windows 向け）

以下は `conda` を使って開発環境を整え、Next.js 開発サーバを起動する最小手順です。

1. プロジェクトルートで環境を作成:

```
conda env create -f environment.yml
```

2. 環境を有効化:

```
conda activate flola-dev
```

3. Python 依存をインストール:

```
pip install -r requirements.txt
```

4. Node 依存をインストールして開発サーバ起動（`web` ディレクトリ内）:

```
cd web
npm install
npm run dev
```

補助スクリプト（プロジェクトルート）:

- `run_dev.bat` : Anaconda Prompt で実行すると環境を有効化して `npm run dev` を実行します。
- `run_dev.ps1` : PowerShell 用の同等スクリプトです（PowerShell に Conda 初期化が必要）。

注意:
- `conda activate` がコマンドプロンプト/PowerShell で動作するには事前に `conda init` を実行してシェルを再起動してください。
- `playwright` 等のパッケージは別途ブラウザのインストール（`playwright install`）が必要な場合があります。
