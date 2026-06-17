import datetime
import hashlib
import random
from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

# Song Database
SONGS = [
    {
        "id": 1,
        "title": "群青 (Gunjou)",
        "artist": "YOASOBI",
        "genre": "jpop",
        "moods": ["energy", "emotional"],
        "description": "好きなものを好きと言うことの葛藤と喜びを歌う曲。今日のあなたの一歩は、間違いなく輝く未来へと繋がっています。恐れずに進みましょう！",
        "lucky_item": "お気に入りのスケッチブック",
        "lucky_color": "ウルトラマリン（鮮やかな青）",
        "color_code": "#002fa7",
        "lyrics_snippet": "知らず知らず隠してた 本当の声を響かせてよ、さあ",
        "youtube_query": "YOASOBI 群青"
    },
    {
        "id": 2,
        "title": "きらり (Kirari)",
        "artist": "藤井風",
        "genre": "jpop",
        "moods": ["happy", "calm"],
        "description": "日常の何気ないきらめきを捉えるポップソング。今日はフットワークを軽くして、新しい発見を楽しんでください。素敵な出会いが待っています。",
        "lucky_item": "サングラス",
        "lucky_color": "イエローゴールド",
        "color_code": "#ffd700",
        "lyrics_snippet": "荒れ狂う季節の中を二人は一人きり さらりと さらりと 逃げのびる",
        "youtube_query": "藤井風 きらり"
    },
    {
        "id": 3,
        "title": "怪獣の花唄",
        "artist": "Vaundy",
        "genre": "jpop",
        "moods": ["energy", "happy"],
        "description": "心震えるメロディと疾走感が魅力。胸の中にある眠っていた情熱を呼び覚ます日です。大声でハミングしながら、元気よく進みましょう！",
        "lucky_item": "スニーカー",
        "lucky_color": "コーラルレッド",
        "color_code": "#ff7f50",
        "lyrics_snippet": "騒がしい街のどこかで、僕らはずっと歌を歌っている",
        "youtube_query": "Vaundy 怪獣の花唄"
    },
    {
        "id": 4,
        "title": "One Last Kiss",
        "artist": "宇多田ヒカル",
        "genre": "jpop",
        "moods": ["emotional", "calm"],
        "description": "深くエモーショナルで美しいメロディ。大切な記憶や人への愛おしさが増す日です。過去を愛し、今この瞬間を噛み締めましょう。",
        "lucky_item": "アロマキャンドル",
        "lucky_color": "ディープパープル",
        "color_code": "#4b0082",
        "lyrics_snippet": "初めてのルーブルは なんてことはなかったわ 私だけのモナリザ もうとっくに出会ってたから",
        "youtube_query": "宇多田ヒカル One Last Kiss"
    },
    {
        "id": 5,
        "title": "Subtitle",
        "artist": "Official髭男dism",
        "genre": "jpop",
        "moods": ["emotional", "focus"],
        "description": "言葉の奥にある温かい想いを伝えるバラード。身近な人に感謝や温かい想いを伝えるのに最適な日です。不器用でも言葉にしてみて。",
        "lucky_item": "マフラーまたはストール",
        "lucky_color": "スノーホワイト",
        "color_code": "#fffafa",
        "lyrics_snippet": "凍りついた心には太陽を そして僕の心には君を",
        "youtube_query": "Official髭男dism Subtitle"
    },
    {
        "id": 6,
        "title": "24K Magic",
        "artist": "Bruno Mars",
        "genre": "western",
        "moods": ["happy", "energy"],
        "description": "圧倒的にゴージャスでファンキーな一曲。今日のあなたは自信に満ちあふれ、周囲を明るく照らす存在です。自分へのご褒美を忘れずに！",
        "lucky_item": "ゴールドのアクセサリー",
        "lucky_color": "シャンパンゴールド",
        "color_code": "#f1c40f",
        "lyrics_snippet": "Tonight I just want to take you higher / Throw your hands up in the sky",
        "youtube_query": "Bruno Mars 24K Magic"
    },
    {
        "id": 7,
        "title": "ジムノペディ 第1番 (Gymnopédie No. 1)",
        "artist": "エリック・サティ",
        "genre": "chill",
        "moods": ["calm", "focus"],
        "description": "穏やかで美しいピアノソロ。今日は頑張るのを少しお休みして、静かに心を整える時間を持ちましょう。ハーブティーが心地よい眠りを誘います。",
        "lucky_item": "温かいハーブティー",
        "lucky_color": "ミントグリーン",
        "color_code": "#98ff98",
        "lyrics_snippet": "静寂の中に流れる、ゆったりとした時の移ろいを感じて",
        "youtube_query": "Erik Satie Gymnopedie No 1"
    },
    {
        "id": 8,
        "title": "紅蓮華 (Gurenge)",
        "artist": "LiSA",
        "genre": "anime",
        "moods": ["energy"],
        "description": "力強い歌声が逆境に立ち向かう勇気をくれる曲。今日直面する壁は、あなたがさらに成長するためのチャンスです。自分の力を信じて！",
        "lucky_item": "赤いペン",
        "lucky_color": "クリムゾンレッド",
        "color_code": "#dc143c",
        "lyrics_snippet": "強くなれる理由を知った 僕を連れて進め",
        "youtube_query": "LiSA 紅蓮華"
    },
    {
        "id": 9,
        "title": "Dynamite",
        "artist": "BTS",
        "genre": "western",
        "moods": ["happy", "energy"],
        "description": "弾けるようなビートと爽快なメロディ。今日は気分を最高潮にして、やりたいことに飛び込んでみて！あなたの笑顔が最高のラッキーを引き寄せます。",
        "lucky_item": "ワイヤレスイヤホン",
        "lucky_color": "パステルピンク",
        "color_code": "#ffd1dc",
        "lyrics_snippet": "Shining through the city with a little funk and soul / So light it up like dynamite",
        "youtube_query": "BTS Dynamite"
    },
    {
        "id": 10,
        "title": "Energy Flow",
        "artist": "坂本龍一",
        "genre": "chill",
        "moods": ["calm", "focus"],
        "description": "心に深く染み入るピアノ旋律。過剰なプレッシャーから解放され、本来の自分のリズムを取り戻せる日です。深呼吸を3回行いましょう。",
        "lucky_item": "木漏れ日",
        "lucky_color": "フォレストグリーン",
        "color_code": "#228b22",
        "lyrics_snippet": "静かに、ただ穏やかに流れるエネルギーに身を任せて",
        "youtube_query": "Ryuichi Sakamoto Energy Flow"
    },
    {
        "id": 11,
        "title": "ダンスホール",
        "artist": "Mrs. GREEN APPLE",
        "genre": "jpop",
        "moods": ["happy", "energy"],
        "description": "どんな日もダンスホールのように楽しもうというポジティブソング。今日がどんなに忙しくても、楽しむ心を忘れなければ素晴らしい一日になります！",
        "lucky_item": "手鏡",
        "lucky_color": "サンシャインオレンジ",
        "color_code": "#ff9e2c",
        "lyrics_snippet": "いつだって大丈夫、僕らは何処へでも行ける",
        "youtube_query": "Mrs GREEN APPLE ダンスホール"
    },
    {
        "id": 12,
        "title": "Chill Lofi Beat",
        "artist": "Lofi Girl Studio",
        "genre": "chill",
        "moods": ["focus", "calm"],
        "description": "心地よいビートとノスタルジックなメロディ。勉強や作業が驚くほど捗る一日です。ノイズを遮断して、自分の世界に没頭しましょう。",
        "lucky_item": "お気に入りのノート",
        "lucky_color": "ココアブラウン",
        "color_code": "#d2691e",
        "lyrics_snippet": "ゆったりと流れるレコードの溝に、思考を泳がせて",
        "youtube_query": "Lofi Girl study beat"
    },
    {
        "id": 13,
        "title": "Shake It Off",
        "artist": "Taylor Swift",
        "genre": "western",
        "moods": ["energy", "happy"],
        "description": "他人の目を気にせず、ネガティブな意見は笑い飛ばそうという応援歌。今日は余計な悩みはスルーして、あなたらしく羽ばたく日です。",
        "lucky_item": "カラフルなキーホルダー",
        "lucky_color": "スカイブルー",
        "color_code": "#87ceeb",
        "lyrics_snippet": "Heartbreakers gonna break... I'm just gonna shake, shake / Shake it off!",
        "youtube_query": "Taylor Swift Shake It Off"
    },
    {
        "id": 14,
        "title": "前前前世 (Zenzenzense)",
        "artist": "RADWIMPS",
        "genre": "anime",
        "moods": ["energy", "emotional"],
        "description": "時空を超えるほどの強烈な絆とスピード感。運命的なアイデアや、昔懐かしい友人からの連絡があるかもしれません。直感を信じて動いてみて。",
        "lucky_item": "腕時計",
        "lucky_color": "コズミックネイビー",
        "color_code": "#000080",
        "lyrics_snippet": "君の前前前世から僕は 君を探し始めたよ",
        "youtube_query": "RADWIMPS 前前前世"
    },
    {
        "id": 15,
        "title": "Ocean Eyes",
        "artist": "Billie Eilish",
        "genre": "western",
        "moods": ["calm", "emotional"],
        "description": "幻想的で透き通るようなボーカル。自分の中の繊細な感情を優しく労わる日。夜風にあたりながら月を眺めると、心が静まります。",
        "lucky_item": "シルバーの指輪",
        "lucky_color": "インディゴブルー",
        "color_code": "#4b0082",
        "lyrics_snippet": "I've been watching you for some time / Can't stop staring at those ocean eyes",
        "youtube_query": "Billie Eilish Ocean Eyes"
    }
]

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
    "western": "🌍 洋楽",
    "anime": "🎮 アニメ・ゲーム",
    "chill": "☕ インスト・チル"
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
    song_genre_label = GENRE_LABELS.get(song["genre"], "その他").replace("🌸 ", "").replace("🌍 ", "").replace("🎮 ", "").replace("☕ ", "")
    
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
    app.run(debug=True, host="0.0.0.0", port=5000)
