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
    MODES: {
        PVP: 'pvp',
        AI: 'ai'
    },
    PHASES: {
        PLACEMENT: 'placement',
        MOVEMENT: 'movement'
    },
    PLAYERS: {
        ONE: 1,
        TWO: 2
    }
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
        if (this.state[nodeIndex] !== null) {
            throw new Error('Node is already occupied.');
        }
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

    hasAvailableMoves(playerId) {
        const playerNodes = this.getPlayerNodes(playerId);
        return playerNodes.some(node =>
            GameConfig.ADJACENCY[node].some(adj => this.state[adj] === null)
        );
    }

    clone() {
        return new GameBoard(this.state);
    }
}

class AIStrategy {
    static calculateBestPlacement(board, aiId, humanId) {
        const emptyNodes = board.getEmptyNodes();

        for (const node of emptyNodes) {
            const testBoard = board.clone();
            testBoard.placePiece(node, aiId);
            if (testBoard.isWinner(aiId)) return node;
        }

        for (const node of emptyNodes) {
            const testBoard = board.clone();
            testBoard.placePiece(node, humanId);
            if (testBoard.isWinner(humanId)) return node;
        }

        let bestNodes = [];
        let minHumanThreats = Infinity;

        for (const aiMove of emptyNodes) {
            const testBoard = board.clone();
            testBoard.placePiece(aiMove, aiId);
            let maxThreatsForHuman = 0;

            const remainingEmpty = testBoard.getEmptyNodes();
            for (const humanMove of remainingEmpty) {
                const counterBoard = testBoard.clone();
                counterBoard.placePiece(humanMove, humanId);
                const threats = this._countWinningThreats(counterBoard, humanId);
                if (threats > maxThreatsForHuman) {
                    maxThreatsForHuman = threats;
                }
            }

            if (maxThreatsForHuman < minHumanThreats) {
                minHumanThreats = maxThreatsForHuman;
                bestNodes = [aiMove];
            } else if (maxThreatsForHuman === minHumanThreats) {
                bestNodes.push(aiMove);
            }
        }

        if (bestNodes.includes(0)) return 0;
        return bestNodes[Math.floor(Math.random() * bestNodes.length)];
    }

