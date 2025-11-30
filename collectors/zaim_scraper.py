import os
import re
import datetime
import asyncio
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ZAIM_EMAIL = os.getenv("ZAIM_EMAIL")
ZAIM_PASSWORD = os.getenv("ZAIM_PASSWORD")
STATE_FILE = "zaim_state.json"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def run():
    print("🚀 Script started (v3.1 Debug Mode).")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=50)
        
        # セッション読み込み
        if os.path.exists(STATE_FILE):
            print(f"📂 Loading session from {STATE_FILE}...")
            context = await browser.new_context(storage_state=STATE_FILE)
        else:
            # 万が一セッションがない場合はログイン処理が必要ですが、
            # さっき作ったファイルがあるはずなので省略します
            context = await browser.new_context()

        page = await context.new_page()

        try:
            print("🔗 Navigating to Assets page...")
            await page.goto("https://zaim.net/money", timeout=60000)
            await page.wait_for_load_state("domcontentloaded")
            
            # テーブル待機
            await page.wait_for_selector("table", timeout=30000)

            print("\n🔍 --- Start Extraction Debugging ---")
            
            # ページ内のすべてのテーブルを取得してみる
            tables = await page.locator("table").all()
            print(f"Found {len(tables)} tables on the page.")

            records = []
            today = datetime.date.today().isoformat()
            
            # 全テーブルの全行を走査
            all_rows = await page.locator("table tbody tr").all()
            print(f"Total rows found: {len(all_rows)}\n")

            for i, row in enumerate(all_rows):
                # 行のテキストを取得
                text = await row.inner_text()
                # 空行削除してリスト化
                lines = [line.strip() for line in text.split('\n') if line.strip()]
                
                print(f"Row [{i}] Raw Text: {lines}")

                if len(lines) < 2:
                    print(f"  -> SKIPPED (Not enough lines)")
                    continue

                institution = lines[0]
                name = lines[1] if len(lines) > 1 else "一般"
                
                # 金額抽出トライ
                market_value = None
                for line in lines:
                    # 数値が含まれるか
                    if re.search(r'\d', line):
                        clean_str = re.sub(r'[^\d-]', '', line)
                        if clean_str:
                            try:
                                val = int(clean_str)
                                # 仮採用（後で書き換わるかも）
                                market_value = val
                            except ValueError:
                                continue
                
                if market_value is None:
                    print(f"  -> SKIPPED (No valid amount found)")
                    continue

                # 除外キーワードチェック
                if "合計" in institution or "総資産" in institution:
                    print(f"  -> SKIPPED (Summary row)")
                    continue

                print(f"  -> ✅ CANDIDATE: {institution} / {name} : {market_value}")

                records.append({
                    "record_date": today,
                    "institution": institution,
                    "name": name,
                    "market_value": market_value,
                    "source": "zaim"
                })

            print("--- End Extraction Debugging ---\n")

            if records:
                print(f"💾 Upserting {len(records)} records...")
                supabase.table("assets").upsert(
                    records, 
                    on_conflict="record_date, institution, name, source"
                ).execute()
                print("🎉 Success!")
            else:
                print("⚠️ No records to save.")

        except Exception as e:
            print(f"❌ Error: {e}")
            await page.screenshot(path="debug_error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())