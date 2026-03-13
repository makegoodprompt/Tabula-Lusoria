let gameMode = 'pvp'; // 'pvp' or 'ai'
let playerNames = { 1: "First Player", 2: "Second Player" };

const p1Input = document.getElementById('player1-name-input');
const p2Input = document.getElementById('player2-name-input');
const startBtn = document.getElementById('start-game-btn');

function setMode(mode) {
    gameMode = mode;
    document.getElementById('btn-pvp').classList.remove('active');
    document.getElementById('btn-ai').classList.remove('active');
    document.getElementById(mode === 'pvp' ? 'btn-pvp' : 'btn-ai').classList.add('active');
    
    const p2Group = document.getElementById('player2-name-group');
    if (mode === 'ai') {
        p2Group.style.display = 'none';
    } else {
        p2Group.style.display = 'flex';
    }
    validateStart();
}

function validateStart() {
    let p1Valid = p1Input.value.trim().length > 0;
    let p2Valid = gameMode === 'ai' ? true : p2Input.value.trim().length > 0;
    startBtn.disabled = !(p1Valid && p2Valid);
}

function startGame() {
    playerNames[1] = p1Input.value.trim() || "First Player";
    if (gameMode === 'ai') {
        playerNames[2] = "AI";
    } else {
        playerNames[2] = p2Input.value.trim() || "Second Player";
    }

    document.getElementById('player1-name-display').innerText = playerNames[1];
    document.getElementById('player2-name-display').innerText = playerNames[2];

    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    
    document.getElementById('role-label-1').innerText = gameMode === 'pvp' ? "Player 1" : "You";
    document.getElementById('role-label-2').innerText = gameMode === 'pvp' ? "Player 2" : "AI";

    scores = {1: 0, 2: 0}; 
    updateScores(); 
    resetBoard();
}

function goToMenu() {
    document.getElementById('menu-screen').style.display = 'flex';
    document.getElementById('game-screen').style.display = 'none';
    validateStart();
}

// --- GAME LOGIC ---
const POSITIONS = { 
    0:{x:50, y:50}, 
    1:{x:50, y:10.5},   // Top
    2:{x:77.9, y:22.1}, // Top-Right
    3:{x:89.5, y:50},   // Right
    4:{x:77.9, y:77.9}, // Bottom-Right
    5:{x:50, y:89.5},   // Bottom
    6:{x:22.1, y:77.9}, // Bottom-Left
    7:{x:10.5, y:50},   // Left
    8:{x:22.1, y:22.1}  // Top-Left
};

const ADJACENCY = { 
    0:[1,2,3,4,5,6,7,8], 1:[0,8,2], 2:[0,1,3], 3:[0,2,4], 
    4:[0,3,5], 5:[0,4,6], 6:[0,5,7], 7:[0,6,8], 8:[0,7,1] 
};

const WINNING_COMBINATIONS = [ 
    [1,0,5], [2,0,6], [3,0,7], [4,0,8], 
    [1,2,3], [2,3,4], [3,4,5], [4,5,6], 
    [5,6,7], [6,7,8], [7,8,1], [8,1,2] 
];

let phase = 'placement'; 
let currentPlayer = 1; 
let board = Array(9).fill(null);
let scores = {1: 0, 2: 0};
let selectedPieceNode = null;
let gameActive = true;
let pieceElements = []; 

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const panel1 = document.getElementById('panel-player1');
const panel2 = document.getElementById('panel-player2');

function initBoard() {
    for (let i = 0; i < 9; i++) {
        let nodeEl = document.createElement('div');
        nodeEl.className = 'node';
        nodeEl.style.left = POSITIONS[i].x + '%';
        nodeEl.style.top = POSITIONS[i].y + '%';
        nodeEl.addEventListener('click', () => handleNodeClick(i, false));
        boardEl.appendChild(nodeEl);
    }
}

function getStatusTextPrefix() {
    return phase === 'placement' ? "Placement: " : "Movement: ";
}

