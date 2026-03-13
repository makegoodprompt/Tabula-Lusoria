'use strict';

const GameConfig = Object.freeze({
    POSITIONS: {
        0: { x: 50, y: 50 },
        1: { x: 50, y: 10.5 },
        2: { x: 77.9, y: 22.1 },
        3: { x: 89.5, y: 50 },
        4: { x: 77.9, y: 77.9 },
        5: { x: 50, y: 89.5 },
        6: { x: 22.1, y: 77.9 },
        7: { x: 10.5, y: 50 },
        8: { x: 22.1, y: 22.1 }
    },
    ADJACENCY: {
        0: [1, 2, 3, 4, 5, 6, 7, 8],
        1: [0, 8, 2],
        2: [0, 1, 3],
        3: [0, 2, 4],
        4: [0, 3, 5],
        5: [0, 4, 6],
        6: [0, 5, 7],
        7: [0, 6, 8],
        8: [0, 7, 1]
    },
    WINNING_COMBINATIONS: [
        [1, 0, 5], [2, 0, 6], [3, 0, 7], [4, 0, 8],
        [1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6],
        [5, 6, 7], [6, 7, 8], [7, 8, 1], [8, 1, 2]
    ],
    PLAYER_TYPES: {
        HUMAN: 'human',
        AI: 'ai'
    },
    PHASES: {
        PLACEMENT: 'placement',
        MOVEMENT: 'movement'
    },
    PLAYERS: {
        ONE: 1,
        TWO: 2
    },
    ROSTER: [
        { id: 'caesar', name: 'Julius Caesar', img: 'https://placehold.co/150x150/2a1f18/d4af37?text=Caesar' },
        { id: 'cicero', name: 'Cicero', img: 'https://placehold.co/150x150/2a1f18/d4af37?text=Cicero' },
        { id: 'brutus', name: 'Brutus', img: 'https://placehold.co/150x150/2a1f18/d4af37?text=Brutus' },
        { id: 'antony', name: 'Mark Antony', img: 'https://placehold.co/150x150/2a1f18/d4af37?text=Antony' },
        { id: 'aurelius', name: 'Marcus Aurelius', img: 'https://placehold.co/150x150/2a1f18/d4af37?text=Aurelius' },
        { id: 'scipio', name: 'Scipio Africanus', img: 'https://placehold.co/150x150/2a1f18/d4af37?text=Scipio' }
    ]
});

class GameBoard {
    constructor(state = Array(9).fill(null)) {
        this.state = [...state];
    }

    getEmptyNodes() {
        return this.state
            .map((player, index) => (player === null ? index : null))
            .filter(index => index !== null);
    }

    getPlayerNodes(playerId) {
        return this.state
            .map((player, index) => (player === playerId ? index : null))
            .filter(index => index !== null);
    }

    placePiece(nodeIndex, playerId) {
        if (this.state[nodeIndex] !== null) throw new Error('Node is already occupied.');
        this.state[nodeIndex] = playerId;
    }

    movePiece(fromIndex, toIndex, playerId) {
        if (this.state[fromIndex] !== playerId || this.state[toIndex] !== null) {
            throw new Error('Invalid move operation.');
        }
        this.state[fromIndex] = null;
        this.state[toIndex] = playerId;
    }

    isWinner(playerId) {
        return GameConfig.WINNING_COMBINATIONS.some(combo =>
            combo.every(index => this.state[index] === playerId)
        );
    }

    getWinningCombination(playerId) {
        return GameConfig.WINNING_COMBINATIONS.find(combo =>
            combo.every(index => this.state[index] === playerId)
        ) || null;
    }

    clone() {
        return new GameBoard(this.state);
    }
}

