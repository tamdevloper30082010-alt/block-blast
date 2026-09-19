import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, X, Sparkles } from 'lucide-react';
import { supabase, type Room, type Player } from '../lib/supabase';
import { getPlayerId } from '../lib/identity';
import { sfx, initAudio } from '../lib/audio';
import { getRandomPieces, type Piece } from '../lib/pieces';
import {
  BOARD_SIZE,
  createEmptyBoard,
  canPlacePiece,
  placePiece as placeOnBoard,
  findFullLines,
  clearLines,
  canPlaceAny,
  calculateScore,
} from '../lib/gameLogic';
import BoardView from '../components/Board';
import PieceView from '../components/Piece';
import ParticleEffect, { type Particle as P } from '../components/ParticleEffect';

type DragState = {
  pieceIdx: number;
  piece: Piece;
  pointerId: number;
  x: number;
  y: number;
};

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const playerId = getPlayerId();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myBoard, setMyBoard] = useState<number[][]>(createEmptyBoard());
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [ghostPos, setGhostPos] = useState<{ row: number; col: number; valid: boolean } | null>(null);
  const [hoverRow, setHoverRow] = useState(-1);
  const [hoverCol, setHoverCol] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [particles, setParticles] = useState<P[]>([]);
  const [combo, setCombo] = useState(0);
  const [showScorePop, setShowScorePop] = useState<{ val: number; key: number } | null>(null);
  const [clearing, setClearing] = useState<{ rows: number[]; cols: number[] } | null>(null);
  const [showHint, setShowHint] = useState(true);

  // LOCAL score state — updates immediately, no waiting on realtime roundtrip
  const [myScore, setMyScore] = useState(0);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const cellSize = 42;
  const gap = 3;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load room + initial pieces
  useEffect(() => {
    if (!code) return;
    loadRoom();
    setPieces(getRandomPieces(3));
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, [code]);

  // Subscribe to realtime
  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`game-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, () => loadPlayers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, () => loadRoom())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [room?.id]);

  // Countdown timer
  useEffect(() => {
    if (!room?.ends_at) return;
    const tick = () => {
      const ms = new Date(room.ends_at!).getTime() - Date.now();
      const sec = Math.max(0, Math.floor(ms / 1000));
      setTimeLeft(sec);
      if (sec <= 0) finishGame();
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [room?.ends_at]);

  async function loadRoom() {
    const { data, error } = await supabase.from('rooms').select('*').eq('code', code).single();
    if (error || !data) {
      nav('/');
      return;
    }
    setRoom(data);
    if (data.status === 'finished') {
      nav(`/results/${code}`);
      return;
    }
    loadPlayers();
  }

  async function loadPlayers() {
    if (!room) return;
    const { data } = await supabase.from('players').select('*').eq('room_id', room.id);
    if (data) {
      setPlayers(data);
      const me = data.find(p => p.player_id === playerId);
      if (me) {
        setMyBoard(me.board);
        // Sync myScore from DB on initial load (only if local is 0)
        if (myScore === 0 && me.score > 0) setMyScore(me.score);
      }
    }
  }

  const finishGame = async () => {
    if (!room) return;
    if (room.status === 'finished') return;
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id);
    nav(`/results/${code}`);
  };

  const myPlayer = players.find(p => p.player_id === playerId);
  const myPlayerNum = players.findIndex(p => p.player_id === playerId) + 1;
  const otherPlayers = players.filter(p => p.player_id !== playerId);

  // Get cell from screen coordinates
  const getCellFromPoint = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const cellW = (rect.width - (BOARD_SIZE - 1) * gap) / BOARD_SIZE;
    const cellH = (rect.height - (BOARD_SIZE - 1) * gap) / BOARD_SIZE;
    const col = Math.floor(x / (cellW + gap));
    const row = Math.floor(y / (cellH + gap));
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return { row, col };
  }, []);

  // Update ghost position when hovering
  useEffect(() => {
    if (!drag || hoverRow < 0 || hoverCol < 0) {
      setGhostPos(null);
      return;
    }
    const valid = canPlacePiece(myBoard, drag.piece, hoverRow, hoverCol);
    setGhostPos({ row: hoverRow, col: hoverCol, valid });
  }, [drag, hoverRow, hoverCol, myBoard]);

  // Pointer move/up — registered on window so dragging works anywhere
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      setDrag(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        setHoverRow(cell.row);
        setHoverCol(cell.col);
      } else {
        setHoverRow(-1);
        setHoverCol(-1);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        attemptPlace(drag.pieceIdx, cell.row, cell.col);
      } else {
        sfx.error();
      }
      setDrag(null);
      setGhostPos(null);
      setHoverRow(-1);
      setHoverCol(-1);
    };

    const preventTouch = (e: TouchEvent) => {
      if (drag) e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      document.removeEventListener('touchmove', preventTouch);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, getCellFromPoint]);

  function startDrag(pieceIdx: number, e: React.PointerEvent) {
    e.preventDefault();
    initAudio();
    const piece = pieces[pieceIdx];
    if (!piece) return;
    sfx.pickup();
    setDrag({
      pieceIdx,
      piece,
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
    });
  }

  async function attemptPlace(pieceIdx: number, row: number, col: number) {
    const piece = pieces[pieceIdx];
    if (!piece || !room) return;
    if (!canPlacePiece(myBoard, piece, row, col)) {
      sfx.error();
      return;
    }

    sfx.place();

    const placed = placeOnBoard(myBoard, piece, row, col, myPlayerNum || 1);
    const blocksPlaced = piece.shape.flat().filter(v => v === 1).length;

    const { rows, cols } = findFullLines(placed);

    let finalBoard = placed;
    let scoreGained = calculateScore(blocksPlaced, rows.length, cols.length, combo);
    let newCombo = combo;

    // Update score IMMEDIATELY for instant UI feedback
    setMyScore(s => s + scoreGained);

    if (rows.length > 0 || cols.length > 0) {
      newCombo = combo + 1;
      setCombo(newCombo);
      setClearing({ rows, cols });
      setTimeout(() => setClearing(null), 450);

      if (rows.length + cols.length >= 2) {
        sfx.bigClear();
        if (newCombo >= 2) sfx.combo();
      } else {
        sfx.clear();
      }

      spawnParticles(rows, cols);

      setTimeout(() => {
        finalBoard = clearLines(placed, rows, cols);
        setMyBoard(finalBoard);
        saveState(finalBoard, newCombo);
      }, 380);
    } else {
      setCombo(0);
      setMyBoard(placed);
      saveState(placed, 0);
    }

    setShowScorePop({ val: scoreGained, key: Date.now() });
    setTimeout(() => setShowScorePop(null), 1000);

    const newPieces = [...pieces];
    newPieces[pieceIdx] = null as any;
    setPieces(newPieces);

    if (newPieces.every(p => !p)) {
      setTimeout(() => {
        setPieces(getRandomPieces(3));
        setCombo(0);
      }, 380);
    } else {
      setTimeout(() => {
        const remaining = newPieces.filter(p => p);
        if (remaining.length > 0 && !canPlaceAny(finalBoard, remaining)) {
          saveState(finalBoard, 0, true);
        }
      }, 450);
    }
  }

  function spawnParticles(rows: number[], cols: number[]) {
    const newParticles: P[] = [];
    const colors = ['#a3e635', '#22d3ee', '#a855f7', '#facc15', '#ff3da6'];
    let id = Date.now();
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;

    rows.forEach(r => {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const x = boardRect.left + c * (cellSize + gap) + cellSize / 2;
        const y = boardRect.top + r * (cellSize + gap) + cellSize / 2;
        for (let i = 0; i < 3; i++) {
          newParticles.push({
            id: id++,
            x, y,
            vx: (Math.random() - 0.5) * 300,
            vy: -Math.random() * 400 - 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 6 + Math.random() * 6,
            life: 1.0,
          });
        }
      }
    });
    cols.forEach(c => {
      for (let r = 0; r < BOARD_SIZE; r++) {
        const x = boardRect.left + c * (cellSize + gap) + cellSize / 2;
        const y = boardRect.top + r * (cellSize + gap) + cellSize / 2;
        for (let i = 0; i < 3; i++) {
          newParticles.push({
            id: id++,
            x, y,
            vx: (Math.random() - 0.5) * 300,
            vy: -Math.random() * 400 - 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 6 + Math.random() * 6,
            life: 1.0,
          });
        }
      }
    });
    setParticles(prev => [...prev, ...newParticles]);
  }

  const removeParticle = (id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  };

  // Save board state (no score here — score is local state, only synced to DB occasionally)
  async function saveState(board: number[][], newCombo: number, dead = false) {
    if (!room || !myPlayer) return;
    await supabase.from('players').update({
      board,
      score: myScore, // sync the current score
      combo: newCombo,
      is_alive: dead ? false : myPlayer.is_alive,
      last_active_at: new Date().toISOString(),
    }).eq('id', myPlayer.id);
  }

  const mm = Math.floor(timeLeft / 60);
  const ss = timeLeft % 60;
  const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60 animate-pulse">Đang tải trận đấu...</div>
      </div>
    );
  }

  // DRAG OFFSET: piece appears ABOVE the finger (like real Block Blast)
  const DRAG_OFFSET_Y = -90;
  const DRAG_SCALE = 1.15;

  return (
    <div
      className="min-h-screen flex flex-col p-3 md:p-4 max-w-2xl mx-auto w-full select-none"
      style={{ touchAction: drag ? 'none' : 'pan-y' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
          <Clock size={16} className="text-neon-cyan" />
          <span className={`font-display font-bold text-2xl ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeStr}
          </span>
        </div>
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full glass-strong"
          animate={{ scale: myScore > 0 ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.3 }}
          key={`score-${myScore}`}
        >
          <Trophy size={18} className="text-yellow-400" />
          <span className="font-display font-bold text-2xl text-yellow-300 tabular-nums">
            {myScore}
          </span>
        </motion.div>
        <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1.5 rounded-full glass">
          <span className="font-mono tracking-wider">{code}</span>
        </div>
      </div>

      {/* Opponents area (top) */}
      {otherPlayers.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5 font-medium">
            <Sparkles size={12} />
            Đối thủ ({otherPlayers.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {otherPlayers.map(p => {
              const displayScore = p.score ?? 0;
              return (
                <motion.div
                  key={p.id}
                  layout
                  className="glass rounded-2xl p-2 flex-shrink-0 min-w-[120px]"
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-semibold text-white text-xs truncate max-w-[70px]">{p.name}</span>
                    <motion.span
                      key={displayScore}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      className="font-display font-bold text-xl text-neon-cyan tabular-nums"
                    >
                      {displayScore}
                    </motion.span>
                  </div>
                  <BoardView
                    board={p.board && p.board.length > 0 ? p.board : createEmptyBoard()}
                    myId={myPlayerNum || 1}
                    size="xs"
                    hideGrid
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hint when no opponents yet */}
      {otherPlayers.length === 0 && (
        <div className="mb-3 glass rounded-2xl p-3 text-center text-sm text-white/60">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={14} className="text-neon-cyan" />
            <span>Đang chờ người chơi khác vào phòng...</span>
          </div>
          <p className="text-xs text-white/40 mt-1">Mã phòng: <span className="font-mono font-bold">{code}</span></p>
        </div>
      )}

      {/* My board (center) */}
      <div className="flex-1 flex items-center justify-center relative min-h-[380px]">
        <div ref={boardRef} className="relative">
          <BoardView
            board={myBoard}
            myId={myPlayerNum || 1}
            ghost={drag && ghostPos && ghostPos.valid ? {
              row: ghostPos.row,
              col: ghostPos.col,
              shape: drag.piece.shape,
              color: drag.piece.color,
            } : null}
            invalid={drag && ghostPos && !ghostPos.valid ? {
              row: ghostPos.row,
              col: ghostPos.col,
              shape: drag.piece.shape,
            } : null}
            clearingRows={clearing?.rows}
            clearingCols={clearing?.cols}
          />
          {/* Score pop animation */}
          <AnimatePresence>
            {showScorePop && (
              <motion.div
                key={showScorePop.key}
                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                animate={{ y: -100, opacity: 1, scale: 1.4 }}
                exit={{ y: -150, opacity: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none font-display text-6xl font-bold text-neon-cyan"
                style={{ textShadow: '0 0 30px rgba(34, 211, 238, 1)' }}
              >
                +{showScorePop.val}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combo indicator */}
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div
                key={combo}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-2 left-2 pointer-events-none font-display text-3xl font-bold text-yellow-400"
                style={{ textShadow: '0 0 25px rgba(250, 204, 21, 0.9)' }}
              >
                🔥 x{combo}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* First-time hint */}
      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-center text-xs text-white/50 mb-2"
        >
          👆 Giữ khối để kéo lên bảng
        </motion.div>
      )}

      {/* Pieces tray */}
      <div
        className="my-3 flex items-end justify-center gap-6 min-h-[100px]"
        style={{ touchAction: drag ? 'none' : 'pan-y' }}
      >
        {pieces.map((p, idx) => p ? (
          <motion.div
            key={`p-${idx}`}
            animate={{ opacity: drag?.pieceIdx === idx ? 0.2 : 1, scale: drag?.pieceIdx === idx ? 0.9 : 1 }}
            className="flex flex-col items-center gap-1"
          >
            <PieceView
              piece={p}
              cellSize={24}
              onPointerDown={(e) => startDrag(idx, e)}
            />
          </motion.div>
        ) : (
          <div key={`e-${idx}`} className="w-[100px] h-[80px] flex items-center justify-center text-white/20">
            <X size={20} />
          </div>
        ))}
      </div>

      {/* DRAG PREVIEW — piece appears ABOVE the finger (real Block Blast style) */}
      {drag && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: drag.x,
            top: drag.y + DRAG_OFFSET_Y, // ABOVE the finger
            transform: `translate(-50%, 0) scale(${DRAG_SCALE})`,
            transformOrigin: '50% 100%', // anchor at bottom center
            opacity: 0.95,
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
          }}
        >
          <PieceView piece={drag.piece} cellSize={30} ghost />
        </div>
      )}

      {/* Leaderboard (bottom) */}
      <div className="glass rounded-2xl p-3 mb-2">
        <div className="space-y-1.5">
          {players
            .slice()
            .sort((a, b) => {
              // My score uses local state, others use DB state
              const aScore = a.player_id === playerId ? myScore : (a.score ?? 0);
              const bScore = b.player_id === playerId ? myScore : (b.score ?? 0);
              return bScore - aScore;
            })
            .map((p, idx) => {
              const displayScore = p.player_id === playerId ? myScore : (p.score ?? 0);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg ${
                    p.player_id === playerId ? 'bg-neon-purple/20 text-white font-bold' : 'text-white/80'
                  }`}
                >
                  <span className="w-6 text-center text-white/40 tabular-nums font-bold">{idx + 1}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <motion.span
                    key={displayScore}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    className="font-display font-bold text-base tabular-nums min-w-[3ch] text-right text-neon-cyan"
                  >
                    {displayScore}
                  </motion.span>
                </div>
              );
            })}
        </div>
      </div>

      <ParticleEffect particles={particles} onDone={removeParticle} />
    </div>
  );
}
