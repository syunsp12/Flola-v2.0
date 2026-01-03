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
            # 評価額と運用金額が表示されるまで待機
            await page.wait_for_selector("#txtShisanHyoka", timeout=30000)
            
            # 評価額の取得
            raw_shisan = await page.locator("#txtShisanHyoka").first.inner_text()
            market_value = to_number(raw_shisan)
            
            # 運用金額の取得 (ID指定 + テキスト検索のハイブリッド)
            invested_value = None
            try:
                # まずIDで試行
                el = page.locator("#txtUnyouKingaku")
                if await el.count() > 0:
                    invested_value = to_number(await el.first.inner_text())
                
                # IDで見つからない、または0の場合はテキストから近傍を探索
                if not invested_value:
                    # 「運用金額」という文字を含む要素の「次の要素」を取得
                    invested_value = to_number(await page.evaluate('''() => {
                        const label = Array.from(document.querySelectorAll('span, p, th')).find(el => el.innerText.includes('運用金額'));
                        if (!label) return '';
                        // 親のdiv(financialStatus_box)内にあるnumberクラスの要素を探す
                        const box = label.closest('.financialStatus_box');
                        return box ? box.querySelector('.number').innerText : '';
                    }'''))
            except Exception as e:
                await log_system("warning", f"Could not extract '運用金額': {str(e)}")

            # 日付の取得 (HTML構造に合わせて調整)
            date_text = ""
            date_el = page.locator("#txtZikaKijunbi")
            if await date_el.count() > 0:
                date_text = await date_el.first.inner_text()
            
            record_date = parse_date_text(date_text) if date_text else datetime.date.today().isoformat()

            await browser.close()

            if market_value > 0:
                # 4. 保存
                data = {
                    "record_date": record_date,
                    "account_id": account_id,
                    "amount": market_value,
                    "invested_amount": invested_value
                }
                await log_system("info", f"💾 Attempting to upsert balance: {data} (Search label: '運用金額')")
                
                res = supabase.table("monthly_balances").upsert(
                    data, 
                    on_conflict="record_date, account_id"
                ).execute()
                
                msg = f"✅ Saved to DB: {market_value:,} JPY (Date: {record_date}, AccID: {account_id})"
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