class AIStrategy {
    static calculateBestPlacement(board, aiId, opponentId) {
        const emptyNodes = board.getEmptyNodes();

        for (const node of emptyNodes) {
            const testBoard = board.clone();
            testBoard.placePiece(node, aiId);
            if (testBoard.isWinner(aiId)) return node;
        }

        for (const node of emptyNodes) {
            const testBoard = board.clone();
            testBoard.placePiece(node, opponentId);
            if (testBoard.isWinner(opponentId)) return node;
        }

        let bestNodes = [];
        let minOpponentThreats = Infinity;

        for (const aiMove of emptyNodes) {
            const testBoard = board.clone();
            testBoard.placePiece(aiMove, aiId);
            let maxThreatsForOpponent = 0;

            const remainingEmpty = testBoard.getEmptyNodes();
            for (const opponentMove of remainingEmpty) {
                const counterBoard = testBoard.clone();
                counterBoard.placePiece(opponentMove, opponentId);
                const threats = this._countWinningThreats(counterBoard, opponentId);
                if (threats > maxThreatsForOpponent) {
                    maxThreatsForOpponent = threats;
                }
            }

            if (maxThreatsForOpponent < minOpponentThreats) {
                minOpponentThreats = maxThreatsForOpponent;
                bestNodes = [aiMove];
            } else if (maxThreatsForOpponent === minOpponentThreats) {
                bestNodes.push(aiMove);
            }
        }

        if (bestNodes.includes(0)) return 0;
        return bestNodes[Math.floor(Math.random() * bestNodes.length)];
    }

    static calculateBestMovement(board, aiId, opponentId) {
        const aiNodes = board.getPlayerNodes(aiId);
        const validMoves = [];

        aiNodes.forEach(node => {
            GameConfig.ADJACENCY[node].forEach(adjNode => {
                if (board.state[adjNode] === null) {
                    validMoves.push({ from: node, to: adjNode });
                }
            });
        });

        if (validMoves.length === 0) return null;

        for (const move of validMoves) {
            const testBoard = board.clone();
            testBoard.movePiece(move.from, move.to, aiId);
            if (testBoard.isWinner(aiId)) return move;
        }

        const safeMoves = [];

        for (const aiMove of validMoves) {
            const testBoard = board.clone();
            testBoard.movePiece(aiMove.from, aiMove.to, aiId);
            let givesOpponentWin = false;

            const opponentNodes = testBoard.getPlayerNodes(opponentId);
            for (const oNode of opponentNodes) {
                for (const adj of GameConfig.ADJACENCY[oNode]) {
                    if (testBoard.state[adj] === null) {
                        const counterBoard = testBoard.clone();
                        counterBoard.movePiece(oNode, adj, opponentId);
                        if (counterBoard.isWinner(opponentId)) {
                            givesOpponentWin = true;
                        }
                    }
                    if (givesOpponentWin) break;
                }
                if (givesOpponentWin) break;
            }

            if (!givesOpponentWin) safeMoves.push(aiMove);
        }

        if (safeMoves.length === 0) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        for (const move of safeMoves) {
            if (move.to === 0) return move;
        }

        return safeMoves[Math.floor(Math.random() * safeMoves.length)];
    }

    static _countWinningThreats(board, playerId) {
        let threats = 0;
        const emptyNodes = board.getEmptyNodes();
        for (const node of emptyNodes) {
            const testBoard = board.clone();
            testBoard.placePiece(node, playerId);
            if (testBoard.isWinner(playerId)) threats++;
        }
        return threats;
    }
}

class DOMView {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.elements = {
            menuScreen: document.getElementById('menu-screen'),
            gameScreen: document.getElementById('game-screen'),
            rosterGrid: document.getElementById('roster-grid'),
            p1SelectorBox: document.getElementById('p1-selector-box'),
            p2SelectorBox: document.getElementById('p2-selector-box'),
            p1MenuPortrait: document.getElementById('p1-menu-portrait'),
            p2MenuPortrait: document.getElementById('p2-menu-portrait'),
            p1MenuName: document.getElementById('p1-menu-name'),
            p2MenuName: document.getElementById('p2-menu-name'),
            startBtn: document.getElementById('start-game-btn'),
            
