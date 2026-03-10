// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
}

class Minesweeper {
    constructor() {
        // Game configuration
        this.difficulties = {
            beginner: { rows: 9, cols: 9, mines: 10 },
            intermediate: { rows: 16, cols: 16, mines: 40 },
            expert: { rows: 30, cols: 16, mines: 99 }
        };

        // Game state
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.currentDifficulty = null;
        this.gameOver = false;
        this.firstClick = true;
        this.startTime = null;
        this.timerInterval = null;
        this.mineCount = 0;
        this.revealedCount = 0;
        this.revealStreak = 0;

        // Audio context
        this.audioContext = null;
        this.soundEnabled = true;

        // Preload image assets
        this.mineImg = new Image();
        this.mineImg.src = 'assets/mine-opt.png';
        this.mineImgReady = false;
        this.mineImg.onload = () => { this.mineImgReady = true; };

        this.flagImg = new Image();
        this.flagImg.src = 'assets/flag-opt.png';
        this.flagImgReady = false;
        this.flagImg.onload = () => { this.flagImgReady = true; };

        // DOM Elements
        this.difficultyMenu = document.getElementById('difficulty-menu');
        this.gameInterface = document.getElementById('game-interface');
        this.gameBoard = document.getElementById('game-board');
        this.timer = document.getElementById('timer');
        this.flagCounter = document.getElementById('flag-counter');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.gameOverTitle = document.getElementById('game-over-title');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.finalTime = document.getElementById('final-time');
        this.finalDifficulty = document.getElementById('final-difficulty');
        this.finalCells = document.getElementById('final-cells');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.backMenuBtn = document.getElementById('back-menu-btn');
        this.confettiContainer = document.getElementById('confetti-container');
        this.soundToggle = document.getElementById('sound-toggle');

        // Load best times
        this.bestTimes = this.loadBestTimes();

        this.init();
    }

