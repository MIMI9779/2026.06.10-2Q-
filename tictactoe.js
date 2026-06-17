/* ==========================================================================
   Neon Crush - Premium Game Logic & AI (Tic-Tac-Toe JavaScript)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 要素 ---
    const board = document.getElementById('game-board');
    const cells = document.querySelectorAll('.cell');
    const winningLine = document.getElementById('winning-line');
    
    const btnPvP = document.getElementById('btn-pvp');
    const btnPvE = document.getElementById('btn-pve');
    const aiDifficultyContainer = document.getElementById('ai-difficulty-container');
    const diffButtons = document.querySelectorAll('.diff-buttons button');
    
    const scoreP1Container = document.getElementById('score-p1-container');
    const scoreP2Container = document.getElementById('score-p2-container');
    const scoreP1Val = document.getElementById('score-p1');
    const scoreP2Val = document.getElementById('score-p2');
    const p1NameLabel = document.getElementById('p1-name');
    const p2NameLabel = document.getElementById('p2-name');
    
    const statusText = document.getElementById('status-text');
    const btnReset = document.getElementById('btn-reset');
    const btnClearScores = document.getElementById('btn-clear-scores');
    
    const resultModal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalBtnClose = document.getElementById('modal-btn-close');
    
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');

    // --- ゲーム状態変数 ---
    let gameState = ['', '', '', '', '', '', '', '', ''];
    let isGameActive = true;
    let currentPlayer = 'O'; // 'O' = Player 1, 'X' = Player 2 (or AI)
    let gameMode = 'pvp'; // 'pvp' または 'pve'
    let aiDifficulty = 'medium'; // 'easy', 'medium', 'impossible'
    
    let scores = {
        p1: 0,
        p2: 0 // pvp時のPlayer 2、またはpve時のAI
    };

    // 勝利条件インデックス
    const winningConditions = [
        { combo: [0, 1, 2], type: 'row', index: 0 },
        { combo: [3, 4, 5], type: 'row', index: 1 },
        { combo: [6, 7, 8], type: 'row', index: 2 },
        { combo: [0, 3, 6], type: 'col', index: 0 },
        { combo: [1, 4, 7], type: 'col', index: 1 },
        { combo: [2, 5, 8], type: 'col', index: 2 },
        { combo: [0, 4, 8], type: 'diag', index: 0 }, // メイン対角線
        { combo: [2, 4, 6], type: 'diag', index: 1 }  // サブ対角線
    ];

    // --- 紙吹雪（Confetti）エフェクト ---
    let confettiParticles = [];
    let confettiAnimationId = null;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class ConfettiParticle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height - canvas.height;
            this.size = Math.random() * 8 + 6;
            this.speedX = Math.random() * 4 - 2;
            this.speedY = Math.random() * 5 + 4;
            this.color = this.getRandomColor();
            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 4 - 2;
        }

        getRandomColor() {
            const colors = [
                '#00f0ff', // シアン
                '#ff007f', // ピンク
                '#8b5cf6', // パープル
                '#ec4899', // ローズ
                '#3b82f6', // ブルー
                '#10b981'  // グリーン
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;

            if (this.y > canvas.height) {
                this.y = -20;
                this.x = Math.random() * canvas.width;
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        }
    }

    function initConfetti() {
        confettiParticles = [];
        for (let i = 0; i < 120; i++) {
            confettiParticles.push(new ConfettiParticle());
        }
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiParticles.forEach(p => {
            p.update();
            p.draw();
        });
        confettiAnimationId = requestAnimationFrame(animateConfetti);
    }

    function startConfetti() {
        stopConfetti();
        initConfetti();
        animateConfetti();
    }

    function stopConfetti() {
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            confettiAnimationId = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // --- ゲーム操作関数 ---

    // プレイヤー切り替え時の表示更新
    function updateActivePlayerUI() {
        if (currentPlayer === 'O') {
            scoreP1Container.classList.add('active');
            scoreP2Container.classList.remove('active');
            statusText.textContent = `${gameMode === 'pvp' ? 'PLAYER 1 (O)' : 'あなた (O)'} の番です`;
        } else {
            scoreP1Container.classList.remove('active');
            scoreP2Container.classList.add('active');
            statusText.textContent = `${gameMode === 'pvp' ? 'PLAYER 2 (X)' : 'AI (X)'} の番です`;
        }
    }

    // マス（セル）の選択処理
    function handleCellClick(e) {
        const clickedCell = e.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (gameState[clickedCellIndex] !== '' || !isGameActive) {
            return;
        }

        // 人間の手番
        makeMove(clickedCellIndex);

        // 勝敗判定
        if (checkResult()) return;

        // AI対戦モードかつ、次のターンがAI（X）の場合
        if (gameMode === 'pve' && currentPlayer === 'X' && isGameActive) {
            disableBoard(true);
            setTimeout(() => {
                const aiMove = getBestMove();
                makeMove(aiMove);
                checkResult();
                disableBoard(false);
            }, 600); // リアルな思考遅延を演出
        }
    }

    // マスにマークを配置
    function makeMove(index) {
        gameState[index] = currentPlayer;
        cells[index].setAttribute('data-marker', currentPlayer);
        cells[index].disabled = true;
        
        // 音響的フィードバック（Web Audio APIでレトロフューチャーなSEを動的生成）
        playSynthesizedSound(currentPlayer === 'O' ? 523.25 : 659.25); // C5 または E5

        currentPlayer = currentPlayer === 'O' ? 'X' : 'O';
        updateActivePlayerUI();
    }

    // ボードの活性/非活性切り替え
    function disableBoard(disable) {
        cells.forEach(cell => {
            if (gameState[cell.getAttribute('data-index')] === '') {
                cell.disabled = disable;
            }
        });
    }

    // Web Audio APIによるネオンSE生成
    function playSynthesizedSound(freq) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
            // 周波数を少しスイープさせてフューチャー感を出す
            oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            // オーディオコンテキストの初期化に失敗した場合や制限されている場合はスルー
        }
    }

    // 勝利線（ライン）の描画処理
    function drawWinningLine(condition) {
        winningLine.classList.remove('hidden');
        
        // ボード基準の座標計算
        let top, left, width, rotate;

        if (condition.type === 'row') {
            top = `calc(100% / 6 + (100% / 3 * ${condition.index}))`;
            left = '4%';
            width = '92%';
            rotate = '0deg';
        } else if (condition.type === 'col') {
            // 列の場合は回転させて配置
            top = '4%';
            left = `calc(100% / 6 + (100% / 3 * ${condition.index}))`;
            width = '92%';
            rotate = '90deg';
            winningLine.style.transformOrigin = 'left center';
        } else if (condition.type === 'diag') {
            if (condition.index === 0) { // 0-4-8
                top = '12%';
                left = '12%';
                width = '108%';
                rotate = '45deg';
            } else { // 2-4-6
                top = '12%';
                left = '88%';
                width = '108%';
                rotate = '135deg';
            }
        }

        winningLine.style.top = top;
        winningLine.style.left = left;
        winningLine.style.width = width;
        winningLine.style.height = '6px';
        winningLine.style.transform = `rotate(${rotate}) scaleX(0)`;
        
        // リフローを強制してアニメーションをリセット＆開始
        void winningLine.offsetWidth;
        winningLine.style.transform = `rotate(${rotate}) scaleX(1)`;
    }

    // 勝敗・引き分け判定
    function checkResult() {
        let roundWon = false;
        let winningCombo = null;

        for (let i = 0; i < winningConditions.length; i++) {
            const winCondition = winningConditions[i];
            const a = gameState[winCondition.combo[0]];
            const b = gameState[winCondition.combo[1]];
            const c = gameState[winCondition.combo[2]];

            if (a === '' || b === '' || c === '') {
                continue;
            }
            if (a === b && b === c) {
                roundWon = true;
                winningCombo = winCondition;
                break;
            }
        }

        if (roundWon) {
            isGameActive = false;
            // 勝利したプレイヤーはcurrentPlayerの反対
            const winner = currentPlayer === 'O' ? 'X' : 'O';
            
            // 勝利ラインを描画
            drawWinningLine(winningCombo);

            // スコア更新
            if (winner === 'O') {
                scores.p1++;
                scoreP1Val.textContent = scores.p1;
                showModal('勝利！', gameMode === 'pvp' ? 'PLAYER 1 (O) の勝ちです！' : 'あなたの勝ちです！🎉');
                startConfetti();
            } else {
                scores.p2++;
                scoreP2Val.textContent = scores.p2;
                showModal('勝利！', gameMode === 'pvp' ? 'PLAYER 2 (X) の勝ちです！' : 'AI (X) の勝ちです！🤖');
            }

            statusText.textContent = `ゲーム終了！`;
            return true;
        }

        // 引き分け判定
        const roundDraw = !gameState.includes('');
        if (roundDraw) {
            isGameActive = false;
            showModal('引き分け', '素晴らしい接戦でした！🤝');
            statusText.textContent = `引き分け！`;
            return true;
        }

        return false;
    }

    // モーダル表示
    function showModal(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        setTimeout(() => {
            resultModal.classList.remove('hidden');
        }, 800); // 勝利線のアニメーションを見せるため少しディレイ
    }

    // ゲームリセット（盤面クリア）
    function resetGame() {
        gameState = ['', '', '', '', '', '', '', '', ''];
        isGameActive = true;
        currentPlayer = 'O';
        
        winningLine.classList.add('hidden');
        winningLine.style.transform = 'scaleX(0)';
        
        cells.forEach(cell => {
            cell.removeAttribute('data-marker');
            cell.disabled = false;
        });

        stopConfetti();
        updateActivePlayerUI();
    }

    // スコア初期化
    function clearScores() {
        scores.p1 = 0;
        scores.p2 = 0;
        scoreP1Val.textContent = '0';
        scoreP2Val.textContent = '0';
        resetGame();
    }

    // --- AI ロジック ---

    function getBestMove() {
        if (aiDifficulty === 'easy') {
            return getRandomMove();
        } else if (aiDifficulty === 'medium') {
            return getMediumMove();
        } else {
            return getImpossibleMove();
        }
    }

    // イージー: 空いているセルから完全にランダムで選ぶ
    function getRandomMove() {
        const availableMoves = [];
        gameState.forEach((val, idx) => {
            if (val === '') availableMoves.push(idx);
        });
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // ノーマル:
    // 1. 自分が次に勝てるマスがあればそこを選ぶ
    // 2. 相手が次に勝てるマスがあればそこをブロックする
    // 3. それ以外はランダム（または中心を優先）
    function getMediumMove() {
        // 1. AI (X) が勝てる手を探す
        for (let i = 0; i < winningConditions.length; i++) {
            const combo = winningConditions[i].combo;
            const vals = combo.map(idx => gameState[idx]);
            const xCount = vals.filter(v => v === 'X').length;
            const emptyCount = vals.filter(v => v === '').length;
            if (xCount === 2 && emptyCount === 1) {
                return combo[vals.indexOf('')];
            }
        }

        // 2. 相手 (O) の勝利をブロックする手を探す
        for (let i = 0; i < winningConditions.length; i++) {
            const combo = winningConditions[i].combo;
            const vals = combo.map(idx => gameState[idx]);
            const oCount = vals.filter(v => v === 'O').length;
            const emptyCount = vals.filter(v => v === '').length;
            if (oCount === 2 && emptyCount === 1) {
                return combo[vals.indexOf('')];
            }
        }

        // 3. 中央が空いていれば優先的にとる（50%の確率で賢さを演出）
        if (gameState[4] === '' && Math.random() > 0.4) {
            return 4;
        }

        // 4. それ以外はランダム
        return getRandomMove();
    }

    // インポッシブル: ミニマックスアルゴリズム（無敗のAI）
    function getImpossibleMove() {
        let bestScore = -Infinity;
        let move;

        for (let i = 0; i < 9; i++) {
            if (gameState[i] === '') {
                gameState[i] = 'X'; // AIの手を仮定
                let score = minimax(gameState, 0, false);
                gameState[i] = ''; // 元に戻す
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    // ミニマックス再帰評価
    function minimax(boardState, depth, isMaximizing) {
        const scoresTable = {
            X: 10,  // AIの勝ち
            O: -10, // プレイヤーの勝ち
            draw: 0
        };

        // 終端状態のチェック
        const winner = getWinner(boardState);
        if (winner) {
            return scoresTable[winner] - depth; // 早く勝てる（または遅く負ける）手を優先
        }
        if (!boardState.includes('')) {
            return scoresTable.draw;
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (boardState[i] === '') {
                    boardState[i] = 'X';
                    let score = minimax(boardState, depth + 1, false);
                    boardState[i] = '';
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (boardState[i] === '') {
                    boardState[i] = 'O';
                    let score = minimax(boardState, depth + 1, true);
                    boardState[i] = '';
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    // ミニマックス用簡易勝者判定
    function getWinner(boardState) {
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i].combo;
            if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
                return boardState[a];
            }
        }
        return null;
    }

    // --- イベントリスナー ---

    // セルクリック
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });

    // モード切り替え: PvP
    btnPvP.addEventListener('click', () => {
        gameMode = 'pvp';
        btnPvP.classList.add('active');
        btnPvP.setAttribute('aria-pressed', 'true');
        btnPvE.classList.remove('active');
        btnPvE.setAttribute('aria-pressed', 'false');
        aiDifficultyContainer.classList.add('hidden');
        
        p1NameLabel.textContent = 'PLAYER 1 (O)';
        p2NameLabel.textContent = 'PLAYER 2 (X)';
        
        clearScores();
    });

    // モード切り替え: PvE (AI対戦)
    btnPvE.addEventListener('click', () => {
        gameMode = 'pve';
        btnPvE.classList.add('active');
        btnPvE.setAttribute('aria-pressed', 'true');
        btnPvP.classList.remove('active');
        btnPvP.setAttribute('aria-pressed', 'false');
        aiDifficultyContainer.classList.remove('hidden');
        
        p1NameLabel.textContent = 'あなた (O)';
        p2NameLabel.textContent = 'AI (X)';
        
        clearScores();
    });

    // AI難易度切り替え
    diffButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            diffButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            aiDifficulty = btn.getAttribute('data-diff');
            resetGame();
        });
    });

    // 各種ボタン
    btnReset.addEventListener('click', resetGame);
    btnClearScores.addEventListener('click', clearScores);

    // モーダルを閉じる
    modalBtnClose.addEventListener('click', () => {
        resultModal.classList.add('hidden');
        resetGame();
    });

    // 初期UIセットアップ
    updateActivePlayerUI();
});