            gameP1Avatar: document.getElementById('game-p1-avatar'),
            gameP2Avatar: document.getElementById('game-p2-avatar'),
            p1NameDisplay: document.getElementById('player1-name-display'),
            p2NameDisplay: document.getElementById('player2-name-display'),
            roleLabel1: document.getElementById('role-label-1'),
            roleLabel2: document.getElementById('role-label-2'),
            score1: document.getElementById('score1'),
            score2: document.getElementById('score2'),
            
            boardEl: document.getElementById('board'),
            statusEl: document.getElementById('status'),
            panel1: document.getElementById('panel-player1'),
            panel2: document.getElementById('panel-player2'),
            pool1: document.getElementById('pool1'),
            pool2: document.getElementById('pool2'),
            btnMenu: document.getElementById('btn-menu'),
            btnRestart: document.getElementById('btn-restart')
        };
        
        this.pieceElements = new Map();
        this.nodeElements = [];
        this._initializeNodes();
    }

    _initializeNodes() {
        for (let i = 0; i < 9; i++) {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'node';
            nodeEl.style.left = GameConfig.POSITIONS[i].x + '%';
            nodeEl.style.top = GameConfig.POSITIONS[i].y + '%';
            nodeEl.addEventListener('click', () => this.eventEmitter.emit('nodeClicked', i));
            this.elements.boardEl.appendChild(nodeEl);
            this.nodeElements.push(nodeEl);
        }
    }

    bindMenuEvents() {
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.target.dataset.player);
                const type = e.target.dataset.type;
                this.eventEmitter.emit('playerTypeChanged', { player, type });
            });
        });

        this.elements.p1SelectorBox.addEventListener('click', () => this.eventEmitter.emit('focusSelector', GameConfig.PLAYERS.ONE));
        this.elements.p2SelectorBox.addEventListener('click', () => this.eventEmitter.emit('focusSelector', GameConfig.PLAYERS.TWO));
        this.elements.startBtn.addEventListener('click', () => this.eventEmitter.emit('startGame'));
        this.elements.btnMenu.addEventListener('click', () => this.eventEmitter.emit('returnToMenu'));
        this.elements.btnRestart.addEventListener('click', () => this.eventEmitter.emit('restartRound'));
    }

    renderRoster(roster, selections) {
        this.elements.rosterGrid.innerHTML = '';
        roster.forEach(char => {
            const img = document.createElement('img');
            img.src = char.img;
            img.className = 'roster-char';
            img.alt = char.name;
            
            if (selections[GameConfig.PLAYERS.ONE] === char.id) {
                img.classList.add('p1-selected');
            } else if (selections[GameConfig.PLAYERS.TWO] === char.id) {
                img.classList.add('p2-selected');
            }

            if (Object.values(selections).includes(char.id)) {
                img.classList.add('disabled');
            }

            img.addEventListener('click', () => this.eventEmitter.emit('characterSelected', char.id));
            this.elements.rosterGrid.appendChild(img);
        });
    }

    updateMenuUI(state) {
        document.querySelectorAll(`.toggle-btn[data-player="1"]`).forEach(b => b.classList.toggle('active', b.dataset.type === state.playerTypes[GameConfig.PLAYERS.ONE]));
        document.querySelectorAll(`.toggle-btn[data-player="2"]`).forEach(b => b.classList.toggle('active', b.dataset.type === state.playerTypes[GameConfig.PLAYERS.TWO]));

        this.elements.p1SelectorBox.classList.toggle('active-selector', state.selectingFor === GameConfig.PLAYERS.ONE);
        this.elements.p2SelectorBox.classList.toggle('active-selector', state.selectingFor === GameConfig.PLAYERS.TWO);

        const p1Char = GameConfig.ROSTER.find(c => c.id === state.selections[GameConfig.PLAYERS.ONE]);
        this.elements.p1MenuPortrait.src = p1Char ? p1Char.img : 'https://placehold.co/150x150/2a1f18/d4af37?text=?';
        this.elements.p1MenuName.innerText = p1Char ? p1Char.name : 'Select Player 1';

        const p2Char = GameConfig.ROSTER.find(c => c.id === state.selections[GameConfig.PLAYERS.TWO]);
        this.elements.p2MenuPortrait.src = p2Char ? p2Char.img : 'https://placehold.co/150x150/2a1f18/d4af37?text=?';
        this.elements.p2MenuName.innerText = p2Char ? p2Char.name : 'Select Player 2';

        this.elements.startBtn.disabled = !(state.selections[GameConfig.PLAYERS.ONE] && state.selections[GameConfig.PLAYERS.TWO]);
    }

    showGameScreen(state) {
        this.elements.menuScreen.style.display = 'none';
        this.elements.gameScreen.style.display = 'flex';

        const p1Char = GameConfig.ROSTER.find(c => c.id === state.selections[GameConfig.PLAYERS.ONE]);
        const p2Char = GameConfig.ROSTER.find(c => c.id === state.selections[GameConfig.PLAYERS.TWO]);

        this.elements.gameP1Avatar.src = p1Char.img;
        this.elements.p1NameDisplay.innerText = p1Char.name;
        this.elements.roleLabel1.innerText = state.playerTypes[GameConfig.PLAYERS.ONE].toUpperCase();

        this.elements.gameP2Avatar.src = p2Char.img;
        this.elements.p2NameDisplay.innerText = p2Char.name;
        this.elements.roleLabel2.innerText = state.playerTypes[GameConfig.PLAYERS.TWO].toUpperCase();
    }

    showMenuScreen() {
        this.elements.menuScreen.style.display = 'flex';
        this.elements.gameScreen.style.display = 'none';
    }

    updateScores(scores) {
        this.elements.score1.innerText = scores[GameConfig.PLAYERS.ONE];
        this.elements.score2.innerText = scores[GameConfig.PLAYERS.TWO];
    }

    setStatus(text) {
        this.elements.statusEl.innerText = text;
    }

    setActivePlayerPanel(playerId, gameActive) {
        this.elements.panel1.classList.toggle('active', gameActive && playerId === GameConfig.PLAYERS.ONE);
        this.elements.panel2.classList.toggle('active', gameActive && playerId === GameConfig.PLAYERS.TWO);
    }

    togglePools(phase) {
        const isPlacement = phase === GameConfig.PHASES.PLACEMENT;
        this.elements.pool1.classList.toggle('hidden', !isPlacement);
        this.elements.pool2.classList.toggle('hidden', !isPlacement);
    }

    clearBoardHighlights() {
        this.pieceElements.forEach(pieceData => pieceData.el.classList.remove('can-move', 'selected'));
        this.nodeElements.forEach(n => n.classList.remove('can-move-to', 'can-place'));
        this.pieceElements.forEach(pieceData => pieceData.el.onclick = null);
    }

    highlightPlacementNodes(boardState, isHumanTurn) {
        if (!isHumanTurn) return;
        boardState.forEach((player, idx) => {
            if (player === null) {
                this.nodeElements[idx].classList.add('can-place');
            }
        });
    }

    highlightMovablePieces(boardState, currentPlayer, isHumanTurn) {
        this.pieceElements.forEach((pieceData, nodeId) => {
            if (pieceData.player === currentPlayer) {
                const canMove = GameConfig.ADJACENCY[nodeId].some(adj => boardState[adj] === null);
                if (canMove && isHumanTurn) {
                    pieceData.el.classList.add('can-move');
                    pieceData.el.onclick = () => this.eventEmitter.emit('nodeClicked', nodeId);
                }
            }
        });
    }

    highlightTargetNodes(selectedNodeId, boardState) {
        GameConfig.ADJACENCY[selectedNodeId].forEach(adj => {
            if (boardState[adj] === null) {
                this.nodeElements[adj].classList.add('can-move-to');
            }
        });
    }

    highlightSelectedPiece(nodeId) {
        const piece = this.pieceElements.get(nodeId);
        if (piece) {
            piece.el.classList.add('selected');
        }
    }

    renderNewPiece(nodeId, playerId) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece player${playerId}`;
        pieceEl.style.left = GameConfig.POSITIONS[nodeId].x + '%';
        pieceEl.style.top = GameConfig.POSITIONS[nodeId].y + '%';
        this.elements.boardEl.appendChild(pieceEl);
        
        this.pieceElements.set(nodeId, { player: playerId, el: pieceEl });

        const poolEl = playerId === GameConfig.PLAYERS.ONE ? this.elements.pool1 : this.elements.pool2;
        const pieceInPool = poolEl.querySelector('.pool-piece:not(.placed)');
        if (pieceInPool) pieceInPool.classList.add('placed');
    }

    renderPieceMovement(fromId, toId) {
        const pieceData = this.pieceElements.get(fromId);
        if (pieceData) {
            pieceData.el.style.left = GameConfig.POSITIONS[toId].x + '%';
            pieceData.el.style.top = GameConfig.POSITIONS[toId].y + '%';
            this.pieceElements.set(toId, pieceData);
            this.pieceElements.delete(fromId);
        }
    }

    highlightWinningCombination(combo, winnerId) {
        combo.forEach(nodeId => {
            const pieceData = this.pieceElements.get(nodeId);
            if (pieceData && pieceData.player === winnerId) {
                pieceData.el.classList.add('winner');
            }
        });
    }

    clearPieces() {
        this.pieceElements.forEach(pieceData => pieceData.el.remove());
        this.pieceElements.clear();
        document.querySelectorAll('.pool-piece').forEach(p => p.classList.remove('placed'));
    }

    animateRestartButton() {
        this.elements.btnRestart.innerText = "Next Battle";
        this.elements.btnRestart.style.transform = "scale(1.1)";
        setTimeout(() => this.elements.btnRestart.style.transform = "scale(1)", 200);
    }

    resetRestartButton() {
        this.elements.btnRestart.innerText = "Restart Round";
    }
}

class EventEmitter {
    constructor() {
        this.events = {};
    }
    on(event, listener) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
    }
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }
}

class GameController {
    constructor(view, eventEmitter) {
        this.view = view;
        this.eventEmitter = eventEmitter;
        
        this.menuState = {
            playerTypes: { [GameConfig.PLAYERS.ONE]: GameConfig.PLAYER_TYPES.HUMAN, [GameConfig.PLAYERS.TWO]: GameConfig.PLAYER_TYPES.AI },
            selections: { [GameConfig.PLAYERS.ONE]: null, [GameConfig.PLAYERS.TWO]: null },
            selectingFor: GameConfig.PLAYERS.ONE
        };

        this.board = new GameBoard();
        this.scores = { [GameConfig.PLAYERS.ONE]: 0, [GameConfig.PLAYERS.TWO]: 0 };
        this.phase = GameConfig.PHASES.PLACEMENT;
        this.currentPlayer = GameConfig.PLAYERS.ONE;
        this.selectedPieceNode = null;
        this.gameActive = false;

        this._setupEvents();
    }

    init() {
        this.view.bindMenuEvents();
        this._renderMenu();
    }

    _setupEvents() {
        this.eventEmitter.on('playerTypeChanged', (data) => {
            this.menuState.playerTypes[data.player] = data.type;
            this._renderMenu();
        });

        this.eventEmitter.on('focusSelector', (playerId) => {
            this.menuState.selectingFor = playerId;
            this.menuState.selections[playerId] = null;
            this._renderMenu();
        });

        this.eventEmitter.on('characterSelected', (charId) => {
            if (Object.values(this.menuState.selections).includes(charId)) return;
            
            this.menuState.selections[this.menuState.selectingFor] = charId;
            
            if (this.menuState.selectingFor === GameConfig.PLAYERS.ONE && !this.menuState.selections[GameConfig.PLAYERS.TWO]) {
                this.menuState.selectingFor = GameConfig.PLAYERS.TWO;
            } else if (this.menuState.selectingFor === GameConfig.PLAYERS.TWO && !this.menuState.selections[GameConfig.PLAYERS.ONE]) {
                this.menuState.selectingFor = GameConfig.PLAYERS.ONE;
            }
            
            this._renderMenu();
        });

        this.eventEmitter.on('startGame', () => this._startNewSession());
        this.eventEmitter.on('returnToMenu', () => {
            this.gameActive = false;
            this.view.showMenuScreen();
            this._renderMenu();
        });
        this.eventEmitter.on('restartRound', () => this._restartRound());
        this.eventEmitter.on('nodeClicked', (nodeIndex) => this._handleInteraction(nodeIndex, false));
    }

    _renderMenu() {
        this.view.renderRoster(GameConfig.ROSTER, this.menuState.selections);
        this.view.updateMenuUI(this.menuState);
    }

    _startNewSession() {
        this.scores = { [GameConfig.PLAYERS.ONE]: 0, [GameConfig.PLAYERS.TWO]: 0 };
        this.view.showGameScreen(this.menuState);
        this.view.updateScores(this.scores);
        this._restartRound();
    }

    _restartRound() {
        this.board = new GameBoard();
        this.phase = GameConfig.PHASES.PLACEMENT;
        this.currentPlayer = GameConfig.PLAYERS.ONE;
        this.selectedPieceNode = null;
        this.gameActive = true;

        this.view.clearPieces();
        this.view.resetRestartButton();
        this._updateGameStateUI();
        this._triggerAITurnIfNeeded();
    }

    _handleInteraction(nodeIndex, isAiOrigin) {
        if (!this.gameActive) return;
        if (this.menuState.playerTypes[this.currentPlayer] === GameConfig.PLAYER_TYPES.AI && !isAiOrigin) return;

        if (this.phase === GameConfig.PHASES.PLACEMENT) {
            this._processPlacement(nodeIndex);
        } else if (this.phase === GameConfig.PHASES.MOVEMENT) {
            this._processMovement(nodeIndex);
        }
    }

    _processPlacement(nodeIndex) {
        if (this.board.state[nodeIndex] !== null) return;

        this.board.placePiece(nodeIndex, this.currentPlayer);
        this.view.renderNewPiece(nodeIndex, this.currentPlayer);

        if (this.board.isWinner(this.currentPlayer)) {
            this._resolveVictory(this.currentPlayer);
            return;
        }

        const p1Count = this.board.getPlayerNodes(GameConfig.PLAYERS.ONE).length;
        const p2Count = this.board.getPlayerNodes(GameConfig.PLAYERS.TWO).length;

        if (p1Count === 3 && p2Count === 3) {
            this.phase = GameConfig.PHASES.MOVEMENT;
            this.currentPlayer = GameConfig.PLAYERS.TWO;
            this._updateGameStateUI();
            this._triggerAITurnIfNeeded();
        } else {
            this._passTurn();
        }
    }

    _processMovement(nodeIndex) {
        if (this.board.state[nodeIndex] === this.currentPlayer) {
            this.selectedPieceNode = nodeIndex;
            this._updateGameStateUI();
            this.view.highlightSelectedPiece(nodeIndex);
            return;
        }

        if (this.board.state[nodeIndex] === null && this.selectedPieceNode !== null) {
            const isAdjacent = GameConfig.ADJACENCY[this.selectedPieceNode].includes(nodeIndex);
            if (isAdjacent) {
                this.board.movePiece(this.selectedPieceNode, nodeIndex, this.currentPlayer);
                this.view.renderPieceMovement(this.selectedPieceNode, nodeIndex);
                
                if (this.board.isWinner(this.currentPlayer)) {
                    this._resolveVictory(this.currentPlayer);
                    return;
                }

                this.selectedPieceNode = null;
                this._passTurn();
                return;
            }
        }

        if (this.selectedPieceNode !== null && this.menuState.playerTypes[this.currentPlayer] === GameConfig.PLAYER_TYPES.HUMAN) {
            this.selectedPieceNode = null;
            this._updateGameStateUI();
        }
    }

    _passTurn() {
        this.currentPlayer = this.currentPlayer === GameConfig.PLAYERS.ONE ? GameConfig.PLAYERS.TWO : GameConfig.PLAYERS.ONE;
        this._updateGameStateUI();
        this._triggerAITurnIfNeeded();
    }

    _triggerAITurnIfNeeded() {
        if (this.gameActive && this.menuState.playerTypes[this.currentPlayer] === GameConfig.PLAYER_TYPES.AI) {
            setTimeout(() => this._executeAIMove(), 800);
        }
    }

    _executeAIMove() {
        if (!this.gameActive || this.menuState.playerTypes[this.currentPlayer] !== GameConfig.PLAYER_TYPES.AI) return;

        const opponentId = this.currentPlayer === GameConfig.PLAYERS.ONE ? GameConfig.PLAYERS.TWO : GameConfig.PLAYERS.ONE;

        if (this.phase === GameConfig.PHASES.PLACEMENT) {
            const bestNode = AIStrategy.calculateBestPlacement(this.board, this.currentPlayer, opponentId);
            this._handleInteraction(bestNode, true);
        } else if (this.phase === GameConfig.PHASES.MOVEMENT) {
            const bestMove = AIStrategy.calculateBestMovement(this.board, this.currentPlayer, opponentId);
            if (bestMove) {
                this._handleInteraction(bestMove.from, true);
                setTimeout(() => {
                    if (this.gameActive) this._handleInteraction(bestMove.to, true);
                }, 600);
            }
        }
    }

    _resolveVictory(winnerId) {
        this.gameActive = false;
        this.scores[winnerId]++;
        this.view.updateScores(this.scores);
        this.view.clearBoardHighlights();
        this.view.setActivePlayerPanel(null, false);

        const winningCombo = this.board.getWinningCombination(winnerId);
        if (winningCombo) {
            this.view.highlightWinningCombination(winningCombo, winnerId);
        }

        const charId = this.menuState.selections[winnerId];
        const charName = GameConfig.ROSTER.find(c => c.id === charId).name;
        
        this.view.setStatus(`VICTORY: ${charName.toUpperCase()}!`);
        this.view.animateRestartButton();
    }

    _updateGameStateUI() {
        this.view.setActivePlayerPanel(this.currentPlayer, this.gameActive);
        this.view.togglePools(this.phase);
        this.view.clearBoardHighlights();

        if (this.gameActive) {
            this._updateStatusText();

            const isHumanTurn = this.menuState.playerTypes[this.currentPlayer] === GameConfig.PLAYER_TYPES.HUMAN;

            if (this.phase === GameConfig.PHASES.PLACEMENT) {
                this.view.highlightPlacementNodes(this.board.state, isHumanTurn);
            } else if (this.phase === GameConfig.PHASES.MOVEMENT) {
                if (this.selectedPieceNode === null) {
                    this.view.highlightMovablePieces(this.board.state, this.currentPlayer, isHumanTurn);
                } else {
                    this.view.highlightTargetNodes(this.selectedPieceNode, this.board.state);
                }
            }
        }
    }

    _updateStatusText() {
        const charId = this.menuState.selections[this.currentPlayer];
        const charName = GameConfig.ROSTER.find(c => c.id === charId).name;
        const isAI = this.menuState.playerTypes[this.currentPlayer] === GameConfig.PLAYER_TYPES.AI;
        
        if (this.phase === GameConfig.PHASES.MOVEMENT && this.selectedPieceNode !== null && !isAI) {
            this.view.setStatus("Select destination");
            return;
        }
        
        if (isAI) {
            const actionText = this.phase === GameConfig.PHASES.PLACEMENT ? `${charName} is thinking...` : (this.selectedPieceNode !== null ? `${charName} is moving...` : `${charName} is analyzing...`);
            this.view.setStatus(actionText);
            return;
        }
        
        const prefix = this.phase === GameConfig.PHASES.PLACEMENT ? "Placement: " : "Movement: ";
        this.view.setStatus(`${prefix}${charName}'s Turn`);
    }
}

class App {
    static start() {
        const eventEmitter = new EventEmitter();
        const view = new DOMView(eventEmitter);
        const game = new GameController(view, eventEmitter);
        game.init();
    }
}

document.addEventListener('DOMContentLoaded', () => App.start());