function updateUI() {
    if (gameActive) {
        if (currentPlayer === 1) { 
            panel1.classList.add('active'); 
            panel2.classList.remove('active'); 
        } else { 
            panel1.classList.remove('active'); 
            panel2.classList.add('active'); 
        }
    } else { 
        panel1.classList.remove('active'); 
        panel2.classList.remove('active'); 
    }

    if (phase === 'placement') { 
        document.getElementById('pool1').classList.remove('hidden'); 
        document.getElementById('pool2').classList.remove('hidden'); 
    } else { 
        document.getElementById('pool1').classList.add('hidden'); 
        document.getElementById('pool2').classList.add('hidden'); 
    }

    clearBoardHighlights();

    if (gameActive) {
        if (phase === 'placement') {
            highlightPlacementNodes();
        } else if (phase === 'movement') {
            if (selectedPieceNode === null) highlightMovablePieces();
            else highlightTargetNodes();
        }
    }
}

function clearBoardHighlights() {
    pieceElements.forEach(p => p.el.classList.remove('can-move'));
    document.querySelectorAll('.node').forEach(n => {
        n.classList.remove('can-move-to');
        n.classList.remove('can-place');
    });
}

function highlightPlacementNodes() {
    if (currentPlayer === 1 || gameMode === 'pvp') {
        const nodes = document.querySelectorAll('.node');
        nodes.forEach((n, idx) => {
            if (board[idx] === null) {
                n.classList.add('can-place');
            }
        });
    }
}

function highlightMovablePieces() {
    pieceElements.forEach(p => {
        if (p.player === currentPlayer) {
            let canMove = ADJACENCY[p.node].some(nodeIdx => board[nodeIdx] === null);
            if (canMove && (currentPlayer === 1 || gameMode === 'pvp')) { 
                p.el.classList.add('can-move');
                p.el.onclick = () => handleNodeClick(p.node, false);
            } else { p.el.onclick = null; }
        } else { 
            p.el.classList.remove('can-move'); 
            p.el.onclick = null; 
        }
    });
}

function highlightTargetNodes() {
    ADJACENCY[selectedPieceNode].forEach(nodeIdx => {
        if (board[nodeIdx] === null) {
            const nodeEl = boardEl.querySelector(`.node[style*="left: ${POSITIONS[nodeIdx].x}%"][style*="top: ${POSITIONS[nodeIdx].y}%"]`);
            if (nodeEl) nodeEl.classList.add('can-move-to');
        }
    });
}

function handleNodeClick(i, isAiMove) {
    if (!gameActive) return;
    if (gameMode === 'ai' && currentPlayer === 2 && !isAiMove) return;

    if (phase === 'placement') {
        if (board[i] !== null) return; 
        
        placePiece(i, currentPlayer);
        if (checkWin(currentPlayer)) { endGame(currentPlayer); return; }
        
        const wCount = pieceElements.filter(p => p.player === 1).length;
        const bCount = pieceElements.filter(p => p.player === 2).length;

        if (wCount === 3 && bCount === 3) {
            phase = 'movement'; currentPlayer = 2; 
            statusEl.innerText = gameMode === 'ai' ? "Movement: AI Starts" : `Movement: ${playerNames[2]} Starts`;
            updateUI();
            if (gameMode === 'ai') setTimeout(makeAiMove, 800);
        } else {
            switchTurn();
        }

    } else if (phase === 'movement') {
        if (board[i] === currentPlayer) {
            selectedPieceNode = i; highlightSelectedPiece(i);
            statusEl.innerText = currentPlayer === 1 ? "Select destination" : "AI is analyzing move...";
            updateUI();
        } else if (board[i] === null && selectedPieceNode !== null) {
            if (ADJACENCY[selectedPieceNode].includes(i)) {
                movePiece(selectedPieceNode, i);
                if (checkWin(currentPlayer)) { endGame(currentPlayer); return; }
                
                selectedPieceNode = null; clearHighlightsOfSelection(); switchTurn();
            }
        } else if (selectedPieceNode !== null && !isAiMove) {
            selectedPieceNode = null; clearHighlightsOfSelection();
            statusEl.innerText = currentPlayer === 1 ? "Select your piece" : "AI's Turn...";
            updateUI();
        }
    }
}

