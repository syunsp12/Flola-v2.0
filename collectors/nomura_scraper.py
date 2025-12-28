import os
import re
import datetime
import asyncio
import traceback
from typing import Optional
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
NOMURA_LOGIN_ID = os.getenv("NOMURA_LOGIN_ID")
NOMURA_PASSWORD = os.getenv("NOMURA_PASSWORD")

JOB_ID = "scraper_nomura"
ACCOUNT_NAME = "野村持株会"

if not all([SUPABASE_URL, SUPABASE_KEY, NOMURA_LOGIN_ID, NOMURA_PASSWORD]):
    raise ValueError("Missing environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def log_system(level: str, message: str, metadata: dict = None):
    try:
        supabase.table("system_logs").insert({
            "source": JOB_ID,
            "level": level,
            "message": message,
            "metadata": metadata
        }).execute()
        print(f"[{level.upper()}] {message}")
    except:
        print(f"[{level.upper()}] {message}")

async def update_job_status(status: str, message: str = ""):
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        supabase.table("job_status").upsert({
            "job_id": JOB_ID,
            "last_run_at": now,
            "last_status": status,
            "message": message
        }).execute()
    except:
        pass

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
    await log_system("info", "🚀 Nomura Scraper started.")
    await update_job_status("running")
    
    try:
        # 口座ID取得
        resp = supabase.table("accounts").select("id").eq("name", ACCOUNT_NAME).single().execute()
        if not resp.data:
            raise Exception(f"Account '{ACCOUNT_NAME}' not found.")
        account_id = resp.data['id']

        async with async_playwright() as p:
            # 本番は Headless モード
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            page = await context.new_page()

            # 1. ログイン
            await page.goto("https://www.e-plan.nomura.co.jp/login/index.html", timeout=60000)
            if await page.locator("#m_login_tab_header_id1").count() > 0:
                await page.click("#m_login_tab_header_id1")
            
            await page.fill("#m_login_mail_address", NOMURA_LOGIN_ID)
            await page.fill("#m_login_mail_password", NOMURA_PASSWORD)
            await page.click(".m_login_btn_01")
            await page.wait_for_load_state("networkidle", timeout=60000)

            if await page.locator(".formErrorContent").count() > 0:
                raise Exception("Login failed.")

            # 2. 詳細ページ
            detail_link = page.locator('a[href*="WEAW1101.jsp"]').first
            if await detail_link.count() > 0:
                await detail_link.click()
                await page.wait_for_load_state("domcontentloaded")
                try:
                    await page.wait_for_selector("table.hidden-sp", timeout=20000)
                except:
                    pass

            # 3. データ抽出
            raw_date_el = page.locator(".e_zandaka_date").first
            record_date = parse_japanese_date(await raw_date_el.inner_text()) if await raw_date_el.count() > 0 else datetime.date.today().isoformat()
            
            market_value = 0
            pc_scope = page.locator(".hidden-sp").first
            if await pc_scope.count() > 0:
                scores = pc_scope.locator(".m_home_mydate_result_score")
                if await scores.count() >= 1:
                    market_value = clean_number(await scores.nth(0).inner_text())

            await browser.close()

            if market_value > 0:
                # 4. 保存 (monthly_balances)
                supabase.table("monthly_balances").upsert({
                    "record_date": record_date,
                    "account_id": account_id,
                    "amount": market_value
                }, on_conflict="record_date, account_id").execute()
                
                msg = f"✅ Saved: {market_value:,} JPY"
                await log_system("info", msg)
                await update_job_status("success", msg)
            else:
                raise Exception("Market value is 0.")

    except Exception as e:
        err_msg = f"Failed: {str(e)}"
        await log_system("error", err_msg, {"trace": traceback.format_exc()})
        await update_job_status("failed", err_msg)
        raise e

if __name__ == "__main__":
    asyncio.run(run())