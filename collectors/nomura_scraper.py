import asyncio
import datetime
import os
import re
import traceback
from typing import Optional

from dotenv import load_dotenv
from playwright.async_api import Page, async_playwright
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
NOMURA_LOGIN_ID = os.getenv("NOMURA_LOGIN_ID")
NOMURA_PASSWORD = os.getenv("NOMURA_PASSWORD")
NOMURA_ACCOUNT_NAME = os.getenv("NOMURA_ACCOUNT_NAME", "野村持ち株会")
NOMURA_LOGIN_URL = os.getenv("NOMURA_LOGIN_URL", "https://www.e-plan.nomura.co.jp/login/index.html")

JOB_ID = "scraper_nomura"
DETAIL_LINK_SELECTORS = [
    'a[href*="WEAW1101.jsp"]',
    'a[href*="zandaka"]',
    'a[href*="asset"]',
]
MARKET_VALUE_SELECTORS = [
    ".m_home_mydate_result_score",
    ".e_assets_data .number",
    ".financialStatus_box .number",
]
DATE_SELECTORS = [
    ".e_zandaka_date",
    "#txtZikaKijunbi",
]
MARKET_VALUE_LABELS = [
    "時価評価額",
    "評価額",
    "資産評価額",
]
INVESTED_VALUE_LABELS = [
    "累計買付額",
    "取得金額",
    "投資元本",
]

if not all([SUPABASE_URL, SUPABASE_KEY, NOMURA_LOGIN_ID, NOMURA_PASSWORD]):
    raise ValueError("Missing environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


async def log_system(level: str, message: str, metadata: Optional[dict] = None):
    payload = {
        "source": JOB_ID,
        "level": level,
        "message": message,
        "metadata": metadata,
    }
    try:
        supabase.table("system_logs").insert(payload).execute()
    finally:
        print(f"[{level.upper()}] {message}")


async def update_job_status(status: str, message: str = ""):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        supabase.table("job_status").upsert(
            {
                "job_id": JOB_ID,
                "last_run_at": now,
                "last_status": status,
                "message": message,
            }
        ).execute()
    except Exception:
        pass


def clean_number(text: Optional[str]) -> int:
    if not text:
        return 0
    normalized = text.replace(",", "").replace("¥", "").replace("円", "")
    matched = re.findall(r"-?\d+(?:\.\d+)?", normalized)
    if not matched:
        return 0
    try:
        return int(float(matched[0]))
    except ValueError:
        return 0


def parse_japanese_date(text: Optional[str]) -> str:
    if not text:
        return datetime.date.today().isoformat()
    match = re.search(r"(20\d{2})\s*年\s*([01]?\d)\s*月\s*([0-3]?\d)\s*日", text)
    if not match:
        return datetime.date.today().isoformat()
    year, month, day = (int(match.group(i)) for i in range(1, 4))
    return f"{year:04d}-{month:02d}-{day:02d}"


async def text_from_first_visible(page: Page, selectors: list[str]) -> Optional[str]:
    for selector in selectors:
        locator = page.locator(selector).first
        if await locator.count() == 0:
            continue
        try:
            text = (await locator.inner_text()).strip()
        except Exception:
            continue
        if text:
            return text
    return None


async def number_near_label(page: Page, labels: list[str]) -> int:
    script = """
      (labels) => {
        const elements = Array.from(document.querySelectorAll('th, td, span, p, div, dt, dd, li'))
        for (const label of labels) {
          const matched = elements.find((element) => element.innerText && element.innerText.includes(label))
          if (!matched) continue

          const candidates = [
            matched.nextElementSibling,
            matched.parentElement?.nextElementSibling,
            matched.closest('tr')?.querySelector('td:last-child'),
            matched.closest('.financialStatus_box')?.querySelector('.number'),
          ].filter(Boolean)

          for (const candidate of candidates) {
            const text = candidate.innerText?.trim()
            if (text) return text
          }
        }
        return ''
      }
    """
    try:
        text = await page.evaluate(script, labels)
    except Exception:
        return 0
    return clean_number(text)


async def maybe_open_detail_page(page: Page):
    for selector in DETAIL_LINK_SELECTORS:
      locator = page.locator(selector).first
      if await locator.count() == 0:
          continue
      try:
          await locator.click()
          await page.wait_for_load_state("networkidle", timeout=30000)
          await page.wait_for_timeout(2000)
          return
      except Exception:
          continue


async def resolve_market_value(page: Page) -> int:
    by_selector = clean_number(await text_from_first_visible(page, MARKET_VALUE_SELECTORS))
    if by_selector > 0:
        await log_system("info", f"Found market value via selector: {by_selector}")
        return by_selector

    by_label = await number_near_label(page, MARKET_VALUE_LABELS)
    if by_label > 0:
        await log_system("info", f"Found market value via text: {by_label}")
        return by_label

    return 0


async def resolve_invested_value(page: Page) -> Optional[int]:
    invested_value = await number_near_label(page, INVESTED_VALUE_LABELS)
    await log_system("info", f"Found invested value via text: {invested_value}")
    return invested_value or None


async def resolve_record_date(page: Page) -> str:
    date_text = await text_from_first_visible(page, DATE_SELECTORS)
    return parse_japanese_date(date_text)


async def run():
    await log_system("info", "Nomura Scraper started.")
    await update_job_status("running")

    try:
        response = supabase.table("accounts").select("id").eq("name", NOMURA_ACCOUNT_NAME).single().execute()
        if not response.data:
            raise RuntimeError(f"Account '{NOMURA_ACCOUNT_NAME}' not found.")
        account_id = response.data["id"]

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1440, "height": 1200},
            )
            page = await context.new_page()

            await page.goto(NOMURA_LOGIN_URL, timeout=60000)
            if await page.locator("#m_login_tab_header_id1").count() > 0:
                await page.click("#m_login_tab_header_id1")

            await page.fill("#m_login_mail_address", NOMURA_LOGIN_ID)
            await page.fill("#m_login_mail_password", NOMURA_PASSWORD)
            await page.click(".m_login_btn_01")
            await page.wait_for_load_state("networkidle", timeout=60000)

            if await page.locator(".formErrorContent").count() > 0:
                raise RuntimeError("Login failed.")

            await maybe_open_detail_page(page)

            market_value = await resolve_market_value(page)
            invested_value = await resolve_invested_value(page)
            record_date = await resolve_record_date(page)

            if market_value <= 0:
                debug_metadata = {
                    "url": page.url,
                    "title": await page.title(),
                }
                await log_system("error", "Market value could not be extracted.", debug_metadata)
                raise RuntimeError("Market value is 0.")

            supabase.table("monthly_balances").upsert(
                {
                    "record_date": record_date,
                    "account_id": account_id,
                    "amount": market_value,
                    "invested_amount": invested_value,
                },
                on_conflict="record_date, account_id",
            ).execute()

            await browser.close()

        success_message = f"Saved to DB: {market_value:,} JPY (Invested: {invested_value})"
        await log_system("info", success_message)
        await update_job_status("success", success_message)
    except Exception as error:
        error_message = f"Failed: {error}"
        await log_system("error", error_message, {"trace": traceback.format_exc()})
        await update_job_status("failed", error_message)
        raise


if __name__ == "__main__":
    asyncio.run(run())
