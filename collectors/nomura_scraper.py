import os
import re
import datetime
import asyncio
from typing import Optional
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

# --- 設定 ---
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
NOMURA_LOGIN_ID = os.getenv("NOMURA_LOGIN_ID")
NOMURA_PASSWORD = os.getenv("NOMURA_PASSWORD")

# 定数
URL_LOGIN = "https://www.e-plan.nomura.co.jp/login/index.html"
SELECTOR_TAB_EMAIL = "#m_login_tab_header_id1"
SELECTOR_INPUT_ID = "#m_login_mail_address"
SELECTOR_INPUT_PASS = "#m_login_mail_password"
SELECTOR_SUBMIT = ".m_login_btn_01"
SELECTOR_DETAIL_LINK = 'a[href*="WEAW1101.jsp"]'

if not all([SUPABASE_URL, SUPABASE_KEY, NOMURA_LOGIN_ID, NOMURA_PASSWORD]):
    raise ValueError("環境変数が不足しています。")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_number(text: Optional[str]) -> int:
    if not text: return 0
    clean = re.sub(r"[^0-9\.\-]", "", text)
    if not clean: return 0
    try: return int(float(clean))
    except ValueError: return 0

def parse_japanese_date(text: str) -> str:
    if not text: return datetime.date.today().isoformat()
    m = re.search(r"(20\d{2})年\s*([01]?\d)月\s*([0-3]?\d)日", text)
    if not m: return datetime.date.today().isoformat()
    return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

async def run():
    print("🚀 Nomura Scraper started (Debug Mode).")
    
    async with async_playwright() as p:
        # 【変更】画面を表示する (headless=False)
        browser = await p.chromium.launch(headless=False, slow_mo=100)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()

        try:
            print("🔑 Accessing Login page...")
            await page.goto(URL_LOGIN, timeout=60000)
            await page.wait_for_load_state("domcontentloaded")

            # タブの状態確認
            if await page.locator(SELECTOR_TAB_EMAIL).count() > 0:
                print("   Clicking Email Tab...")
                await page.click(SELECTOR_TAB_EMAIL)
                await asyncio.sleep(1.0) # アニメーション待ち

            print(f"   Filling ID: {NOMURA_LOGIN_ID}")
            # 入力欄が見えているか確認してから入力
            await page.wait_for_selector(SELECTOR_INPUT_ID, state="visible", timeout=10000)
            await page.fill(SELECTOR_INPUT_ID, NOMURA_LOGIN_ID)
            await page.fill(SELECTOR_INPUT_PASS, NOMURA_PASSWORD)
            
            print("   Clicking Submit...")
            await page.click(SELECTOR_SUBMIT)
            
            # 画面遷移待ち
            print("   Waiting for navigation...")
            await page.wait_for_load_state("networkidle", timeout=60000)

            # 現在のURLとタイトルを表示
            print(f"   Current URL: {page.url}")
            print(f"   Page Title: {await page.title()}")

            # ログイン成功判定
            is_logged_in = False
            if await page.locator(SELECTOR_DETAIL_LINK).count() > 0:
                print("   Found Detail Link.")
                is_logged_in = True
            elif await page.locator("text=ログアウト").count() > 0:
                print("   Found Logout Button.")
                is_logged_in = True
            
            if not is_logged_in:
                # エラーメッセージを探す
                error_el = page.locator(".formErrorContent")
                if await error_el.count() > 0:
                    err_text = await error_el.first.inner_text()
                    raise Exception(f"Login Error displayed on screen: {err_text}")
                
                # パスワード期限切れ等の可能性も考慮
                body_text = await page.locator("body").inner_text()
                if "パスワード変更" in body_text:
                    raise Exception("Password change required.")
                
                # 画面の状態を保存
                await page.screenshot(path="nomura_login_fail.png")
                print("📸 Screenshot saved as nomura_login_fail.png")
                raise Exception("Login failed (Unknown reason). Check screenshot.")

            print("✅ Login successful.")

            # --- 詳細ページへ ---
            print("🔗 Navigating to Details...")
            detail_link = page.locator(SELECTOR_DETAIL_LINK).first
            if await detail_link.count() > 0:
                await detail_link.click()
                await page.wait_for_load_state("domcontentloaded")
                
                # テーブル待機
                try:
                    await page.wait_for_selector("table.hidden-sp", timeout=20000)
                except:
                    print("⚠️ Table wait timeout. Checking page content...")
                    await page.screenshot(path="nomura_detail_timeout.png")
            
            # --- データ抽出 ---
            print("💰 Extracting Balance...")
            
            # 基準日
            raw_date_el = page.locator(".e_zandaka_date").first
            record_date = parse_japanese_date(await raw_date_el.inner_text()) if await raw_date_el.count() > 0 else datetime.date.today().isoformat()
            
            # 金額
            market_value = 0
            pc_scope = page.locator(".hidden-sp").first
            if await pc_scope.count() > 0:
                scores = pc_scope.locator(".m_home_mydate_result_score")
                if await scores.count() >= 1:
                    raw_val = await scores.nth(0).inner_text()
                    print(f"   Raw Value Text: {raw_val}")
                    market_value = clean_number(raw_val)

            print(f"   Extracted Market Value: {market_value}")

            if market_value > 0:
                asset_record = {
                    "record_date": record_date,
                    "institution": "野村証券",
                    "name": "持株会",
                    "market_value": market_value,
                    "source": "nomura_native"
                }
                
                supabase.table("assets").upsert(
                    asset_record, 
                    on_conflict="record_date, institution, name, source"
                ).execute()
                print("💾 Assets saved to Supabase.")
            else:
                print("⚠️ Market value is 0. Saving screenshot...")
                await page.screenshot(path="nomura_zero_value.png")

        except Exception as e:
            print(f"❌ Error: {e}")
            await page.screenshot(path="nomura_fatal_error.png")
            print("📸 Error screenshot saved.")

        finally:
            print("👋 Closing browser in 5 seconds...")
            await asyncio.sleep(5)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())