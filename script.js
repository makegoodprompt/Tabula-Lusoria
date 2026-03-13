'use strict';

const GameConfig = Object.freeze({
    POSITIONS: { 
        0:{x:50, y:50}, 1:{x:50, y:14}, 2:{x:75.5, y:24.5}, 3:{x:86, y:50}, 
        4:{x:75.5, y:75.5}, 5:{x:50, y:86}, 6:{x:24.5, y:75.5}, 7:{x:14, y:50}, 8:{x:24.5, y:24.5} 
    },
    ADJACENCY: { 0:[1,2,3,4,5,6,7,8], 1:[0,8,2], 2:[0,1,3], 3:[0,2,4], 4:[0,3,5], 5:[0,4,6], 6:[0,5,7], 7:[0,6,8], 8:[0,7,1] },
    WINNING_COMBINATIONS: [ [1,0,5], [2,0,6], [3,0,7], [4,0,8], [1,2,3], [2,3,4], [3,4,5], [4,5,6], [5,6,7], [6,7,8], [7,8,1], [8,1,2] ],
    PLAYER_TYPES: { HUMAN: 'human', AI: 'ai' },
    PHASES: { PLACEMENT: 'placement', MOVEMENT: 'movement' },
    PLAYERS: { ONE: 1, TWO: 2 },
    ROSTER: [
        { id: 'caesar', name: 'Julius Caesar', img: 'img/characters/caesar.jpg' },
        { id: 'augustus', name: 'Octavian', img: 'img/characters/augustus.jpg' },
        { id: 'cicero', name: 'Cicero', img: 'img/characters/cicero.jpg' },
        { id: 'aurelius', name: 'Marcus Aurelius', img: 'img/characters/aurelius.jpg' },
        { id: 'nero', name: 'Nero', img: 'img/characters/nero.jpg' },
        { id: 'constantine', name: 'Constantine', img: 'img/characters/constantine.jpg' },
        { id: 'pompey', name: 'Pompey', img: 'img/characters/pompey.jpg' },
        { id: 'scipio', name: 'Scipio', img: 'img/characters/scipio.jpg' },
        { id: 'brutus', name: 'Brutus', img: 'img/characters/brutus.jpg' }
    ]
});

class GameBoard {
    constructor(state = Array(9).fill(null)) { this.state = [...state]; }
    getEmptyNodes() { return this.state.map((p, i) => p === null ? i : null).filter(i => i !== null); }
    getPlayerNodes(id) { return this.state.map((p, i) => p === id ? i : null).filter(i => i !== null); }
    placePiece(i, id) { this.state[i] = id; }
    movePiece(f, t, id) { this.state[f] = null; this.state[t] = id; }
    isWinner(id) { return GameConfig.WINNING_COMBINATIONS.some(c => c.every(i => this.state[i] === id)); }
    getWinningCombination(id) { return GameConfig.WINNING_COMBINATIONS.find(c => c.every(i => this.state[i] === id)) || null; }
    clone() { return new GameBoard(this.state); }
}

class AIStrategy {
    static calculateBestPlacement(board, aiId, oId) {
        const empty = board.getEmptyNodes();
        for (const n of empty) { const t = board.clone(); t.placePiece(n, aiId); if (t.isWinner(aiId)) return n; }
        for (const n of empty) { const t = board.clone(); t.placePiece(n, oId); if (t.isWinner(oId)) return n; }
        return empty[Math.floor(Math.random() * empty.length)];
    }
    static calculateBestMovement(board, aiId, oId) {
        const aiNodes = board.getPlayerNodes(aiId);
        const moves = [];
        aiNodes.forEach(n => GameConfig.ADJACENCY[n].forEach(a => { if (board.state[a] === null) moves.push({f:n, t:a}); }));
        if (moves.length === 0) return null;
        for (const m of moves) { const t = board.clone(); t.movePiece(m.f, m.t, aiId); if (t.isWinner(aiId)) return m; }
        return moves[Math.floor(Math.random() * moves.length)];
    }
}

