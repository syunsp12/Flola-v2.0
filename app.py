import os
import json
import datetime
import pandas as pd
import streamlit as st
import plotly.express as px
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# --- 設定・接続 ---
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GOOGLE_API_KEY]):
    st.error("環境変数が不足しています (.envを確認してください)")
    st.stop()

# Gemini設定
genai.configure(api_key=GOOGLE_API_KEY)

# Supabase接続 (キャッシュ)
@st.cache_resource
def init_connection():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

supabase = init_connection()

# --- 関数: AIによるカテゴリ推論 ---
def predict_categories(descriptions, categories_df):
    """
    Gemini APIを使用して、摘要リストからカテゴリIDを推論する
    """
    if not descriptions:
        return {}

    # カテゴリマスタをテキスト化してAIに渡す
    cat_text = ""
    for _, row in categories_df.iterrows():
        keywords = row['keywords'] if row['keywords'] else []
        cat_text += f"ID:{row['id']}, Name:{row['name']}, Keywords:{','.join(keywords)}\n"

    # プロンプト作成
    prompt = f"""
    あなたは家計簿のカテゴリ分類を行うAIアシスタントです。
    以下の「カテゴリリスト」に基づき、「対象の摘要（Description）」に最も適切な「カテゴリID」を推測してください。
    
    # カテゴリリスト
    {cat_text}
    
    # 対象の摘要
    {json.dumps(descriptions, ensure_ascii=False)}
    
    # 制約事項
    1. 出力は必ず以下のJSONフォーマットのみを行ってください。Markdown記法は不要です。
    2. 確信が持てない場合は「未分類」のIDを選択してください。
    
    # 出力形式 (JSON)
    {{
        "SUKIYA": 2,
        "AMAZON": 5
    }}
    """

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(prompt)
        text = response.text
        
        # JSON部分だけ抽出（Markdownのバッククォート対策）
        text = text.replace("```json", "").replace("```", "").strip()
        result_dict = json.loads(text)
        return result_dict
    except Exception as e:
        st.error(f"AI推論エラー: {e}")
        return {}

# --- ページ設定 ---
st.set_page_config(page_title="Flola v2", layout="wide")
st.title("💰 Flola v2 Asset Manager")

# タブ作成
tab1, tab2, tab3 = st.tabs(["📊 Dashboard", "✅ Approval (承認)", "➕ Input (入力)"])

# ==========================================
# Tab 1: ダッシュボード (可視化)
# ==========================================
with tab1:
    st.header("資産サマリ")
    
    try:
        response = supabase.table("assets").select("*").execute()
        assets_df = pd.DataFrame(response.data)

        if not assets_df.empty:
            latest_date = assets_df['record_date'].max()
            current_assets = assets_df[assets_df['record_date'] == latest_date]
            
            total_assets = current_assets['market_value'].sum()
            st.metric("総資産", f"¥{total_assets:,}", f"基準日: {latest_date}")

            fig = px.pie(current_assets, values='market_value', names='institution', title='ポートフォリオ')
            st.plotly_chart(fig, use_container_width=True)
            
            st.dataframe(current_assets[['record_date', 'institution', 'name', 'market_value']])
        else:
            st.info("資産データがまだありません。「Input」タブから入力してください。")
            
    except Exception as e:
        st.error(f"データ取得エラー: {e}")

