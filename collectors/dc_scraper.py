import os
import re
import datetime
import asyncio
from typing import Optional, Dict
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

# --- 設定 ---
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# DC年金サイトの設定 (既存コードの設定値)
PENSION_START_URL = os.getenv("PENSION_START_URL")
PENSION_ACCOUNT_ID = os.getenv("PENSION_ACCOUNT_ID")
PENSION_PASSWORD = os.getenv("PENSION_PASSWORD")

# セレクタ (DC_data.pyより移植)
# .forPcBlock を付けてPC用要素を特定
ID_SHISAN = ".forPcBlock #txtShisanHyoka"
ID_UNYOU = ".forPcBlock #txtUnyouKingaku"
ID_HYOKA1 = ".forPcBlock #txtHyokaSonekiSum"
ID_PROD_NO = ".forPcBlock #txtProductNo"
ID_PROD_NAME = ".forPcBlock #txtProductName"
ID_JIKA = ".forPcBlock #txtJikaZandaka"

# ログインフォーム
LOGIN_ACCOUNT_SELECTOR = "input[name='accountId']"
LOGIN_PASSWORD_SELECTOR = "input[name='password']"
LOGIN_SUBMIT_SELECTOR = "#submit"

if not all([SUPABASE_URL, SUPABASE_KEY, PENSION_START_URL, PENSION_ACCOUNT_ID, PENSION_PASSWORD]):
    raise ValueError("環境変数が不足しています。PENSION_... 等を確認してください。")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- ヘルパー関数 ---
def to_number(s: Optional[str]) -> int:
    """カンマ付き文字列を数値(整数)に変換"""
    if not s: return 0
    s = s.replace('－', '-') # 全角マイナス対応
    clean = re.sub(r"[^0-9\-]", "", s)
    if not clean: return 0
    try: return int(clean)
    except ValueError: return 0

def parse_date_text(s: Optional[str]) -> str:
    """'YYYY年MM月DD日' -> 'YYYY-MM-DD'"""
    if not s: return datetime.date.today().isoformat()
    m = re.search(r"(20\d{2})年\s*([01]?\d)月\s*([0-3]?\d)日", s)
    if not m: return datetime.date.today().isoformat()
    return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

async def run():
    print("🚀 DC Pension Scraper started.")
    
    async with async_playwright() as p:
        # GitHub Actions用には headless=True
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()

        try:
            # 1. アクセス
            print(f"🔗 Navigating to Start URL...")
            await page.goto(PENSION_START_URL, timeout=60000)
            await page.wait_for_load_state("domcontentloaded")

            # 2. 自動ログイン判定
            if await page.locator(LOGIN_ACCOUNT_SELECTOR).count() > 0:
                print("🔒 Login form detected. Logging in...")
                await page.fill(LOGIN_ACCOUNT_SELECTOR, PENSION_ACCOUNT_ID)
                await page.fill(LOGIN_PASSWORD_SELECTOR, PENSION_PASSWORD)
                
                # 送信ボタンを探してクリック
                # 複数のセレクタ候補から有効なものを探す
                submit_selectors = [LOGIN_SUBMIT_SELECTOR, "button[name='loginButton']", "input[type='submit']"]
                clicked = False
                for sel in submit_selectors:
                    if await page.locator(sel).count() > 0:
                        await page.click(sel)
                        clicked = True
                        break
                
                if not clicked:
                    # フォーム送信
                    await page.evaluate("document.forms[0].submit()")

                await page.wait_for_load_state("networkidle", timeout=30000)
                print("✅ Login process completed.")
            else:
                print("ℹ️ Already logged in or form not found.")

            # 3. 待機 (PC用ブロックが表示されるまで)
            print("⏳ Waiting for main content...")
            try:
                await page.wait_for_selector(ID_SHISAN, timeout=30000)
            except:
                print("⚠️ Main content selector timeout. Page might differ.")

            # 4. データ抽出 (Overview)
            print("💰 Extracting Overview Data...")
            
            # 評価額
            raw_shisan = await page.locator(ID_SHISAN).first.inner_text() if await page.locator(ID_SHISAN).count() > 0 else "0"
            shisan_val = to_number(raw_shisan)
            
            # 運用金額(元本) - 必要なら取得
            # raw_unyou = await page.locator(ID_UNYOU).first.inner_text() ...

            # 基準日取得 (商品情報エリアにあることが多い)
            date_el = page.locator(".forPcBlock #txtZikaKijunbi").first
            if await date_el.count() > 0:
                raw_date = await date_el.inner_text()
                record_date = parse_date_text(raw_date)
            else:
                record_date = datetime.date.today().isoformat()

            print(f"   -> Pension Value: {shisan_val} JPY ({record_date})")

            # 5. データ保存 (Overview)
            if shisan_val > 0:
                # 資産残高として保存
                # institution名は「確定拠出年金」などで統一
                supabase.table("assets").upsert({
                    "record_date": record_date,
                    "institution": "確定拠出年金",
                    "name": "年金資産合計",
                    "market_value": shisan_val,
                    "source": "dc_native"
                }, on_conflict="record_date, institution, name, source").execute()
                print("💾 Overview saved to Assets.")

            # 6. 商品別内訳 (Option)
            # 既存コードでは `extract_product_first` で1つ目だけ取っていましたが、
            # 将来的にはリストで全商品を取るのが理想です。
            # 今回はまず合計額（Overview）が取れればOKとします。

        except Exception as e:
            print(f"❌ Error: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())