class DOMView {
    constructor(ee) {
        this.ee = ee;
        this.elements = {
            menuScreen: document.getElementById('menu-screen'),
            gameScreen: document.getElementById('game-screen'),
            rosterGrid: document.getElementById('roster-grid'),
            p1MenuPortrait: document.getElementById('p1-menu-portrait'),
            p2MenuPortrait: document.getElementById('p2-menu-portrait'),
            p1MenuName: document.getElementById('p1-menu-name'),
            p2MenuName: document.getElementById('p2-menu-name'),
            startBtn: document.getElementById('start-game-btn'),
            boardEl: document.getElementById('board'),
            statusEl: document.getElementById('status'),
            panel1: document.getElementById('panel-player1'),
            panel2: document.getElementById('panel-player2'),
            p1Avatar: document.getElementById('game-p1-avatar'),
            p2Avatar: document.getElementById('game-p2-avatar'),
            p1Score: document.getElementById('score1'),
            p2Score: document.getElementById('score2'),
            p1Name: document.getElementById('player1-name-display'),
            p2Name: document.getElementById('player2-name-display'),
            role1: document.getElementById('role-label-1'),
            role2: document.getElementById('role-label-2'),
            pool1: document.getElementById('pool1'),
            pool2: document.getElementById('pool2')
        };
        this.pieceElements = new Map();
        this.nodeElements = [];
        this._initNodes();
    }

    _initNodes() {
        for (let i = 0; i < 9; i++) {
            const n = document.createElement('div');
            n.className = 'node';
            n.style.left = GameConfig.POSITIONS[i].x + '%';
            n.style.top = GameConfig.POSITIONS[i].y + '%';
            n.onclick = () => this.ee.emit('nodeClicked', i);
            this.elements.boardEl.appendChild(n);
            this.nodeElements.push(n);
        }
    }

    bindMenu(onStart, onRestart, onMenu) {
        this.elements.startBtn.onclick = onStart;
        document.getElementById('btn-restart').onclick = onRestart;
        document.getElementById('btn-menu').onclick = onMenu;
        document.querySelectorAll('.toggle-btn').forEach(b => b.onclick = (e) => this.ee.emit('playerTypeChanged', {p: parseInt(e.target.dataset.player), t: e.target.dataset.type}));
    }

    renderRoster(roster, sel) {
        this.elements.rosterGrid.innerHTML = '';
        roster.forEach(c => {
            const img = document.createElement('img');
            img.src = c.img;
            img.className = `roster-char ${sel[1] === c.id ? 'p1-selected disabled' : ''} ${sel[2] === c.id ? 'p2-selected disabled' : ''}`;
            img.onclick = () => this.ee.emit('charSelected', c.id);
            this.elements.rosterGrid.appendChild(img);
        });
    }

    updateMenu(state) {
        document.querySelectorAll(`.toggle-btn[data-player="1"]`).forEach(b => b.classList.toggle('active', b.dataset.type === state.types[1]));
        document.querySelectorAll(`.toggle-btn[data-player="2"]`).forEach(b => b.classList.toggle('active', b.dataset.type === state.types[2]));

        document.getElementById('p1-selector-box').classList.toggle('active-selector', state.selecting === 1);
        document.getElementById('p2-selector-box').classList.toggle('active-selector', state.selecting === 2);

        const p1 = GameConfig.ROSTER.find(c => c.id === state.sel[1]);
        const p2 = GameConfig.ROSTER.find(c => c.id === state.sel[2]);

        this.elements.p1MenuPortrait.src = p1 ? p1.img : 'img/characters/unknown.jpg';
        this.elements.p2MenuPortrait.src = p2 ? p2.img : 'img/characters/unknown.jpg';
        this.elements.p1MenuName.innerText = p1 ? p1.name : 'Select P1';
        this.elements.p2MenuName.innerText = p2 ? p2.name : 'Select P2';
        
        this.elements.startBtn.disabled = !p1 || !p2;
    }

    showGame(state) {
        this.elements.menuScreen.classList.remove('active');
        this.elements.gameScreen.classList.add('active');

        const p1 = GameConfig.ROSTER.find(c => c.id === state.sel[1]);
        const p2 = GameConfig.ROSTER.find(c => c.id === state.sel[2]);
        this.elements.p1Avatar.src = p1.img;
        this.elements.p2Avatar.src = p2.img;
        this.elements.p1Name.innerText = p1.name;
        this.elements.p2Name.innerText = p2.name;
        this.elements.role1.innerText = state.types[1].toUpperCase();
        this.elements.role2.innerText = state.types[2].toUpperCase();
    }

    showMenuScreen() {
        this.elements.menuScreen.classList.add('active');
        this.elements.gameScreen.classList.remove('active');
    }

    updateScores(scores) {
        this.elements.p1Score.innerText = scores[1];
        this.elements.p2Score.innerText = scores[2];
    }

