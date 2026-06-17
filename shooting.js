/* ==========================================================================
   Neon Striker - Game Logic & Sound Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 要素 ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const hudContainer = document.getElementById('game-hud');
    const hudScore = document.getElementById('hud-score');
    const hudShieldBar = document.getElementById('hud-shield-bar');
    const hudBombs = document.querySelectorAll('.bomb-icon');
    
    const screenStart = document.getElementById('screen-start');
    const screenGameOver = document.getElementById('screen-gameover');
    const btnStart = document.getElementById('btn-start');
    const btnRestart = document.getElementById('btn-restart');
    const audioEnableCheckbox = document.getElementById('audio-enable');
    const finalScoreVal = document.getElementById('final-score');
    const highScoreMsg = document.getElementById('high-score-msg');
    
    const btnMobileBomb = document.getElementById('btn-mobile-bomb');

    // --- ゲーム設定・定数 ---
    const CANVAS_WIDTH = 480;
    const CANVAS_HEIGHT = 640;
    
    // スケール補正用（レスポンシブ時のマウス座標取得のため）
    let canvasScaleX = 1;
    let canvasScaleY = 1;
    function updateCanvasScale() {
        const rect = canvas.getBoundingClientRect();
        canvasScaleX = CANVAS_WIDTH / rect.width;
        canvasScaleY = CANVAS_HEIGHT / rect.height;
    }
    window.addEventListener('resize', updateCanvasScale);
    updateCanvasScale();

    // --- ゲーム変数 ---
    let gameActive = false;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('neon_striker_highscore') || '0');
    let frameCount = 0;
    let isTouchDevice = false;

    // エンティティ配列
    let stars = [];
    let player;
    let lasers = [];
    let enemyLasers = [];
    let enemies = [];
    let items = [];
    let particles = [];
    let bombWaves = [];

    // 入力管理
    const keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        w: false,
        s: false,
        a: false,
        d: false,
        KeyW: false,
        KeyS: false,
        KeyA: false,
        KeyD: false,
        Space: false,
        b: false,
        KeyB: false
    };

    // --- 音響エンジン (Web Audio API) ---
    let audioCtx = null;
    let audioEnabled = true;
    let bgmIntervalId = null;
    let bgmStep = 0;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // 効果音合成
    function playSound(type) {
        if (!audioEnabled || !audioCtx) return;
        
        try {
            const now = audioCtx.currentTime;
            
            if (type === 'laser') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            } 
            else if (type === 'hit') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(40, now + 0.1);
                
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.1);
            }
            else if (type === 'explosion') {
                // ノイズ爆発音
                const bufferSize = audioCtx.sampleRate * 0.3; // 0.3秒
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                const noiseNode = audioCtx.createBufferSource();
                noiseNode.buffer = buffer;
                
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(400, now);
                filter.frequency.exponentialRampToValueAtTime(10, now + 0.3);
                
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                
                noiseNode.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                
                noiseNode.start(now);
                noiseNode.stop(now + 0.3);
            }
            else if (type === 'powerup') {
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(300, now);
                osc1.frequency.setValueAtTime(450, now + 0.08);
                osc1.frequency.setValueAtTime(600, now + 0.16);
                
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(305, now);
                osc2.frequency.setValueAtTime(455, now + 0.08);
                osc2.frequency.setValueAtTime(605, now + 0.16);
                
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.25);
                osc2.stop(now + 0.25);
            }
            else if (type === 'bomb') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(50, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.5);
                osc.frequency.exponentialRampToValueAtTime(10, now + 1.2);
                
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 1.2);
            }
        } catch (e) {
            console.warn("Audio synthesis error:", e);
        }
    }

    // 簡易ビートBGMマシーン（ミニマルなテクノループ）
    function startBgm() {
        if (!audioEnabled) return;
        initAudio();
        stopBgm();
        
        bgmStep = 0;
        bgmIntervalId = setInterval(() => {
            if (!gameActive || !audioCtx || audioCtx.state === 'suspended') return;
            
            try {
                const now = audioCtx.currentTime;
                
                // 1拍目と3拍目にキックドラム
                if (bgmStep % 2 === 0) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(120, now);
                    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
                    
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                    
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(now);
                    osc.stop(now + 0.18);
                }
                
                // 2拍目と4拍目に軽いハイハット風ホワイトノイズ
                if (bgmStep % 2 === 1) {
                    const bufferSize = audioCtx.sampleRate * 0.04;
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                    
                    const noise = audioCtx.createBufferSource();
                    noise.buffer = buffer;
                    
                    const filter = audioCtx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(7000, now);
                    
                    const gain = audioCtx.createGain();
                    gain.gain.setValueAtTime(0.04, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                    
                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(audioCtx.destination);
                    noise.start(now);
                    noise.stop(now + 0.04);
                }

                // テクノ感のあるベースノート
                if (bgmStep % 4 === 1 || bgmStep % 4 === 3) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'triangle';
                    
                    // シンプルなリフ進行
                    const freqs = [65.41, 73.42, 55.00, 58.27]; // C2, D2, A1, A#1
                    const baseFreq = freqs[Math.floor(frameCount / 400) % freqs.length];
                    
                    osc.frequency.setValueAtTime(baseFreq, now);
                    
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(now);
                    osc.stop(now + 0.12);
                }
                
                bgmStep = (bgmStep + 1) % 4;
            } catch (e) {
                // 音声スレッドのラグなどによるエラー回避
            }
        }, 300); // 120BPM相当 (0.3秒/step)
    }

    function stopBgm() {
        if (bgmIntervalId) {
            clearInterval(bgmIntervalId);
            bgmIntervalId = null;
        }
    }

    // --- ゲームモデル クラス定義 ---

    // プレイヤー（自機）
    class Player {
        constructor() {
            this.x = CANVAS_WIDTH / 2;
            this.y = CANVAS_HEIGHT - 60;
            this.radius = 16;
            this.speed = 5.5;
            this.shield = 100;
            this.maxShield = 100;
            this.power = 1;      // ショット強化レベル（1, 2, 3+）
            this.bombs = 3;
            this.lastShotFrame = 0;
            this.shotCooldown = 12; // フレーム数
            this.invulnerableFrame = 0; // 無敵時間フレーム数
        }

        update() {
            // 移動ロジック（キーボード）
            let dx = 0;
            let dy = 0;
            
            if (keys.ArrowLeft || keys.a || keys.KeyA) dx -= 1;
            if (keys.ArrowRight || keys.d || keys.KeyD) dx += 1;
            if (keys.ArrowUp || keys.w || keys.KeyW) dy -= 1;
            if (keys.ArrowDown || keys.s || keys.KeyS) dy += 1;
            
            // 対角線移動時の正規化
            if (dx !== 0 && dy !== 0) {
                dx *= 0.7071;
                dy *= 0.7071;
            }

            this.x += dx * this.speed;
            this.y += dy * this.speed;

            // 画面外への移動防止
            if (this.x < this.radius) this.x = this.radius;
            if (this.x > CANVAS_WIDTH - this.radius) this.x = CANVAS_WIDTH - this.radius;
            if (this.y < this.radius) this.y = this.radius;
            if (this.y > CANVAS_HEIGHT - this.radius) this.y = CANVAS_HEIGHT - this.radius;

            // 無敵処理
            if (this.invulnerableFrame > 0) {
                this.invulnerableFrame--;
            }

            // 自動ショット（キー押しっぱなし）
            if (keys.Space && frameCount - this.lastShotFrame >= this.shotCooldown) {
                this.shoot();
            }
        }

        shoot() {
            this.lastShotFrame = frameCount;
            playSound('laser');

            // 弾丸の色はネオンシアン
            if (this.power === 1) {
                // 通常単発
                lasers.push(new Laser(this.x, this.y - 12, 0, -8, '#00f0ff'));
            } 
            else if (this.power === 2) {
                // 3方向
                lasers.push(new Laser(this.x, this.y - 12, 0, -8, '#00f0ff'));
                lasers.push(new Laser(this.x - 6, this.y - 6, -1.8, -7.6, '#00f0ff'));
                lasers.push(new Laser(this.x + 6, this.y - 6, 1.8, -7.6, '#00f0ff'));
            } 
            else {
                // 5方向（超パワー）
                lasers.push(new Laser(this.x, this.y - 12, 0, -8, '#00f0ff'));
                lasers.push(new Laser(this.x - 6, this.y - 6, -1.8, -7.6, '#00f0ff'));
                lasers.push(new Laser(this.x + 6, this.y - 6, 1.8, -7.6, '#00f0ff'));
                lasers.push(new Laser(this.x - 12, this.y - 4, -3.5, -7.0, '#00f0ff'));
                lasers.push(new Laser(this.x + 12, this.y - 4, 3.5, -7.0, '#00f0ff'));
            }
        }

        useBomb() {
            if (this.bombs <= 0) return;
            this.bombs--;
            updateHud();
            playSound('bomb');

            // 画面全体の破壊ウェーブ発動
            bombWaves.push(new BombWave(this.x, this.y));
            
            // 画面上の全敵にダメージ、全敵弾を消滅
            enemies.forEach(enemy => {
                enemy.hit(20); // 大ダメージ
            });
            enemyLasers = [];
        }

        takeDamage(amount) {
            if (this.invulnerableFrame > 0) return;
            
            this.shield -= amount;
            this.invulnerableFrame = 60; // 1秒無敵
            playSound('hit');
            createExplosion(this.x, this.y, '#ff007f', 15);
            
            if (this.shield <= 0) {
                this.shield = 0;
                gameOver();
            }
            updateHud();
        }

        draw() {
            // 無敵時は点滅描画
            if (this.invulnerableFrame > 0 && Math.floor(frameCount / 4) % 2 === 0) {
                return;
            }

            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f0ff';
            
            // 自機デザイン：スタイリッシュなネオン三角形戦闘機
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 16);
            ctx.lineTo(this.x - 14, this.y + 12);
            ctx.lineTo(this.x, this.y + 4);
            ctx.lineTo(this.x + 14, this.y + 12);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();

            // 内コア（エンジン部）のネオンピンク描画
            ctx.shadowColor = '#ff007f';
            ctx.strokeStyle = '#ff007f';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y + 2, 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();

            // シールド（バリア）エフェクト（無敵時または被弾直後）
            if (this.invulnerableFrame > 30) {
                ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }

    // レーザー（弾）
    class Laser {
        constructor(x, y, vx, vy, color) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.width = 4;
            this.height = 15;
            this.active = true;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            // 画面外で無効化
            if (this.y < -30 || this.y > CANVAS_HEIGHT + 30 || this.x < -30 || this.x > CANVAS_WIDTH + 30) {
                this.active = false;
            }
        }

        draw() {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            
            // 少し傾斜に沿って描画するため、角度を計算
            const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
            
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        }
    }

    // ボム波動エフェクト
    class BombWave {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 10;
            this.maxRadius = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 1.2;
            this.speed = 10;
            this.active = true;
            this.color = '#ff007f';
        }

        update() {
            this.radius += this.speed;
            if (this.radius >= this.maxRadius) {
                this.active = false;
            }
        }

        draw() {
            ctx.save();
            ctx.shadowBlur = 25;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 8 * (1 - this.radius / this.maxRadius); // 外にいくほど細く
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 敵キャラクター
    class Enemy {
        constructor(type) {
            this.type = type; // 'scout', 'fighter', 'hunter', 'boss'
            this.active = true;
            
            this.x = Math.random() * (CANVAS_WIDTH - 60) + 30;
            this.y = -40;
            
            // タイプごとのパラメータ調整
            if (type === 'scout') {
                this.radius = 12;
                this.hp = 1;
                this.speedY = Math.random() * 1.5 + 2.5;
                this.speedX = 0;
                this.color = '#ff007f'; // ピンク
                this.scoreVal = 100;
            } 
            else if (type === 'fighter') {
                this.radius = 16;
                this.hp = 2;
                this.speedY = Math.random() * 1 + 2;
                this.speedX = Math.random() > 0.5 ? 1.5 : -1.5;
                this.color = '#a855f7'; // パープル
                this.scoreVal = 250;
                this.lastShotFrame = 0;
                this.shotInterval = 90 + Math.random() * 60; // 弾を撃つ間隔
            } 
            else if (type === 'hunter') {
                this.radius = 15;
                this.hp = 2;
                this.speedY = 1.8;
                this.speedX = 0; // プレイヤー追従で動的に変化
                this.color = '#eab308'; // イエロー（追尾）
                this.scoreVal = 400;
            }
            else if (type === 'boss') {
                // 中ボス
                this.x = CANVAS_WIDTH / 2;
                this.y = -60;
                this.radius = 32;
                this.hp = 15;
                this.speedY = 1.0;
                this.speedX = 1.2;
                this.color = '#f97316'; // オレンジ
                this.scoreVal = 1500;
                this.lastShotFrame = 0;
                this.shotInterval = 50;
            }
        }

        update() {
            // 移動処理
            if (this.type === 'boss') {
                // ボスは一定の高さまで降りてきてから左右に反復移動
                if (this.y < 120) {
                    this.y += this.speedY;
                } else {
                    this.x += this.speedX;
                    if (this.x < this.radius + 20 || this.x > CANVAS_WIDTH - this.radius - 20) {
                        this.speedX = -this.speedX;
                    }
                }
                
                // ボスの射撃
                if (frameCount - this.lastShotFrame >= this.shotInterval && this.y >= 80) {
                    this.lastShotFrame = frameCount;
                    // 下方向3方向に弾を発射
                    enemyLasers.push(new Laser(this.x, this.y + 20, 0, 5, this.color));
                    enemyLasers.push(new Laser(this.x - 10, this.y + 15, -1.5, 4.5, this.color));
                    enemyLasers.push(new Laser(this.x + 10, this.y + 15, 1.5, 4.5, this.color));
                }
            } 
            else {
                this.y += this.speedY;
                this.x += this.speedX;
                
                if (this.type === 'fighter') {
                    // 壁で跳ね返る
                    if (this.x < this.radius || this.x > CANVAS_WIDTH - this.radius) {
                        this.speedX = -this.speedX;
                    }
                    // 射撃
                    if (frameCount - this.lastShotFrame >= this.shotInterval) {
                        this.lastShotFrame = frameCount;
                        enemyLasers.push(new Laser(this.x, this.y + 15, 0, 5.5, this.color));
                    }
                } 
                else if (this.type === 'hunter') {
                    // プレイヤーのX座標へ徐々に近づく
                    const targetX = player.x;
                    const diffX = targetX - this.x;
                    this.x += Math.sign(diffX) * 1.5;
                }
            }

            // 画面外落下で消去
            if (this.y > CANVAS_HEIGHT + 40) {
                this.active = false;
            }
        }

        hit(damage) {
            this.hp -= damage;
            
            // 被弾パーティクル
            createExplosion(this.x, this.y, this.color, 4);
            
            if (this.hp <= 0) {
                this.active = false;
                score += this.scoreVal;
                updateHud();
                playSound('explosion');
                createExplosion(this.x, this.y, this.color, 12);
                
                // 確率でアイテムドロップ
                tryDropItem(this.x, this.y);
            }
        }

        draw() {
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2.5;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';

            ctx.translate(this.x, this.y);

            // 敵タイプ別に特徴的な幾何学ネオンシェイプを描画
            if (this.type === 'scout') {
                // 逆三角形
                ctx.beginPath();
                ctx.moveTo(0, this.radius);
                ctx.lineTo(-this.radius, -this.radius + 3);
                ctx.lineTo(this.radius, -this.radius + 3);
                ctx.closePath();
            } 
            else if (this.type === 'fighter') {
                // ダイヤモンド型（ひし形）＋羽
                ctx.beginPath();
                ctx.moveTo(0, this.radius);
                ctx.lineTo(-this.radius + 4, 0);
                ctx.lineTo(-this.radius - 4, -4);
                ctx.lineTo(-this.radius + 4, -6);
                ctx.lineTo(0, -this.radius);
                ctx.lineTo(this.radius - 4, -6);
                ctx.lineTo(this.radius + 4, -4);
                ctx.lineTo(this.radius - 4, 0);
                ctx.closePath();
            } 
            else if (this.type === 'hunter') {
                // 五角形（矢印型）
                ctx.beginPath();
                ctx.moveTo(0, this.radius);
                ctx.lineTo(-this.radius, -this.radius/3);
                ctx.lineTo(-this.radius + 5, -this.radius);
                ctx.lineTo(this.radius - 5, -this.radius);
                ctx.lineTo(this.radius, -this.radius/3);
                ctx.closePath();
            }
            else if (this.type === 'boss') {
                // 巨大六角形コア
                ctx.lineWidth = 4;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3 + (frameCount * 0.015);
                    const px = Math.cos(angle) * this.radius;
                    const py = Math.sin(angle) * this.radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
                
                // ボス内部の明滅コア
                ctx.shadowColor = '#fff';
                ctx.strokeStyle = '#fff';
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, 8 + Math.sin(frameCount * 0.1) * 3, 0, Math.PI * 2);
            }

            ctx.stroke();
            ctx.fill();
            ctx.restore();
        }
    }

    // パワーアップアイテム
    class Item {
        constructor(x, y, kind) {
            this.x = x;
            this.y = y;
            this.kind = kind; // 'P' (Power), 'S' (Shield), 'B' (Bomb)
            this.radius = 12;
            this.speedY = 1.5;
            this.active = true;
            this.pulse = 0;
            
            if (kind === 'P') this.color = '#00f0ff'; // シアン
            else if (kind === 'S') this.color = '#a855f7'; // 紫
            else this.color = '#ff007f'; // ピンク
        }

        update() {
            this.y += this.speedY;
            this.pulse += 0.08;
            
            // X方向にもゆらゆら揺らす
            this.x += Math.sin(this.pulse) * 0.5;

            // 画面外で消去
            if (this.y > CANVAS_HEIGHT + 30) {
                this.active = false;
            }
        }

        draw() {
            ctx.save();
            
            // パルスによるグロー効果の動的変化
            const glowSize = 10 + Math.sin(this.pulse) * 5;
            ctx.shadowBlur = glowSize;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2.5;
            ctx.fillStyle = 'rgba(12, 12, 28, 0.8)';

            // 丸型ガラス調アイテムケース
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();

            // アイテムの文字を描画
            ctx.fillStyle = '#fff';
            ctx.font = `bold 10px ${varName('--font-heading', 'Space Grotesk')}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.kind, this.x, this.y);

            ctx.restore();
        }
    }

    // CSS変数をJSから動的に読むヘルパー
    function varName(cssVar, fallback) {
        return getComputedStyle(document.body).getPropertyValue(cssVar).trim() || fallback;
    }

    // パーティクル（爆発エフェクト）
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.radius = Math.random() * 3 + 1;
            
            // 放射状のランダムベクトル
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1.5;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            
            this.alpha = 1;
            this.decay = Math.random() * 0.02 + 0.015;
            this.active = true;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            // わずかな減速
            this.vx *= 0.98;
            this.vy *= 0.98;
            
            this.alpha -= this.decay;
            if (this.alpha <= 0) {
                this.active = false;
            }
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 背景の星（3層スクロール）
    class Star {
        constructor(initRandomY = false) {
            this.x = Math.random() * CANVAS_WIDTH;
            this.y = initRandomY ? Math.random() * CANVAS_HEIGHT : -10;
            // 速度に応じて3つの層に分ける
            this.speed = Math.random() * 1.5 + 0.5; // 0.5 ~ 2.0
            
            if (this.speed < 1.0) {
                this.radius = 0.8;
                this.color = 'rgba(255, 255, 255, 0.3)';
            } else if (this.speed < 1.6) {
                this.radius = 1.2;
                this.color = 'rgba(255, 255, 255, 0.6)';
            } else {
                this.radius = 1.6;
                this.color = 'rgba(0, 240, 255, 0.8)'; // ネオンブルーの高速な星
            }
        }

        update() {
            this.y += this.speed;
            if (this.y > CANVAS_HEIGHT) {
                this.y = -10;
                this.x = Math.random() * CANVAS_WIDTH;
            }
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.radius * 2, this.radius * 2);
        }
    }

    // --- エフェクト補助関数 ---

    function createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function tryDropItem(x, y) {
        const rand = Math.random();
        // 18% の確率でアイテム出現
        if (rand < 0.18) {
            let kind = 'P'; // パワー
            const kindRand = Math.random();
            if (kindRand < 0.45) kind = 'P';
            else if (kindRand < 0.85) kind = 'S'; // シールド
            else kind = 'B'; // ボム
            
            items.push(new Item(x, y, kind));
        }
    }

    // --- コアゲームシステム ---

    function initGame() {
        score = 0;
        frameCount = 0;
        lasers = [];
        enemyLasers = [];
        enemies = [];
        items = [];
        particles = [];
        bombWaves = [];

        // 星空初期化（画面全体に分散配置）
        stars = [];
        for (let i = 0; i < 60; i++) {
            stars.push(new Star(true));
        }

        player = new Player();
        updateHud();

        // スマホ判定
        isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouchDevice) {
            btnMobileBomb.classList.remove('hidden');
        } else {
            btnMobileBomb.classList.add('hidden');
        }
    }

    function updateHud() {
        // スコア表示（ゼロ埋め）
        hudScore.textContent = String(score).padStart(6, '0');
        
        // シールドゲージ更新
        const shieldPct = Math.max(0, (player.shield / player.maxShield) * 100);
        hudShieldBar.style.width = `${shieldPct}%`;
        
        // シールド量に応じてバーの色変更
        if (shieldPct < 30) {
            hudShieldBar.style.background = 'var(--neon-pink)';
            hudShieldBar.style.boxShadow = '0 0 10px var(--neon-pink-glow)';
        } else {
            hudShieldBar.style.background = 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))';
            hudShieldBar.style.boxShadow = '0 0 10px var(--neon-cyan-glow)';
        }

        // ボム表示
        hudBombs.forEach((bombIcon, idx) => {
            if (idx < player.bombs) {
                bombIcon.classList.add('active');
            } else {
                bombIcon.classList.remove('active');
            }
        });
    }

    // 衝突判定（サークル vs サークル）
    function checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (obj1.radius + obj2.radius);
    }

    // 敵スポーンアルゴリズム
    function spawnEnemies() {
        // フレームカウントに応じて敵の出現頻度と種類を変化
        const difficultyFactor = Math.min(3, 1 + frameCount / 3000); // 時間経過で難化
        
        // 雑魚敵 (scout) スポーン
        const spawnScoutRate = Math.max(25, 60 - Math.floor(difficultyFactor * 10));
        if (frameCount % spawnScoutRate === 0) {
            enemies.push(new Enemy('scout'));
        }

        // 高速敵 (fighter) スポーン（ある程度進んでから）
        if (frameCount > 400) {
            const spawnFighterRate = Math.max(50, 100 - Math.floor(difficultyFactor * 12));
            if (frameCount % spawnFighterRate === 0) {
                enemies.push(new Enemy('fighter'));
            }
        }

        // 追尾敵 (hunter) スポーン
        if (frameCount > 1000) {
            const spawnHunterRate = Math.max(80, 150 - Math.floor(difficultyFactor * 15));
            if (frameCount % spawnHunterRate === 0) {
                enemies.push(new Enemy('hunter'));
            }
        }

        // 中ボス (boss) スポーン（一定間隔）
        if (frameCount > 0 && frameCount % 1600 === 0) {
            enemies.push(new Enemy('boss'));
        }
    }

    // --- ゲーム主ループ ---

    function gameLoop() {
        if (!gameActive) return;

        frameCount++;
        
        // --- 描画クリア ---
        ctx.fillStyle = '#020208';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- 1. 背景の星の更新と描画 ---
        stars.forEach(star => {
            star.update();
            star.draw();
        });

        // 稀に新しい星を追加（流れ星などではなく通常の補填はStar内部で処理中）

        // --- 2. プレイヤーの更新と描画 ---
        player.update();
        player.draw();

        // --- 3. 射撃（レーザー）の更新と描画 ---
        lasers.forEach((laser, idx) => {
            laser.update();
            if (laser.active) {
                laser.draw();
            } else {
                lasers.splice(idx, 1);
            }
        });

        enemyLasers.forEach((elaser, idx) => {
            elaser.update();
            if (elaser.active) {
                elaser.draw();
            } else {
                enemyLasers.splice(idx, 1);
            }
        });

        // --- 4. 敵のスポーン・更新と描画 ---
        spawnEnemies();

        enemies.forEach((enemy, idx) => {
            enemy.update();
            if (enemy.active) {
                enemy.draw();
            } else {
                enemies.splice(idx, 1);
            }
        });

        // --- 5. アイテムの更新と描画 ---
        items.forEach((item, idx) => {
            item.update();
            if (item.active) {
                item.draw();
            } else {
                items.splice(idx, 1);
            }
        });

        // --- 6. パーティクルの更新と描画 ---
        particles.forEach((p, idx) => {
            p.update();
            if (p.active) {
                p.draw();
            } else {
                particles.splice(idx, 1);
            }
        });

        // --- 7. ボム衝撃波の更新と描画 ---
        bombWaves.forEach((wave, idx) => {
            wave.update();
            if (wave.active) {
                wave.draw();
            } else {
                bombWaves.splice(idx, 1);
            }
        });

        // --- 8. 衝突判定ロジック ---
        
        // A. プレイヤーの弾 vs 敵
        lasers.forEach((laser, lIdx) => {
            enemies.forEach((enemy) => {
                if (laser.active && enemy.active) {
                    // レーザーの当たり判定は点ではなく簡易長方形に近い円判定
                    const distObj = { x: laser.x, y: laser.y, radius: 4 };
                    if (checkCollision(distObj, enemy)) {
                        laser.active = false;
                        enemy.hit(1); // 1ダメージ
                    }
                }
            });
        });

        // B. 敵 vs プレイヤー（体当たり）
        enemies.forEach((enemy) => {
            if (enemy.active && isGameActiveAndVisible()) {
                if (checkCollision(enemy, player)) {
                    enemy.hit(2); // 体当たりで敵にもダメージ
                    player.takeDamage(20); // プレイヤーにダメージ
                }
            }
        });

        // C. 敵の弾 vs プレイヤー
        enemyLasers.forEach((elaser, eIdx) => {
            if (elaser.active && isGameActiveAndVisible()) {
                const distObj = { x: elaser.x, y: elaser.y, radius: 3 };
                if (checkCollision(distObj, player)) {
                    elaser.active = false;
                    player.takeDamage(12); // 被弾ダメージ
                }
            }
        });

        // D. プレイヤー vs アイテム（回収）
        items.forEach((item, iIdx) => {
            if (item.active) {
                // 回収判定は少し広めに（磁力演出的な意味合い）
                const collectObj = { x: player.x, y: player.y, radius: player.radius + 6 };
                if (checkCollision(item, collectObj)) {
                    item.active = false;
                    applyItem(item.kind);
                }
            }
        });

        requestAnimationFrame(gameLoop);
    }

    function isGameActiveAndVisible() {
        return gameActive && player && player.shield > 0;
    }

    // アイテム効果適用
    function applyItem(kind) {
        playSound('powerup');
        
        if (kind === 'P') {
            player.power = Math.min(3, player.power + 1);
            createExplosion(player.x, player.y, '#00f0ff', 10);
        } 
        else if (kind === 'S') {
            player.shield = Math.min(player.maxShield, player.shield + 30);
            createExplosion(player.x, player.y, '#a855f7', 10);
            updateHud();
        } 
        else if (kind === 'B') {
            player.bombs = Math.min(3, player.bombs + 1);
            createExplosion(player.x, player.y, '#ff007f', 10);
            updateHud();
        }
    }

    // --- ゲームオーバー・スタート等シーン遷移 ---

    function startGame() {
        // オーディオ初期化
        audioEnabled = audioEnableCheckbox.checked;
        if (audioEnabled) {
            initAudio();
            startBgm();
        }

        screenStart.classList.add('hidden');
        screenGameOver.classList.add('hidden');
        hudContainer.classList.remove('hidden');
        
        initGame();
        gameActive = true;
        
        requestAnimationFrame(gameLoop);
    }

    function gameOver() {
        gameActive = false;
        stopBgm();
        
        hudContainer.classList.add('hidden');
        screenGameOver.classList.remove('hidden');
        
        finalScoreVal.textContent = score;

        // ハイスコア処理
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('neon_striker_highscore', highScore);
            highScoreMsg.classList.remove('hidden');
        } else {
            highScoreMsg.classList.add('hidden');
        }
        
        if (isTouchDevice) {
            btnMobileBomb.classList.add('hidden');
        }
    }

    // --- キーボード・マウス・タッチ入力処理 ---

    // キーボード
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
            // ゲーム中のスクロール防止
            if (gameActive) e.preventDefault();
        }

        if (e.key in keys) keys[e.key] = true;
        if (e.code in keys) keys[e.code] = true;
        
        // ボムショートカット
        if ((e.key === 'b' || e.key === 'B' || e.code === 'KeyB') && gameActive && player) {
            player.useBomb();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key in keys) keys[e.key] = false;
        if (e.code in keys) keys[e.code] = false;
    });

    // マウスドラッグ / タッチ移動 (ポインター操作)
    let isPointerMoving = false;

    function handlePointerMove(clientX, clientY) {
        if (!gameActive || !player) return;
        
        const rect = canvas.getBoundingClientRect();
        
        // キャンバスの相対座標を算出
        const canvasX = (clientX - rect.left) * canvasScaleX;
        const canvasY = (clientY - rect.top) * canvasScaleY;

        // 指やマウスの下に自機を移動（少し指から上（Yオフセット-25px）にずらすことで機体が見やすくなる）
        player.x = canvasX;
        
        // タッチ操作の場合は少し上にずらし、マウスは直接移動
        if (isTouchDevice) {
            player.y = canvasY - 30;
        } else {
            player.y = canvasY;
        }
    }

    // マウスリスナー
    canvas.addEventListener('mousedown', (e) => {
        if (!gameActive) return;
        isPointerMoving = true;
        handlePointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPointerMoving) return;
        handlePointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
        isPointerMoving = false;
    });

    // マウスクリックでのボム発動（ドラッグ中でない単発クリック）
    canvas.addEventListener('click', (e) => {
        if (!gameActive || !player || isTouchDevice) return;
        // マウスクリックはボムとして機能させる（または左ドラッグ＋右クリックなどでボムなど）
        // シンプルにクリック＝ボム発動にするか、操作性のためにキーボード併用とするか
        // マウス派のためにクリック＝ボムに設定（ただし少し移動してから離しただけの時にも発動するのを防ぐため、移動量が極小の時のみ発動）
    });

    // タッチリスナー
    canvas.addEventListener('touchstart', (e) => {
        if (!gameActive) return;
        isTouchDevice = true;
        const touch = e.touches[0];
        handlePointerMove(touch.clientX, touch.clientY);
        
        // 常に自動射撃にする（タッチデバイスはスペースキーがないため）
        keys.Space = true;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (!gameActive) return;
        const touch = e.touches[0];
        handlePointerMove(touch.clientX, touch.clientY);
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        // タッチが離れても自動射撃は維持するか、切るか（プレイ性を考慮して維持、または操作中のみ自動発射）
        // タッチ操作時は常に Space = true にし、Update()内でタイマーCooldownごとに勝手に撃ち続ける仕様がベスト
        if (gameActive) {
            keys.Space = true; 
        }
    });

    // スマホ用ボムボタン
    btnMobileBomb.addEventListener('click', (e) => {
        e.stopPropagation(); // キャンバス等に伝搬させない
        if (gameActive && player) {
            player.useBomb();
        }
    });

    // タッチデバイスでのSpace自動射撃の有効化
    setInterval(() => {
        if (gameActive && isTouchDevice && player) {
            keys.Space = true;
        }
    }, 100);

    // --- ボタンイベント登録 ---
    btnStart.addEventListener('click', startGame);
    btnRestart.addEventListener('click', startGame);
});