    static calculateBestMovement(board, aiId, humanId) {
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
            let givesHumanWin = false;

            const humanNodes = testBoard.getPlayerNodes(humanId);
            for (const hNode of humanNodes) {
                for (const adj of GameConfig.ADJACENCY[hNode]) {
                    if (testBoard.state[adj] === null) {
                        const counterBoard = testBoard.clone();
                        counterBoard.movePiece(hNode, adj, humanId);
                        if (counterBoard.isWinner(humanId)) {
                            givesHumanWin = true;
                        }
                    }
                    if (givesHumanWin) break;
                }
                if (givesHumanWin) break;
            }

            if (!givesHumanWin) safeMoves.push(aiMove);
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
            btnPvp: document.getElementById('btn-pvp'),
            btnAi: document.getElementById('btn-ai'),
            p1Input: document.getElementById('player1-name-input'),
            p2Input: document.getElementById('player2-name-input'),
            p2Group: document.getElementById('player2-name-group'),
            startBtn: document.getElementById('start-game-btn'),
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
            resetBtn: document.getElementById('resetBtn')
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

    bindMenuEvents(onModeSelect, onStart, onReturnToMenu, onRestart) {
        this.elements.btnPvp.addEventListener('click', () => onModeSelect(GameConfig.MODES.PVP));
        this.elements.btnAi.addEventListener('click', () => onModeSelect(GameConfig.MODES.AI));
        this.elements.p1Input.addEventListener('input', () => this.eventEmitter.emit('validateStart'));
        this.elements.p2Input.addEventListener('input', () => this.eventEmitter.emit('validateStart'));
        this.elements.startBtn.addEventListener('click', onStart);
        document.querySelector('.controls .action-btn:not(.primary)').addEventListener('click', onReturnToMenu);
        this.elements.resetBtn.addEventListener('click', onRestart);
    }

    updateMenuSelection(mode) {
        this.elements.btnPvp.classList.toggle('active', mode === GameConfig.MODES.PVP);
        this.elements.btnAi.classList.toggle('active', mode === GameConfig.MODES.AI);
        this.elements.p2Group.style.display = mode === GameConfig.MODES.AI ? 'none' : 'flex';
    }

    setStartButtonState(isValid) {
        this.elements.startBtn.disabled = !isValid;
    }

    getPlayerInputNames() {
        return {
            p1: this.elements.p1Input.value.trim(),
            p2: this.elements.p2Input.value.trim()
        };
    }

    showGameScreen(playerNames, mode) {
        this.elements.menuScreen.style.display = 'none';
        this.elements.gameScreen.style.display = 'flex';
        this.elements.p1NameDisplay.innerText = playerNames[GameConfig.PLAYERS.ONE];
        this.elements.p2NameDisplay.innerText = playerNames[GameConfig.PLAYERS.TWO];
        this.elements.roleLabel1.innerText = mode === GameConfig.MODES.PVP ? "Player 1" : "You";
        this.elements.roleLabel2.innerText = mode === GameConfig.MODES.PVP ? "Player 2" : "AI";
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

    highlightPlacementNodes(boardState) {
        boardState.forEach((player, idx) => {
            if (player === null) {
                this.nodeElements[idx].classList.add('can-place');
            }
        });
    }

    highlightMovablePieces(boardState, currentPlayer) {
        this.pieceElements.forEach((pieceData, nodeId) => {
            if (pieceData.player === currentPlayer) {
                const canMove = GameConfig.ADJACENCY[nodeId].some(adj => boardState[adj] === null);
                if (canMove) {
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
        this.elements.resetBtn.innerText = "Next Battle";
        this.elements.resetBtn.style.transform = "scale(1.1)";
        setTimeout(() => this.elements.resetBtn.style.transform = "scale(1)", 200);
    }

    resetRestartButton() {
        this.elements.resetBtn.innerText = "Restart Round";
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
        this.board = new GameBoard();
        this.mode = GameConfig.MODES.PVP;
        this.playerNames = {};
        this.scores = { [GameConfig.PLAYERS.ONE]: 0, [GameConfig.PLAYERS.TWO]: 0 };
        this.phase = GameConfig.PHASES.PLACEMENT;
        this.currentPlayer = GameConfig.PLAYERS.ONE;
        this.selectedPieceNode = null;
        this.gameActive = false;

        this._setupEvents();
    }

    _setupEvents() {
        this.eventEmitter.on('validateStart', () => this._validateMenuForm());
        this.eventEmitter.on('nodeClicked', (nodeIndex) => this._handleInteraction(nodeIndex, false));

        this.view.bindMenuEvents(
            (mode) => this._setMode(mode),
            () => this._startNewSession(),
            () => this._returnToMenu(),
            () => this._restartRound()
        );
    }

    init() {
        this._setMode(GameConfig.MODES.PVP);
        this._validateMenuForm();
    }

    _setMode(mode) {
        this.mode = mode;
        this.view.updateMenuSelection(mode);
        this._validateMenuForm();
    }

    _validateMenuForm() {
        const inputs = this.view.getPlayerInputNames();
        const isP1Valid = inputs.p1.length > 0;
        const isP2Valid = this.mode === GameConfig.MODES.AI ? true : inputs.p2.length > 0;
        this.view.setStartButtonState(isP1Valid && isP2Valid);
    }

    _startNewSession() {
        const inputs = this.view.getPlayerInputNames();
        this.playerNames[GameConfig.PLAYERS.ONE] = inputs.p1 || "First Player";
        this.playerNames[GameConfig.PLAYERS.TWO] = this.mode === GameConfig.MODES.AI ? "AI" : (inputs.p2 || "Second Player");
        
        this.scores = { [GameConfig.PLAYERS.ONE]: 0, [GameConfig.PLAYERS.TWO]: 0 };
        this.view.showGameScreen(this.playerNames, this.mode);
        this.view.updateScores(this.scores);
        this._restartRound();
    }

    _returnToMenu() {
        this.gameActive = false;
        this.view.showMenuScreen();
        this._validateMenuForm();
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
    }

    _handleInteraction(nodeIndex, isAiOrigin) {
        if (!this.gameActive) return;
        if (this.mode === GameConfig.MODES.AI && this.currentPlayer === GameConfig.PLAYERS.TWO && !isAiOrigin) return;

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

        if (this.selectedPieceNode !== null && this.currentPlayer === GameConfig.PLAYERS.ONE) {
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
        if (this.gameActive && this.mode === GameConfig.MODES.AI && this.currentPlayer === GameConfig.PLAYERS.TWO) {
            setTimeout(() => this._executeAIMove(), 800);
        }
    }

    _executeAIMove() {
        if (!this.gameActive || this.currentPlayer !== GameConfig.PLAYERS.TWO) return;

        if (this.phase === GameConfig.PHASES.PLACEMENT) {
            const bestNode = AIStrategy.calculateBestPlacement(this.board, GameConfig.PLAYERS.TWO, GameConfig.PLAYERS.ONE);
            this._handleInteraction(bestNode, true);
        } else if (this.phase === GameConfig.PHASES.MOVEMENT) {
            const bestMove = AIStrategy.calculateBestMovement(this.board, GameConfig.PLAYERS.TWO, GameConfig.PLAYERS.ONE);
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

        let victoryText = "";
        if (this.mode === GameConfig.MODES.AI) {
            victoryText = winnerId === GameConfig.PLAYERS.ONE 
                ? `GLORY! YOU WIN, ${this.playerNames[GameConfig.PLAYERS.ONE]}!` 
                : "AI WINS!";
        } else {
            victoryText = `VICTORY: ${this.playerNames[winnerId]}!`;
        }

        this.view.setStatus(victoryText);
        this.view.animateRestartButton();
    }

    _updateGameStateUI() {
        this.view.setActivePlayerPanel(this.currentPlayer, this.gameActive);
        this.view.togglePools(this.phase);
        this.view.clearBoardHighlights();

        if (this.gameActive) {
            this._updateStatusText();

            if (this.phase === GameConfig.PHASES.PLACEMENT) {
                if (this.currentPlayer === GameConfig.PLAYERS.ONE || this.mode === GameConfig.MODES.PVP) {
                    this.view.highlightPlacementNodes(this.board.state);
                }
            } else if (this.phase === GameConfig.PHASES.MOVEMENT) {
                if (this.selectedPieceNode === null) {
                    this.view.highlightMovablePieces(this.board.state, this.currentPlayer);
                } else {
                    this.view.highlightTargetNodes(this.selectedPieceNode, this.board.state);
                }
            }
        }
    }

    _updateStatusText() {
        const prefix = this.phase === GameConfig.PHASES.PLACEMENT ? "Placement: " : "Movement: ";
        
        if (this.phase === GameConfig.PHASES.MOVEMENT && this.selectedPieceNode !== null && this.currentPlayer === GameConfig.PLAYERS.ONE) {
            this.view.setStatus("Select destination");
            return;
        }
        
        if (this.mode === GameConfig.MODES.AI && this.currentPlayer === GameConfig.PLAYERS.TWO) {
            const actionText = this.phase === GameConfig.PHASES.PLACEMENT ? "AI's Turn..." : (this.selectedPieceNode !== null ? "AI is analyzing move..." : "AI's Turn...");
            this.view.setStatus(actionText);
            return;
        }
        
        this.view.setStatus(`${prefix}Turn: ${this.playerNames[this.currentPlayer]}`);
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