    setStatus(text) { this.elements.statusEl.innerText = text; }
    
    setActivePlayerPanel(cur, active) {
        this.elements.panel1.classList.toggle('active', active && cur === 1);
        this.elements.panel2.classList.toggle('active', active && cur === 2);
    }

    togglePools(phase) {
        this.elements.pool1.classList.toggle('hidden', phase !== 'placement');
        this.elements.pool2.classList.toggle('hidden', phase !== 'placement');
    }

    clearHighlights() {
        this.pieceElements.forEach(p => { p.el.classList.remove('can-move', 'selected'); p.el.onclick = null; });
        this.nodeElements.forEach(n => n.classList.remove('can-move-to', 'can-place'));
    }

    highlightPlacement(boardState, isHuman) {
        if (!isHuman) return;
        boardState.forEach((p, i) => { if (p === null) this.nodeElements[i].classList.add('can-place'); });
    }

    highlightMovable(boardState, cur, isHuman) {
        this.pieceElements.forEach((p, i) => {
            if (p.id === cur && GameConfig.ADJACENCY[i].some(a => boardState[a] === null) && isHuman) {
                p.el.classList.add('can-move');
                p.el.onclick = () => this.ee.emit('nodeClicked', i);
            }
        });
    }

    highlightTarget(nodeId, boardState) {
        GameConfig.ADJACENCY[nodeId].forEach(a => { if (boardState[a] === null) this.nodeElements[a].classList.add('can-move-to'); });
    }

    highlightSelected(id) { if (this.pieceElements.has(id)) this.pieceElements.get(id).el.classList.add('selected'); }

    renderPiece(i, id) {
        const p = document.createElement('div');
        p.className = `piece player${id}`;
        p.style.left = GameConfig.POSITIONS[i].x + '%';
        p.style.top = GameConfig.POSITIONS[i].y + '%';
        this.elements.boardEl.appendChild(p);
        this.pieceElements.set(i, {id, el: p});

        const pool = id === 1 ? this.elements.pool1 : this.elements.pool2;
        const poolPiece = pool.querySelector('.pool-piece:not(.placed)');
        if (poolPiece) poolPiece.classList.add('placed');
    }

    movePiece(f, t) {
        const p = this.pieceElements.get(f);
        p.el.style.left = GameConfig.POSITIONS[t].x + '%';
        p.el.style.top = GameConfig.POSITIONS[t].y + '%';
        this.pieceElements.set(t, p);
        this.pieceElements.delete(f);
    }

    highlightWin(combo, id) {
        combo.forEach(n => { if (this.pieceElements.has(n) && this.pieceElements.get(n).id === id) this.pieceElements.get(n).el.classList.add('winner'); });
    }

    clear() { this.pieceElements.forEach(p => p.el.remove()); this.pieceElements.clear(); document.querySelectorAll('.pool-piece').forEach(p => p.classList.remove('placed')); }
}

class EventEmitter {
    constructor() { this.evs = {}; }
    on(e, l) { if (!this.evs[e]) this.evs[e] = []; this.evs[e].push(l); }
    emit(e, ...a) { if (this.evs[e]) this.evs[e].forEach(l => l(...a)); }
}

class GameController {
    constructor(v, ee) {
        this.v = v; this.ee = ee;
        this.state = {
            types: {1: 'human', 2: 'ai'},
            sel: {1: null, 2: null},
            selecting: 1
        };
        this.board = new GameBoard();
        this.scores = {1:0, 2:0};
        this.active = false;
        this.cur = 1;
        this.phase = 'placement';
        this.selected = null;
        this._setup();
    }

    _setup() {
        this.ee.on('charSelected', (id) => {
            if (this.state.sel[1] === id || this.state.sel[2] === id) return;
            this.state.sel[this.state.selecting] = id;
            this.state.selecting = this.state.selecting === 1 ? 2 : 1;
            this.v.renderRoster(GameConfig.ROSTER, this.state.sel);
            this.v.updateMenu(this.state);
        });

        this.ee.on('focusSelector', (id) => {
            this.state.selecting = id;
            this.state.sel[id] = null;
            this.v.renderRoster(GameConfig.ROSTER, this.state.sel);
            this.v.updateMenu(this.state);
        });

        this.ee.on('playerTypeChanged', (d) => { this.state.types[d.p] = d.t; this.v.updateMenu(this.state); });
        this.ee.on('nodeClicked', (i) => this._handleMove(i, false));
        this.v.bindMenu(() => this._start(), () => this._reset(), () => this._toMenu());
    }

