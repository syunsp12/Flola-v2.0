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
PENSION_START_URL = os.getenv("PENSION_START_URL")
PENSION_ACCOUNT_ID = os.getenv("PENSION_ACCOUNT_ID")
PENSION_PASSWORD = os.getenv("PENSION_PASSWORD")

JOB_ID = "scraper_dc"
ACCOUNT_NAME = "DC年金"

if not all([SUPABASE_URL, SUPABASE_KEY, PENSION_START_URL, PENSION_ACCOUNT_ID, PENSION_PASSWORD]):
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
        pass

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

def to_number(s: Optional[str]) -> int:
    if not s: return 0
    s = s.replace('－', '-')
    clean = re.sub(r"[^0-9\-]", "", s)
    if not clean: return 0
    try: return int(clean)
    except: return 0

def parse_date_text(s: Optional[str]) -> str:
    if not s: return datetime.date.today().isoformat()
    m = re.search(r"(20\d{2})年\s*([01]?\d)月\s*([0-3]?\d)日", s)
    if not m: return datetime.date.today().isoformat()
    return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

async def run():
    await log_system("info", "🚀 DC Scraper started.")
    await update_job_status("running")
    
    try:
        # 口座ID取得
        resp = supabase.table("accounts").select("id").eq("name", ACCOUNT_NAME).single().execute()
        if not resp.data:
            raise Exception(f"Account '{ACCOUNT_NAME}' not found.")
        account_id = resp.data['id']

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent='Mozilla/5.0 ... Chrome/120.0.0.0')
            page = await context.new_page()

            # 1. ログイン
            await page.goto(PENSION_START_URL, timeout=60000)
            if await page.locator("input[name='accountId']").count() > 0:
                await page.fill("input[name='accountId']", PENSION_ACCOUNT_ID)
                await page.fill("input[name='password']", PENSION_PASSWORD)
                
                # 送信ボタン探索
                if await page.locator("#submit").count() > 0:
                    await page.click("#submit")
                elif await page.locator("button[name='loginButton']").count() > 0:
                    await page.click("button[name='loginButton']")
                else:
                    await page.evaluate("document.forms[0].submit()")
                
                await page.wait_for_load_state("networkidle", timeout=30000)

            # 2. 待機 (PC用ブロック)
            ID_SHISAN = ".forPcBlock #txtShisanHyoka"
            try:
                await page.wait_for_selector(ID_SHISAN, timeout=30000)
            except:
                pass

            # 3. データ抽出
            raw_shisan = await page.locator(ID_SHISAN).first.inner_text() if await page.locator(ID_SHISAN).count() > 0 else "0"
            market_value = to_number(raw_shisan)
            
            date_el = page.locator(".forPcBlock #txtZikaKijunbi").first
            record_date = parse_date_text(await date_el.inner_text()) if await date_el.count() > 0 else datetime.date.today().isoformat()

            await browser.close()

            if market_value > 0:
                # 4. 保存
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