# ==========================================
# Tab 2: データ承認 (Human-in-the-Loop)
# ==========================================
with tab2:
    st.header("未承認データ一覧")
    
    # 1. マスタ取得
    cat_res = supabase.table("categories").select("*").execute()
    categories_df = pd.DataFrame(cat_res.data)
    
    # 2. 未承認データ取得
    response = supabase.table("transactions").select("*").eq("status", "pending").order("date", desc=True).execute()
    pending_data = response.data

    if pending_data:
        df = pd.DataFrame(pending_data)
        
        # 日付型の変換
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date']).dt.date

        # --- AI自動提案ボタン ---
        col_ai, _ = st.columns([1, 3])
        with col_ai:
            if st.button("🤖 AIでカテゴリを自動提案", type="primary"):
                with st.spinner("AIが思考中..."):
                    # ユニークな摘要だけ抽出してAPI節約
                    unique_descriptions = df['description'].unique().tolist()
                    ai_suggestions = predict_categories(unique_descriptions, categories_df)
                    
                    if ai_suggestions:
                        # データフレームに適用
                        # descriptionをキーにして category_id をマップする
                        df['category_id'] = df['description'].map(ai_suggestions).fillna(df['category_id'])
                        st.toast("AIによる提案を適用しました！確認して承認してください。", icon="✨")
                    else:
                        st.warning("AIからの応答がありませんでした。")

        st.divider()

        # --- データ編集エディタ ---
        df['approve'] = False
        
        # カテゴリ選択肢を見やすくするために表示名を加工することも可能だが、
        # ここではシンプルにID入力または数値として扱う
        # (Streamlitの将来のアップデートでSelectBoxが使いやすくなるのを期待)
        
        edited_df = st.data_editor(
            df,
            column_config={
                "approve": st.column_config.CheckboxColumn("承認", default=False),
                "category_id": st.column_config.NumberColumn("カテゴリID", help="マスタIDを入力"),
                "date": st.column_config.DateColumn("日付"),
                "amount": st.column_config.NumberColumn("金額", format="¥%d"),
                "description": st.column_config.TextColumn("摘要"),
            },
            hide_index=True,
            use_container_width=True,
            key="editor"
        )
        
        # --- カテゴリマスタの参照表示 ---
        with st.expander("ℹ️ カテゴリID一覧を確認する"):
            st.dataframe(categories_df[['id', 'name', 'keywords']], hide_index=True)

        # --- アクションボタン ---
        col1, col2 = st.columns(2)
        with col1:
            if st.button("選択した項目を承認 (Save)", type="primary"):
                to_confirm = edited_df[edited_df['approve'] == True]
                
                if not to_confirm.empty:
                    count = 0
                    for index, row in to_confirm.iterrows():
                        cat_id = row['category_id']
                        # NaNチェック
                        if pd.isna(cat_id):
                            cat_id = None
                        else:
                            cat_id = int(cat_id)

                        update_data = {
                            "status": "confirmed",
                            "description": row['description'],
                            "category_id": cat_id,
                            "date": str(row['date'])
                        }
                        supabase.table("transactions").update(update_data).eq("id", row['id']).execute()
                        count += 1
                    
                    st.success(f"{count} 件を承認しました！")
                    st.rerun()
                else:
                    st.warning("承認するデータを選択してください。")
        
        with col2:
            if st.button("選択した項目を除外 (Ignore)"):
                to_ignore = edited_df[edited_df['approve'] == True]
                if not to_ignore.empty:
                    for index, row in to_ignore.iterrows():
                        supabase.table("transactions").update({"status": "ignore"}).eq("id", row['id']).execute()
                    st.success("除外しました。")
                    st.rerun()

    else:
        st.success("未承認データはありません 🎉")

# ==========================================
# Tab 3: 手動入力 (Input)
# ==========================================
with tab3:
    st.header("資産残高の手動更新")
    
    with st.form("asset_input_form"):
        col1, col2 = st.columns(2)
        with col1:
            input_date = st.date_input("基準日", datetime.date.today())
            institution = st.text_input("金融機関名", placeholder="例: 三井住友銀行")
        with col2:
            name = st.text_input("口座・商品名", placeholder="例: 普通預金")
            value = st.number_input("残高 (円)", min_value=0, step=1000)
            
        submitted = st.form_submit_button("保存")
        
        if submitted:
            if institution and value is not None:
                data = {
                    "record_date": input_date.isoformat(),
                    "institution": institution,
                    "name": name if name else "一般",
                    "market_value": int(value),
                    "source": "manual_input"
                }
                
                try:
                    supabase.table("assets").upsert(
                        data, on_conflict="record_date, institution, name, source"
                    ).execute()
                    st.success("保存しました！")
                except Exception as e:
                    st.error(f"エラー: {e}")
            else:
                st.warning("金融機関名と残高は必須です。")