    init() {
        // Keyboard focus tracking
        this.focusRow = 0;
        this.focusCol = 0;

        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.getAttribute('data-difficulty');
                this.startNewGame(difficulty);
            });
        });

        // Game controls
        this.newGameBtn.addEventListener('click', () => {
            this.startNewGame(this.currentDifficulty);
        });

        this.playAgainBtn.addEventListener('click', () => {
            if (typeof GameAds !== 'undefined') GameAds.removeRewardButton('#game-over-modal');
            this.startNewGame(this.currentDifficulty);
        });

        this.backMenuBtn.addEventListener('click', () => {
            if (typeof GameAds !== 'undefined') GameAds.removeRewardButton('#game-over-modal');
            this.backToMenu();
        });

        // Share score button
        const shareScoreBtn = document.getElementById('share-score-btn');
        if (shareScoreBtn) {
            shareScoreBtn.addEventListener('click', () => this.shareScore());
        }

        // Sound toggle
        this.soundToggle.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.updateSoundButton();
        });

        this.updateSoundButton();

        // Global keyboard navigation
        document.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
    }

    handleGlobalKeyDown(e) {
        // R to restart (when game is active)
        if (e.key === 'r' || e.key === 'R') {
            if (this.currentDifficulty && !this.gameInterface.classList.contains('hidden')) {
                e.preventDefault();
                this.startNewGame(this.currentDifficulty);
                return;
            }
        }

        // Arrow key navigation within the board
        if (!this.currentDifficulty || this.gameInterface.classList.contains('hidden')) return;

        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (arrowKeys.includes(e.key)) {
            e.preventDefault();
            this.navigateCell(e.key);
            return;
        }

        // Space/Enter to reveal focused cell
        if (e.key === ' ' || e.key === 'Enter') {
            const active = document.activeElement;
            // Only handle if focused on a cell (not on buttons)
            if (active && active.classList.contains('cell')) return; // per-cell handler will catch it
            // If no cell is focused, focus the tracked cell
            e.preventDefault();
            this.clickCell(this.focusRow, this.focusCol);
            return;
        }

        // F to flag focused cell
        if (e.key === 'f' || e.key === 'F') {
            const active = document.activeElement;
            if (active && active.classList.contains('cell')) return; // per-cell handler will catch it
            e.preventDefault();
            this.toggleFlag(this.focusRow, this.focusCol);
            return;
        }
    }

    navigateCell(key) {
        let newRow = this.focusRow;
        let newCol = this.focusCol;

        switch (key) {
            case 'ArrowUp':    newRow = Math.max(0, newRow - 1); break;
            case 'ArrowDown':  newRow = Math.min(this.rows - 1, newRow + 1); break;
            case 'ArrowLeft':  newCol = Math.max(0, newCol - 1); break;
            case 'ArrowRight': newCol = Math.min(this.cols - 1, newCol + 1); break;
        }

        this.focusRow = newRow;
        this.focusCol = newCol;

        // Move DOM focus to the cell
        const cell = this.gameBoard.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
        if (cell) cell.focus();
    }

    updateSoundButton() {
        this.soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
    }

    startNewGame(difficulty) {
        this.clearSavedState();
        this.currentDifficulty = difficulty;
        const config = this.difficulties[difficulty];
        this.rows = config.rows;
        this.cols = config.cols;
        this.mineCount = config.mines;

        // Initialize board state
        this.board = [];
        this.revealed = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
        this.flagged = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
        this.gameOver = false;
        this.firstClick = true;
        this.revealedCount = 0;
        this.revealStreak = 0;
        this.startTime = null;
        this.clearTimer();

        // Set grid template
        this.gameBoard.style.gridTemplateColumns = `repeat(${this.cols}, 44px)`;
        this.gameBoard.style.gridTemplateRows = `repeat(${this.rows}, 44px)`;

        // Clear and rebuild board
        this.gameBoard.innerHTML = '';
        for (let i = 0; i < this.rows; i++) {
            const row = [];
            for (let j = 0; j < this.cols; j++) {
                row.push(-1); // -1 means no mine, 0-8 means adjacent mines
                const cell = this.createCell(i, j);
                this.gameBoard.appendChild(cell);
            }
            this.board.push(row);
        }

        // Reset keyboard focus
        this.focusRow = 0;
        this.focusCol = 0;

        // Update UI
        this.updateFlagCounter();
        this.gameOverModal.classList.add('hidden');
        this.difficultyMenu.classList.add('hidden');
        this.gameInterface.classList.remove('hidden');

        // Hide initial ad
        document.querySelector('.ad-top').style.display = 'none';
    }

    createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('data-row', row);
        cell.setAttribute('data-col', col);
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');

        // Left click
        cell.addEventListener('click', (e) => {
            e.preventDefault();
            this.clickCell(row, col);
        });

        // Right click
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.toggleFlag(row, col);
        });

        // Long press for mobile
        let pressTimer;
        cell.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                this.toggleFlag(row, col);
            }, 500);
        });

        cell.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });

        // Keyboard support
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.clickCell(row, col);
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggleFlag(row, col);
            }
        });

        return cell;
    }

    placeMines(excludeRow, excludeCol) {
        let minesPlaced = 0;
        while (minesPlaced < this.mineCount) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);

            if (
                this.board[row][col] === -1 &&
                !(row === excludeRow && col === excludeCol)
            ) {
                this.board[row][col] = -2; // -2 means mine
                minesPlaced++;
            }
        }

        // Calculate numbers
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.board[i][j] !== -2) {
                    this.board[i][j] = this.countAdjacentMines(i, j);
                }
            }
        }
    }

    countAdjacentMines(row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const r = row + i;
                const c = col + j;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    if (this.board[r][c] === -2) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    clickCell(row, col) {
        if (this.gameOver || this.revealed[row][col] || this.flagged[row][col]) {
            return;
        }

        this.revealStreak = 0;

        // First click - place mines
        if (this.firstClick) {
            this.startTime = Date.now();
            this.startTimer();
            this.placeMines(row, col);
            this.firstClick = false;
        }

        // Reveal cell
        this.revealCell(row, col);

        // Check game state
        this.checkGameState();

        // Save after each reveal (unless game ended)
        if (!this.gameOver) this.saveGameState();
    }

    revealCell(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return;
        }

        if (this.revealed[row][col] || this.flagged[row][col]) {
            return;
        }

        this.revealed[row][col] = true;
        this.revealedCount++;

        const cell = this.gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const mineValue = this.board[row][col];

        if (mineValue === -2) {
            // Mine hit
            cell.classList.add('opened', 'mine', 'revealed');
            this._setCellMine(cell);
            this.playSound('mine');
            if (typeof Haptic !== 'undefined') Haptic.heavy();
            this.shakeBoard(8);
            this.endGame(false);
            return;
        }

        cell.classList.add('opened');

        if (mineValue === 0) {
            cell.classList.add('empty');
            cell.textContent = '';

            // Flood fill - reveal adjacent cells
            setTimeout(() => {
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const r = row + i;
                        const c = col + j;
                        if (!this.revealed[r] || !this.revealed[r][c]) {
                            this.revealCell(r, c);
                        }
                    }
                }
            }, 50);
        } else {
            cell.classList.add(`num-${mineValue}`);
            cell.textContent = mineValue;
        }

        this.revealStreak++;
        if (this.revealStreak > 0 && this.revealStreak % 10 === 0) {
            const rect = cell.getBoundingClientRect();
            this.showFloatingText(`${this.revealStreak} CLEAR!`, rect.left + 20, rect.top, '#3498db');
        }

        this.playSound('click');
        if (typeof Haptic !== 'undefined') Haptic.light();
    }

    toggleFlag(row, col) {
        if (this.gameOver || this.revealed[row][col]) {
            return;
        }

        const cell = this.gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        this.flagged[row][col] = !this.flagged[row][col];

        if (this.flagged[row][col]) {
            cell.classList.add('flagged');
            this._setCellFlag(cell);
        } else {
            cell.classList.remove('flagged');
            cell.textContent = '';
        }

        this.updateFlagCounter();
        this.playSound('flag');

        // Save after each flag toggle
        if (!this.firstClick) this.saveGameState();
    }

    updateFlagCounter() {
        const flaggedCount = this.flagged.flat().filter(f => f).length;
        const remaining = this.mineCount - flaggedCount;
        this.flagCounter.textContent = remaining;
    }

    checkGameState() {
        const totalCells = this.rows * this.cols;
        const safeCells = totalCells - this.mineCount;

        if (this.revealedCount === safeCells) {
            // Win
            this.endGame(true);
        }
    }

    endGame(won) {
        this.gameOver = true;
        this.clearTimer();
        this.clearSavedState();
        const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);

        if (won) {
            this.playSound('win');
            if (typeof Haptic !== 'undefined') Haptic.success();
            this.createConfetti();
            this.saveTime(this.currentDifficulty, elapsedTime);
            // Track wins for daily streak
            const wins = (parseInt(localStorage.getItem('minesweeper_wins')) || 0) + 1;
            localStorage.setItem('minesweeper_wins', wins);
            if (typeof DailyStreak !== 'undefined') DailyStreak.report(wins);
            this.showGameOver(true, elapsedTime);
        } else {
            this.playSound('explode');
            this.revealAllMines();
            this.showGameOver(false, elapsedTime);
        }
    }

    revealAllMines() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.board[i][j] === -2 && !this.revealed[i][j]) {
                    const cell = this.gameBoard.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                    cell.classList.add('opened', 'mine');
                    this._setCellMine(cell);
                }
            }
        }
    }

    showGameOver(won, elapsedTime) {
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        if (won) {
            title.textContent = i18n.t('result.won');
            title.style.color = 'var(--success)';
            message.textContent = i18n.t('result.wonMessage');
        } else {
            title.textContent = i18n.t('result.lost');
            title.style.color = 'var(--danger)';
            message.textContent = i18n.t('result.lostMessage');
        }

        this.finalTime.textContent = elapsedTime;
        this.finalDifficulty.textContent = i18n.t(`difficulty.${this.currentDifficulty}`);
        this.finalCells.textContent = this.revealedCount;

        // Update leaderboard
        this.updateLeaderboard();

        // Show game over modal (with interstitial ad)
        if (typeof GameAds !== 'undefined') {
            GameAds.showInterstitial({ onComplete: () => {
                this.gameOverModal.classList.remove('hidden');
                document.querySelector('.ad-top').style.display = '';
                this._injectRewardButton(won);
            } });
        } else {
            this.gameOverModal.classList.remove('hidden');
            document.querySelector('.ad-top').style.display = '';
            this._injectRewardButton(won);
        }
    }

    updateLeaderboard() {
        const difficulties = ['beginner', 'intermediate', 'expert'];
        difficulties.forEach(difficulty => {
            const best = this.bestTimes[difficulty];
            const element = document.getElementById(`best-${difficulty}`);
            if (best) {
                const minutes = Math.floor(best / 60);
                const seconds = best % 60;
                element.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                element.textContent = '--:--';
            }
        });
    }

    saveTime(difficulty, time) {
        if (!this.bestTimes[difficulty] || time < this.bestTimes[difficulty]) {
            this.bestTimes[difficulty] = time;
            localStorage.setItem('minesweeper-best-times', JSON.stringify(this.bestTimes));
            this.showNewBest();
        }
    }

    showNewBest() {
        let el = document.getElementById('new-best-flash');
        if (!el) {
            el = document.createElement('div');
            el.id = 'new-best-flash';
            el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:32px;font-weight:800;color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.6);pointer-events:none;z-index:200;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s;opacity:0;white-space:nowrap;';
            document.body.appendChild(el);
        }
        el.textContent = '⏱️ NEW BEST!';
        el.style.transform = 'translate(-50%,-50%) scale(1.2)';
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transform = 'translate(-50%,-50%) scale(0.8)';
            el.style.opacity = '0';
        }, 1200);
    }

    loadBestTimes() {
        const saved = localStorage.getItem('minesweeper-best-times');
        return saved ? JSON.parse(saved) : {};
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.timer.textContent = elapsed;
        }, 100);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    createConfetti() {
        const colors = ['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.animation = `confettiFall ${2 + Math.random() * 1}s ease-in forwards`;
            confetti.style.animationDelay = Math.random() * 0.5 + 's';

            this.confettiContainer.appendChild(confetti);
        }

        setTimeout(() => {
            this.confettiContainer.innerHTML = '';
        }, 3500);
    }

    shakeBoard(intensity = 6) {
        this.gameBoard.style.animation = `ms-shake ${intensity > 4 ? 0.5 : 0.3}s ease`;
        setTimeout(() => { this.gameBoard.style.animation = ''; }, 500);
    }

    showFloatingText(text, x, y, color = '#2ecc71') {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `position:fixed;left:${x}px;top:${y}px;font-size:20px;font-weight:bold;color:${color};z-index:9999;pointer-events:none;text-shadow:0 0 8px ${color}40;opacity:1;transition:all 0.8s ease-out;`;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-40px)';
            el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 900);
    }

    _injectRewardButton(won) {
        // Only offer 2nd chance on loss
        if (won || typeof GameAds === 'undefined') return;
        GameAds.injectRewardButton({
            container: '#game-over-modal',
            label: 'Watch Ad for 2nd Chance',
            onReward: () => {
                // Hide game-over modal and resume play
                this.gameOverModal.classList.add('hidden');
                document.querySelector('.ad-top').style.display = 'none';
                this.gameOver = false;

                // Undo the mine that was hit — find the revealed mine cell and un-reveal it
                for (let i = 0; i < this.rows; i++) {
                    for (let j = 0; j < this.cols; j++) {
                        if (this.board[i][j] === -2 && this.revealed[i][j]) {
                            this.revealed[i][j] = false;
                            this.revealedCount--;
                            const cell = this.gameBoard.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                            if (cell) {
                                cell.classList.remove('opened', 'mine', 'revealed');
                                cell.textContent = '';
                            }
                        }
                    }
                }

                // Restart timer
                this.startTime = Date.now() - (parseInt(this.finalTime.textContent) * 1000);
                this.startTimer();
            }
        });
    }

    _createSpriteImg(img) {
        const el = document.createElement('img');
        el.src = img.src;
        el.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;display:block;';
        el.draggable = false;
        el.alt = '';
        return el;
    }

    _setCellMine(cell) {
        cell.textContent = '';
        if (this.mineImgReady) {
            cell.appendChild(this._createSpriteImg(this.mineImg));
        } else {
            cell.textContent = '💣';
        }
    }

    _setCellFlag(cell) {
        cell.textContent = '';
        if (this.flagImgReady) {
            cell.appendChild(this._createSpriteImg(this.flagImg));
        } else {
            cell.textContent = '🚩';
        }
    }

    shareScore() {
        const time = this.finalTime.textContent;
        const won = this.gameOverTitle.style.color === 'var(--success)';
        const text = won
            ? `I cleared Minesweeper in ${time}s! Can you beat me? \uD83D\uDCA3`
            : `I played Minesweeper! Can you beat me? \uD83D\uDCA3`;
        const url = 'https://dopabrain.com/minesweeper/';
        if (navigator.share) {
            navigator.share({ title: 'Minesweeper', text, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text + '\n' + url).then(() => {
                const btn = document.getElementById('share-score-btn');
                if (btn) { const orig = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = orig, 1500); }
            }).catch(() => {});
        }
        if (typeof gtag === 'function') gtag('event', 'share', { method: navigator.share ? 'native' : 'clipboard', app_name: 'minesweeper' });
    }

    backToMenu() {
        this.clearTimer();
        this.clearSavedState();
        this.gameInterface.classList.add('hidden');
        this.difficultyMenu.classList.remove('hidden');
        this.gameOverModal.classList.add('hidden');
        document.querySelector('.ad-top').style.display = '';
    }

    saveGameState() {
        if (this.gameOver || this.firstClick) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const state = {
            board: this.board,
            revealed: this.revealed,
            flagged: this.flagged,
            difficulty: this.currentDifficulty,
            timer: elapsed,
            gameStarted: true
        };
        try {
            localStorage.setItem('minesweeper_gameState', JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    loadGameState() {
        try {
            const raw = localStorage.getItem('minesweeper_gameState');
            if (!raw) return false;
            const state = JSON.parse(raw);
            if (!state || !state.gameStarted || !state.difficulty) return false;

            const config = this.difficulties[state.difficulty];
            if (!config) return false;

            // Restore game config
            this.currentDifficulty = state.difficulty;
            this.rows = config.rows;
            this.cols = config.cols;
            this.mineCount = config.mines;

            // Restore state arrays
            this.board = state.board;
            this.revealed = state.revealed;
            this.flagged = state.flagged;
            this.gameOver = false;
            this.firstClick = false;
            this.revealedCount = 0;
            this.revealStreak = 0;

            // Count revealed cells
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    if (this.revealed[i][j]) this.revealedCount++;
                }
            }

            // Restore timer — set startTime so elapsed reads correctly
            const savedElapsed = state.timer || 0;
            this.startTime = Date.now() - (savedElapsed * 1000);
            this.startTimer();

            // Build grid
            this.gameBoard.style.gridTemplateColumns = `repeat(${this.cols}, 44px)`;
            this.gameBoard.style.gridTemplateRows = `repeat(${this.rows}, 44px)`;
            this.gameBoard.innerHTML = '';

            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const cell = this.createCell(i, j);

                    if (this.revealed[i][j]) {
                        cell.classList.add('opened');
                        const val = this.board[i][j];
                        if (val === 0) {
                            cell.classList.add('empty');
                            cell.textContent = '';
                        } else {
                            cell.classList.add(`num-${val}`);
                            cell.textContent = val;
                        }
                    } else if (this.flagged[i][j]) {
                        cell.classList.add('flagged');
                        this._setCellFlag(cell);
                    }

                    this.gameBoard.appendChild(cell);
                }
            }

            // Reset keyboard focus
            this.focusRow = 0;
            this.focusCol = 0;

            // Update UI
            this.updateFlagCounter();
            this.gameOverModal.classList.add('hidden');
            this.difficultyMenu.classList.add('hidden');
            this.gameInterface.classList.remove('hidden');
            document.querySelector('.ad-top').style.display = 'none';

            return true;
        } catch (e) {
            console.warn('Failed to load game state:', e);
            this.clearSavedState();
            return false;
        }
    }

    clearSavedState() {
        localStorage.removeItem('minesweeper_gameState');
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) {
            return;
        }

        try {
            const context = this.audioContext;
            const now = context.currentTime;

            switch (type) {
                case 'click':
                    this.playTone(context, 800, 0.1, now, 0.1);
                    break;
                case 'flag':
                    this.playTone(context, 600, 0.1, now, 0.15);
                    break;
                case 'mine':
                    this.playTone(context, 200, 0.2, now, 0.2);
                    break;
                case 'explode':
                    this.playTone(context, 150, 0.15, now, 0.3);
                    this.playTone(context, 100, 0.1, now + 0.1, 0.2);
                    break;
                case 'win':
                    this.playTone(context, 800, 0.1, now, 0.1);
                    this.playTone(context, 1000, 0.1, now + 0.15, 0.1);
                    this.playTone(context, 1200, 0.1, now + 0.3, 0.15);
                    break;
            }
        } catch (e) {
            console.error('Sound error:', e);
        }
    }

    playTone(context, frequency, gain, startTime, duration) {
        try {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(gain, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        } catch (e) {
            console.error('Tone error:', e);
        }
    }

    initAudio() {
        if (!this.audioContext) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
            } catch (e) {
                console.warn('Web Audio API not supported');
            }
        }
    }
}

// Shake animation CSS
(function(){const s=document.createElement('style');s.textContent='@keyframes ms-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}';document.head.appendChild(s);})();

// Initialize game
let game;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof i18n !== 'undefined') {
            await i18n.loadTranslations(i18n.currentLang);
            i18n.updateUI();
        }
    } catch (e) {
        console.warn('i18n init failed:', e);
    }

    game = new Minesweeper();

    // Restore saved game if exists
    game.loadGameState();

    if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'minesweeper', bestScoreKey: 'minesweeper_wins', minTarget: 1 });
    if (typeof GameAds !== 'undefined') GameAds.init();

    // Hide app loader
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }

    // Init audio on user interaction
    document.addEventListener('click', () => {
        game.initAudio();
    }, { once: true });

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('ServiceWorker registration failed:', err);
        });
    }

    // GA4 event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', {
            page_title: 'Minesweeper Game',
            page_location: window.location.href
        });
    }
});