function switchTurn() { 
    currentPlayer = currentPlayer === 1 ? 2 : 1; 
    statusEl.innerText = getStatusTextPrefix() + `Turn: ${playerNames[currentPlayer]}`;
    updateUI();
    
    if (gameMode === 'ai' && currentPlayer === 2) setTimeout(makeAiMove, 800);
}

function placePiece(nodeIdx, player) {
    board[nodeIdx] = player;
    let pieceEl = document.createElement('div');
    pieceEl.className = `piece player${player}`;
    pieceEl.style.left = POSITIONS[nodeIdx].x + '%';
    pieceEl.style.top = POSITIONS[nodeIdx].y + '%';
    boardEl.appendChild(pieceEl);
    pieceElements.push({ player: player, node: nodeIdx, el: pieceEl });
    
    const poolEl = player === 1 ? document.getElementById('pool1') : document.getElementById('pool2');
    const pieceInPool = poolEl.querySelector('.pool-piece:not(.placed)');
    if (pieceInPool) pieceInPool.classList.add('placed');
}

function movePiece(fromIdx, toIdx) {
    board[fromIdx] = null; board[toIdx] = currentPlayer;
    let pieceObj = pieceElements.find(p => p.node === fromIdx);
    if (pieceObj) {
        pieceObj.node = toIdx;
        pieceObj.el.style.left = POSITIONS[toIdx].x + '%';
        pieceObj.el.style.top = POSITIONS[toIdx].y + '%';
    }
}

function highlightSelectedPiece(idx) {
    clearHighlightsOfSelection();
    let pieceObj = pieceElements.find(p => p.node === idx);
    if (pieceObj) pieceObj.el.classList.add('selected');
}

function clearHighlightsOfSelection() { 
    pieceElements.forEach(p => p.el.classList.remove('selected')); 
}

function checkWin(player) {
    return WINNING_COMBINATIONS.some(combo => {
        if (combo.every(index => board[index] === player)) return combo;
    });
}

function endGame(winner) {
    gameActive = false; 
    scores[winner]++; 
    updateScores(); 
    updateUI();
    
    const winningCombo = WINNING_COMBINATIONS.find(combo => combo.every(index => board[index] === winner));
    if (winningCombo) {
        pieceElements.forEach(piece => {
            if (winningCombo.includes(piece.node) && piece.player === winner) piece.el.classList.add('winner');
        });
    }
    
    let winText = gameMode === 'ai' 
        ? (winner === 1 ? `🎉 GLORY! YOU WIN, ${playerNames[1]}!` : "☠️ AI WINS!") 
        : `🎉 VICTORY: ${playerNames[winner]}!`;
    
    statusEl.innerText = winText;
    
    const rBtn = document.getElementById('resetBtn');
    rBtn.innerText = "Next Battle";
    rBtn.style.transform = "scale(1.1)";
    setTimeout(() => rBtn.style.transform = "scale(1)", 200);
}

function updateScores() { 
    document.getElementById('score1').innerText = scores[1]; 
    document.getElementById('score2').innerText = scores[2]; 
}

function resetBoard() {
    board = Array(9).fill(null); 
    phase = 'placement'; 
    currentPlayer = 1; 
    selectedPieceNode = null; 
    gameActive = true;
    
    pieceElements.forEach(p => p.el.remove()); 
    pieceElements = []; 
    clearBoardHighlights();
    
    document.querySelectorAll('.pool-piece').forEach(p => p.classList.remove('placed'));
    
    statusEl.innerText = getStatusTextPrefix() + `Turn: ${playerNames[1]}`;
    document.getElementById('resetBtn').innerText = "Restart Round";
    updateUI();
}

// --- ARTIFICIAL INTELLIGENCE (Lookahead logic) ---