    init() { 
        this.v.renderRoster(GameConfig.ROSTER, this.state.sel);
        this.v.updateMenu(this.state); 
    }

    _start() { 
        this.scores = {1:0, 2:0}; 
        this.v.showGame(this.state); 
        this.v.updateScores(this.scores);
        this._reset(); 
    }

    _toMenu() { this.active = false; this.v.showMenuScreen(); }

    _reset() { 
        this.board = new GameBoard(); 
        this.cur = 1; 
        this.active = true; 
        this.phase = 'placement';
        this.selected = null;
        this.v.clear(); 
        document.getElementById('btn-restart').innerText = "Restart Round";
        this._update(); 
        this._checkAi();
    }

    _handleMove(i, isAi) {
        if (!this.active || (this.state.types[this.cur] === 'ai' && !isAi)) return;

        if (this.phase === 'placement') {
            if (this.board.state[i] !== null) return;
            this.board.placePiece(i, this.cur);
            this.v.renderPiece(i, this.cur);
            if (this.board.isWinner(this.cur)) { this._win(); return; }
            
            if (this.board.getPlayerNodes(1).length === 3 && this.board.getPlayerNodes(2).length === 3) {
                this.phase = 'movement';
            }
            this._step();

        } else {
            if (this.board.state[i] === this.cur) {
                this.selected = i;
                this._update();
                this.v.highlightSelected(i);
            } else if (this.board.state[i] === null && this.selected !== null && GameConfig.ADJACENCY[this.selected].includes(i)) {
                this.board.movePiece(this.selected, i, this.cur);
                this.v.movePiece(this.selected, i);
                if (this.board.isWinner(this.cur)) { this._win(); return; }
                this.selected = null;
                this._step();
            } else if (this.selected !== null && this.state.types[this.cur] === 'human') {
                this.selected = null;
                this._update();
            }
        }
    }

    _step() {
        this.cur = this.cur === 1 ? 2 : 1;
        this._update();
        this._checkAi();
    }

    _checkAi() {
        if (this.active && this.state.types[this.cur] === 'ai') {
            setTimeout(() => {
                if (!this.active) return;
                const oId = this.cur === 1 ? 2 : 1;
                if (this.phase === 'placement') {
                    this._handleMove(AIStrategy.calculateBestPlacement(this.board, this.cur, oId), true);
                } else {
                    const m = AIStrategy.calculateBestMovement(this.board, this.cur, oId);
                    if (m) {
                        this._handleMove(m.f, true);
                        setTimeout(() => { if (this.active) this._handleMove(m.t, true); }, 600);
                    }
                }
            }, 800);
        }
    }

    _win() {
        this.active = false; 
        this.scores[this.cur]++; 
        this.v.updateScores(this.scores);
        this.v.clearHighlights();
        this.v.setActivePlayerPanel(null, false);
        this.v.highlightWin(this.board.getWinningCombination(this.cur), this.cur);
        this.v.setStatus(`VICTORY: ${GameConfig.ROSTER.find(c => c.id === this.state.sel[this.cur]).name.toUpperCase()}!`);
        this.v.animateRestartButton();
    }

    _update() {
        this.v.setActivePlayerPanel(this.cur, this.active);
        this.v.togglePools(this.phase);
        this.v.clearHighlights();
        if (!this.active) return;

        const char = GameConfig.ROSTER.find(c => c.id === this.state.sel[this.cur]).name;
        const isAi = this.state.types[this.cur] === 'ai';
        const isHum = !isAi;

        let txt = this.phase === 'placement' ? `Placement: ${char}'s Turn` : `Movement: ${char}'s Turn`;
        if (isAi) txt = this.phase === 'placement' ? `${char} is thinking...` : (this.selected !== null ? `${char} is moving...` : `${char} is analyzing...`);
        else if (this.phase === 'movement' && this.selected !== null) txt = "Select destination";
        
        this.v.setStatus(txt);

        if (this.phase === 'placement') this.v.highlightPlacement(this.board.state, isHum);
        else if (this.selected === null) this.v.highlightMovable(this.board.state, this.cur, isHum);
        else this.v.highlightTarget(this.selected, this.board.state);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const ee = new EventEmitter();
    const v = new DOMView(ee);
    const g = new GameController(v, ee);
    g.init();
});