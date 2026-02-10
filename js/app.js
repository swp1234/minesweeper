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

        // Audio context
        this.audioContext = null;
        this.soundEnabled = true;

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
            this.startNewGame(this.currentDifficulty);
        });

        this.backMenuBtn.addEventListener('click', () => {
            this.backToMenu();
        });

        // Sound toggle
        this.soundToggle.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.updateSoundButton();
        });

        this.updateSoundButton();
    }

    updateSoundButton() {
        this.soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
    }

    startNewGame(difficulty) {
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
            cell.textContent = '💣';
            this.playSound('mine');
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

        this.playSound('click');
    }

    toggleFlag(row, col) {
        if (this.gameOver || this.revealed[row][col]) {
            return;
        }

        const cell = this.gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        this.flagged[row][col] = !this.flagged[row][col];

        if (this.flagged[row][col]) {
            cell.classList.add('flagged');
            cell.textContent = '🚩';
        } else {
            cell.classList.remove('flagged');
            cell.textContent = '';
        }

        this.updateFlagCounter();
        this.playSound('flag');
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
        const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);

        if (won) {
            this.playSound('win');
            this.createConfetti();
            this.saveTime(this.currentDifficulty, elapsedTime);
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
                    cell.textContent = '💣';
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

        this.gameOverModal.classList.remove('hidden');

        // Show ad
        document.querySelector('.ad-top').style.display = '';
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
        }
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

    backToMenu() {
        this.clearTimer();
        this.gameInterface.classList.add('hidden');
        this.difficultyMenu.classList.remove('hidden');
        this.gameOverModal.classList.add('hidden');
        document.querySelector('.ad-top').style.display = '';
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