function countWinningThreats(player) {
    let threats = 0;
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = player;
            if (checkWin(player)) threats++;
            board[i] = null;
        }
    }
    return threats;
}

function makeAiMove() {
    if (!gameActive || currentPlayer !== 2) return;

    if (phase === 'placement') {
        let bestNode = getBestPlacementMove();
        handleNodeClick(bestNode, true);
    } else if (phase === 'movement') {
        let bestMove = getBestMovementMove();
        if (bestMove) {
            handleNodeClick(bestMove.from, true); 
            setTimeout(() => {
                if(gameActive) handleNodeClick(bestMove.to, true);
            }, 600);
        }
    }
}

function getBestPlacementMove() {
    let emptyNodes = [];
    for (let i = 0; i < 9; i++) if (board[i] === null) emptyNodes.push(i);

    // 1. If AI can win immediately
    for (let node of emptyNodes) {
        board[node] = 2; let wins = checkWin(2); board[node] = null;
        if (wins) return node;
    }

    // 2. If Player would win
    for (let node of emptyNodes) {
        board[node] = 1; let wins = checkWin(1); board[node] = null;
        if (wins) return node;
    }

    // 3. DEFENSE AGAINST FORKS (Minimax-Lite)
    let bestNodes = [];
    let minPlayerThreats = Infinity;

    for (let aiMove of emptyNodes) {
        board[aiMove] = 2; 
        let maxThreatsForPlayer = 0;
        
        for (let playerMove = 0; playerMove < 9; playerMove++) {
            if (board[playerMove] === null) {
                board[playerMove] = 1; 
                let threats = countWinningThreats(1); 
                if (threats > maxThreatsForPlayer) maxThreatsForPlayer = threats;
                board[playerMove] = null;
            }
        }
        
        board[aiMove] = null; 

        if (maxThreatsForPlayer < minPlayerThreats) {
            minPlayerThreats = maxThreatsForPlayer;
            bestNodes = [aiMove];
        } else if (maxThreatsForPlayer === minPlayerThreats) {
            bestNodes.push(aiMove);
        }
    }

    if (bestNodes.includes(0)) return 0;
    return bestNodes[Math.floor(Math.random() * bestNodes.length)];
}

function getBestMovementMove() {
    let validAiMoves = [];
    let aiNodes = [];
    for(let i=0; i<9; i++) if(board[i] === 2) aiNodes.push(i);
    
    aiNodes.forEach(node => {
        ADJACENCY[node].forEach(adjNode => {
            if (board[adjNode] === null) validAiMoves.push({ from: node, to: adjNode });
        });
    });

    if (validAiMoves.length === 0) return null;

    for (let move of validAiMoves) {
        board[move.from] = null; board[move.to] = 2;
        let wins = checkWin(2);
        board[move.from] = 2; board[move.to] = null;
        if (wins) return move;
    }

    let safeMoves = [];

    for (let aiMove of validAiMoves) {
        board[aiMove.from] = null; board[aiMove.to] = 2;
        let givesHumanWin = false;

        let humanNodes = [];
        for(let i=0; i<9; i++) if(board[i] === 1) humanNodes.push(i);

        for (let hNode of humanNodes) {
            for (let adj of ADJACENCY[hNode]) {
                if (board[adj] === null) {
                    board[hNode] = null; board[adj] = 1;
                    if (checkWin(1)) givesHumanWin = true; 
                    board[hNode] = 1; board[adj] = null;
                    if (givesHumanWin) break;
                }
            }
            if (givesHumanWin) break;
        }

        board[aiMove.from] = 2; board[aiMove.to] = null;
        if (!givesHumanWin) safeMoves.push(aiMove);
    }

    if (safeMoves.length === 0) {
        return validAiMoves[Math.floor(Math.random() * validAiMoves.length)];
    }

    for (let move of safeMoves) {
        if (move.to === 0) return move;
    }

    return safeMoves[Math.floor(Math.random() * safeMoves.length)];
}

validateStart();
initBoard();