import datetime
import hashlib
import random
from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

from songs import SONGS

FORTUNES = [
    {
        "level": "超大吉 (Super Lucky)",
        "score": 100,
        "message": "素晴らしい奇跡が起きる最高の一日！あなたの直感は冴え渡り、選択するすべてが幸運へと繋がります。今すぐ行動を起こしましょう！"
    },
    {
        "level": "大吉 (Excellent Lucky)",
        "score": 90,
        "message": "絶好調！やる気とエネルギーに満ちあふれています。新しいことに挑戦したり、少し大胆な選択をするのがオススメです。"
    },
    {
        "level": "中吉 (Moderate Lucky)",
        "score": 80,
        "message": "非常に良好な運気です。周囲との調和が取れ、スムーズに物事が運びます。身近な人への感謝を言葉にするとさらに運気アップ。"
    },
    {
        "level": "小吉 (Small Lucky)",
        "score": 70,
        "message": "穏やかで幸せな一日。小さなラッキーが随所に散らばっています。日常の些細な楽しみに目を向けてみてください。"
    },
    {
        "level": "吉 (Good Lucky)",
        "score": 60,
        "message": "堅実で安定した一日。焦らずじっくりと取り組むことで結果が出ます。自分のペースを守りましょう。"
    },
    {
        "level": "末吉 (Ending Lucky)",
        "score": 50,
        "message": "ここから運気が上昇していく暗示。今は力を蓄え、整理整頓や計画を立てるのが吉。音楽があなたの力になります。"
    }
]

MOOD_LABELS = {
    "energy": "元気がほしい！",
    "calm": "癒やされたい",
    "focus": "集中したい",
    "happy": "ワクワクしたい",
    "emotional": "感情に浸りたい"
}

GENRE_LABELS = {
    "all": "🎵 すべて",
    "jpop": "🌸 J-POP",
    "kpop": "🇰🇷 K-POP",
    "western_pop": "🌍 洋楽ポップス",
    "rock": "🎸 ロック",
    "rnb": "🎙️ R&B / ソウル",
    "latin": "💃 ラテン",
    "anime": "🎮 アニメ・ゲーム",
    "chill": "☕ チル / インスト"
}

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        birthdate = request.form.get("birthdate", "")
        mood = request.form.get("mood", "happy")
        genre = request.form.get("genre", "all")
        
        if not name or not birthdate:
            return render_template(
                "index.html", 
                error="お名前と生年月日を入力してください。", 
                mood_labels=MOOD_LABELS,
                genre_labels=GENRE_LABELS
            )
        
        return redirect(url_for("result", name=name, birthdate=birthdate, mood=mood, genre=genre))
        
    return render_template("index.html", mood_labels=MOOD_LABELS, genre_labels=GENRE_LABELS)

@app.route("/result")
def result():
    name = request.args.get("name", "").strip()
    birthdate = request.args.get("birthdate", "")
    mood = request.args.get("mood", "happy")
    genre = request.args.get("genre", "all")
    
    if not name or not birthdate:
        return redirect(url_for("index"))
    
    # 決定的なシード値を生成 (名前 + 誕生日 + 今日の日付)
    today_str = datetime.date.today().isoformat()
    seed_str = f"{name}-{birthdate}-{today_str}"
    seed_hash = hashlib.sha256(seed_str.encode("utf-8")).hexdigest()
    seed_int = int(seed_hash, 16)
    
    # シードを使用して専用の乱数生成器を作成
    local_random = random.Random(seed_int)
    
    # 運勢の決定
    # 超大吉: 5%, 大吉: 20%, 中吉: 30%, 小吉: 25%, 吉: 15%, 末吉: 5%
    fortune_roll = local_random.randint(1, 100)
    if fortune_roll <= 5:
        fortune = FORTUNES[0]  # 超大吉
    elif fortune_roll <= 25:
        fortune = FORTUNES[1]  # 大吉
    elif fortune_roll <= 55:
        fortune = FORTUNES[2]  # 中吉
    elif fortune_roll <= 80:
        fortune = FORTUNES[3]  # 小吉
    elif fortune_roll <= 95:
        fortune = FORTUNES[4]  # 吉
    else:
        fortune = FORTUNES[5]  # 末吉
        
    # --- フィルタリングロジック（気分とジャンルの組み合わせ） ---
    matching_songs = SONGS
    
    # 1. まずジャンルでフィルタリング（"all" 以外の場合）
    if genre != "all":
        matching_songs = [s for s in matching_songs if s["genre"] == genre]
        
    # 2. 次に気分(mood)でフィルタリング
    mood_songs = [s for s in matching_songs if mood in s["moods"]]
    
    # 3. マッチする曲がない場合のセーフティ・フォールバック
    if mood_songs:
        matching_songs = mood_songs
    elif matching_songs:
        # ジャンル一致の曲はあるが指定気分がない場合はジャンル優先
        pass
    else:
        # どちらも無いか、ジャンル側も空だった場合は全体から気分一致を探す
        matching_songs = [s for s in SONGS if mood in s["moods"]]
        if not matching_songs:
            matching_songs = SONGS # 最悪のフォールバック
        
    # フィルタリングした曲の中から、シードに基づいて決定的に1曲選択
    song = local_random.choice(matching_songs)
    
    # 運勢に基づいた占いスコアの少しのブレを演出 (生年月日に依存)
    fortune_score = fortune["score"] - (seed_int % 5)
    
    mood_label = MOOD_LABELS.get(mood, "今日の気分")
    genre_label = GENRE_LABELS.get(genre, "すべてのジャンル")
    song_genre_label = GENRE_LABELS.get(song["genre"], "その他").replace("🌸 ", "").replace("🇰🇷 ", "").replace("🌍 ", "").replace("🎸 ", "").replace("🎙️ ", "").replace("💃 ", "").replace("🎮 ", "").replace("☕ ", "")
    
    return render_template(
        "result.html",
        name=name,
        mood_label=mood_label,
        genre_label=genre_label,
        song_genre_label=song_genre_label,
        fortune=fortune,
        fortune_score=fortune_score,
        song=song,
        today=datetime.date.today().strftime("%Y年%m月%d日")
    )

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
