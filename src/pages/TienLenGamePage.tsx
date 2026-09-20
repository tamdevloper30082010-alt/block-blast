import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, SkipForward, Sparkles, Check, Trophy, Bot } from 'lucide-react';
import { supabase, type Room, type Player, type TienLenState, type TienLenPlay } from '../lib/supabase';
import { getPlayerId } from '../lib/identity';
import { sfx, initAudio } from '../lib/audio';
import { sortHand } from '../lib/tienlen/cards';
import type { Card } from '../lib/tienlen/cards';
import { detectCombination, canBeat, comboLabel, type Combination } from '../lib/tienlen/combinations';
import { botDecideMove } from '../lib/bots/tienLenBot';
import CardView from '../components/CardView';

export default function TienLenGamePage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const playerId = getPlayerId();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [state, setState] = useState<TienLenState | null>(null);
  const [selected, setSelected] = useState<Card[]>([]);
  const [error, setError] = useState('');
  const channelRef = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Load room + state
  useEffect(() => {
    if (!code) return;
    loadRoom();
    const ch = supabase
      .channel(`tl-game-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => loadRoom())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadPlayers())
      .subscribe();
    channelRef[1](ch);
    return () => { supabase.removeChannel(ch); };
  }, [code]);

  async function loadRoom() {
    const { data, error } = await supabase.from('rooms').select('*').eq('code', code).single();
    if (error || !data) {
      nav('/');
      return;
    }
    setRoom(data);
    if (data.status === 'finished') {
      nav(`/tl-results/${code}`);
      return;
    }
    setState(data.game_state as TienLenState);
    loadPlayers();
  }

  async function loadPlayers() {
    if (!room) return;
    const { data } = await supabase.from('players').select('*').eq('room_id', room.id).order('joined_at', { ascending: true });
    if (data) setPlayers(data);
  }

  const myPlayer = players.find(p => p.player_id === playerId);
  const myHand: Card[] = useMemo(() => {
    if (!state || !myPlayer) return [];
    return state.hands[playerId] || [];
  }, [state, playerId]);

  const isMyTurn = state?.currentTurn === playerId;
  const isHost = room?.host_id === playerId;
  const winner = state?.winner;

  const selectedCombo: Combination | null = useMemo(() => {
    if (selected.length === 0) return null;
    return detectCombination(selected);
  }, [selected]);

  const canPlay = useMemo(() => {
    if (!selectedCombo || !isMyTurn || winner) return false;
    if (!state?.currentPlay) return true; // new round
    return canBeat(selectedCombo, {
      type: state.currentPlay.type as any,
      cards: state.currentPlay.cards,
      keyValue: 0,
    });
  }, [selectedCombo, isMyTurn, winner, state?.currentPlay]);

  function toggleCard(card: Card) {
    initAudio();
    if (!isMyTurn || winner) {
      sfx.error();
      return;
    }
    setSelected(prev => {
      const exists = prev.find(c => c.id === card.id);
      if (exists) {
        return prev.filter(c => c.id !== card.id);
      } else {
        // Add and keep sorted
        const next = [...prev, card];
        return sortHand(next);
      }
    });
  }

  async function playCards() {
    if (!canPlay || !selectedCombo || !state || !room) return;
    sfx.place();

    // Remove selected from my hand
    const newHand = myHand.filter(c => !selected.find(s => s.id === c.id));

    // Build new state
    const newHands = { ...state.hands, [playerId]: newHand };
    let newCurrentTurn = nextPlayerId(state, playerId);
    let newCurrentPlay: TienLenPlay | null = {
      playerId,
      cards: selected,
      type: selectedCombo.type,
      playedAt: Date.now(),
    };
    let newPassCount = 0;
    let newWinner: string | null = null;

    // Check winner
    if (newHand.length === 0) {
      newWinner = playerId;
      newCurrentTurn = null;
    }

    const newState: TienLenState = {
      ...state,
      hands: newHands,
      currentTurn: newCurrentTurn,
      currentPlay: newCurrentPlay,
      passCount: newPassCount,
      winner: newWinner,
      lastWinner: newWinner ? playerId : state.lastWinner,
    };

    // Save to DB
    await supabase.from('rooms').update({
      game_state: newState,
      status: newWinner ? 'finished' : 'playing',
    }).eq('id', room.id);

    setSelected([]);
    setError('');
  }

  async function executePass(forPlayerId: string) {
    if (!state || !room) return;
    if (!state.currentPlay) return; // can't pass on new round

    sfx.click();
    const newPassCount = state.passCount + 1;
    let newCurrentTurn = nextPlayerId(state, forPlayerId);
    let newCurrentPlay: TienLenPlay | null = state.currentPlay;
    let newLastWinner = state.lastWinner;

    // If everyone passed (passCount == playerCount - 1), new round starts
    if (newPassCount >= state.turnOrder.length - 1) {
      const starter = state.currentPlay?.playerId || state.lastWinner || state.turnOrder[0];
      newCurrentTurn = starter;
      newCurrentPlay = null;
      newLastWinner = starter;
    }

    const newState: TienLenState = {
      ...state,
      currentTurn: newCurrentTurn,
      currentPlay: newCurrentPlay,
      passCount: newPassCount >= state.turnOrder.length - 1 ? 0 : newPassCount,
      lastWinner: newLastWinner,
    };

    await supabase.from('rooms').update({
      game_state: newState,
    }).eq('id', room.id);
  }

  async function passTurn() {
    if (!isMyTurn || winner || !state || !room) return;
    if (!state.currentPlay) {
      // Can't pass if no one has played yet
      sfx.error();
      setError('Chưa có ai đánh, không thể bỏ lượt');
      setTimeout(() => setError(''), 2000);
      return;
    }
    await executePass(playerId);
  }

  function nextPlayerId(s: TienLenState, current: string): string | null {
    const idx = s.turnOrder.indexOf(current);
    if (idx === -1) return null;
    for (let i = 1; i <= s.turnOrder.length; i++) {
      const next = s.turnOrder[(idx + i) % s.turnOrder.length];
      // Skip players with no cards (already won or eliminated)
      if (s.hands[next] && s.hands[next].length > 0) {
        return next;
      }
    }
    return null;
  }

  // BOT ENGINE — host runs bots on their turn
  useEffect(() => {
    if (!state || !room || !isHost || winner) return;
    const botId = state.currentTurn;
    if (!botId) return;
    const currentPlayer = players.find(p => p.player_id === botId);
    if (!currentPlayer?.is_bot) return;
    if (!state.hands[botId] || state.hands[botId].length === 0) return;

    const timeout = setTimeout(async () => {
      try {
        const decision = botDecideMove(state, botId);
        if (decision.action === 'pass') {
          await executePass(botId);
        } else if (decision.cards && decision.cards.length > 0) {
          await botPlayCards(decision.cards);
        }
      } catch (err) {
        console.error('Bot error:', err);
      }
    }, 1500 + Math.random() * 1000);

    return () => clearTimeout(timeout);
  }, [state?.currentTurn, isHost, winner, players.length]);

  const isBotThinking = useMemo(() => {
    if (!state || !isHost || winner) return false;
    const cur = state.currentTurn;
    if (!cur) return false;
    return players.find(p => p.player_id === cur)?.is_bot ?? false;
  }, [state?.currentTurn, players, isHost, winner]);

  async function botPlayCards(cards: Card[]) {
    if (!state || !room || !playerId) return;
    const botId = state.currentTurn;
    if (!botId) return;
    const combo = detectCombination(cards);
    if (!combo) {
      // Invalid combo, just pass instead
      await executePass(botId);
      return;
    }

    sfx.place();

    const hand = state.hands[botId] || [];
    const newHand = hand.filter(c => !cards.find(s => s.id === c.id));
    const newHands = { ...state.hands, [botId]: newHand };
    const newCurrentTurn = nextPlayerId(state, botId);
    const newCurrentPlay: TienLenPlay | null = {
      playerId: botId,
      cards,
      type: combo.type,
      playedAt: Date.now(),
    };

    let newWinner: string | null = null;
    if (newHand.length === 0) {
      newWinner = botId;
    }

    const newState: TienLenState = {
      ...state,
      hands: newHands,
      currentTurn: newWinner ? null : newCurrentTurn,
      currentPlay: newCurrentPlay,
      passCount: 0,
      winner: newWinner,
      lastWinner: newWinner ? botId : state.lastWinner,
    };

    await supabase.from('rooms').update({
      game_state: newState,
      status: newWinner ? 'finished' : 'playing',
    }).eq('id', room.id);
  }

  // Sort hand automatically when component mounts
  useEffect(() => {
    if (myHand.length > 0 && selected.length === 0) {
      // optional: auto-show sorted hand
    }
  }, [myHand.length]);

  if (!room || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60 animate-pulse">Đang tải ván bài...</div>
      </div>
    );
  }

  if (winner) {
    const winnerPlayer = players.find(p => p.player_id === winner);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl mb-4">🏆</motion.div>
        <h1 className="font-display text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
          {winnerPlayer?.name || 'Ai đó'} đã thắng!
        </h1>
        <p className="text-white/60 mb-8">Đánh hết bài đầu tiên 🎉</p>
        <button onClick={() => nav(`/tl-results/${code}`)} className="btn-primary text-lg py-4 px-8 flex items-center gap-2">
          <Trophy size={20} />
          Xem kết quả
        </button>
      </div>
    );
  }

  const currentPlayer = players.find(p => p.player_id === state.currentTurn);
  const sortedPlayers = [...players].sort((a, b) => {
    const aIdx = state.turnOrder.indexOf(a.player_id);
    const bIdx = state.turnOrder.indexOf(b.player_id);
    return aIdx - bIdx;
  });
  const opponents = sortedPlayers.filter(p => p.player_id !== playerId);

  return (
    <div
      className="min-h-screen flex flex-col p-3 max-w-3xl mx-auto w-full select-none"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => { sfx.click(); nav('/'); }} className="text-white/60 hover:text-white flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} />
          <span>Thoát</span>
        </button>
        <div className="glass rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="text-xs text-white/60">Lượt của:</span>
          {isBotThinking && <Bot size={12} className="text-neon-cyan animate-pulse" />}
          <span className={`font-bold text-sm ${isMyTurn ? 'text-neon-cyan animate-pulse' : 'text-white'}`}>
            {isBotThinking ? 'Bot đang suy nghĩ...' : (currentPlayer?.name || '...')}
          </span>
        </div>
        <div className="text-xs text-white/40 font-mono">{code}</div>
      </div>

      {/* Opponents */}
      <div className={`mb-3 grid gap-2 ${
        opponents.length === 1 ? 'grid-cols-1 max-w-[280px] mx-auto' :
        opponents.length === 2 ? 'grid-cols-2' :
        'grid-cols-3'
      }`}>
        {opponents.map(p => {
          const hand = state.hands[p.player_id] || [];
          const isCurrentTurn = p.player_id === state.currentTurn;
          return (
            <motion.div
              key={p.id}
              animate={{ scale: isCurrentTurn ? 1.03 : 1 }}
              className={`glass rounded-2xl p-2 flex flex-col items-center ${
                isCurrentTurn ? 'ring-2 ring-neon-cyan shadow-[0_0_20px_rgba(34,211,238,0.4)]' : ''
              } ${p.is_bot ? 'border border-neon-cyan/30' : ''}`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex items-center gap-1 min-w-0">
                  {p.is_bot && <Bot size={10} className="text-neon-cyan flex-shrink-0" />}
                  <span className="font-bold text-white text-xs truncate">{p.name}</span>
                </div>
                <span className="font-display font-bold text-sm text-neon-cyan">{hand.length}</span>
              </div>
              <div className="flex -space-x-4">
                {hand.slice(0, Math.min(hand.length, 7)).map((c, i) => (
                  <div key={c.id} style={{ zIndex: 7 - i }}>
                    <CardView card={c} faceDown small />
                  </div>
                ))}
                {hand.length > 7 && (
                  <div className="w-8 h-11 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-xs text-white/60 font-bold">
                    +{hand.length - 7}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Current play area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[180px] my-2">
        <div className="glass rounded-3xl p-4 w-full min-h-[160px] flex flex-col items-center justify-center relative">
          {state.currentPlay ? (
            <motion.div
              key={`${state.currentPlay.playerId}-${state.currentPlay.playedAt}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/50">Đánh:</span>
                <span className="font-bold text-white">{players.find(p => p.player_id === state.currentPlay!.playerId)?.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-neon-purple/30 text-neon-purple text-xs font-semibold">
                  {comboLabel(state.currentPlay.type as any)}
                </span>
              </div>
              <div className="flex gap-1">
                {state.currentPlay.cards.map(c => (
                  <CardView key={c.id} card={c} small />
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="text-white/40 text-sm flex items-center gap-2">
              <Sparkles size={14} />
              <span>Ván mới — {players.find(p => p.player_id === state.lastWinner)?.name || 'Ai đó'} đánh trước</span>
            </div>
          )}

          {/* Combo detection */}
          {selected.length > 0 && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2"
              >
                {selectedCombo ? (
                  <div className="px-3 py-1.5 rounded-full bg-neon-cyan/20 border border-neon-cyan/40 flex items-center gap-2 text-sm">
                    <Check size={14} className="text-neon-cyan" />
                    <span className="text-white font-semibold">{comboLabel(selectedCombo.type)}</span>
                    {state.currentPlay && !canPlay && (
                      <span className="text-red-400 text-xs ml-1">không đủ mạnh</span>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-sm text-red-300">
                    Bộ không hợp lệ
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-red-400 text-sm mb-2"
        >
          {error}
        </motion.div>
      )}

      {/* My hand */}
      <div className="glass rounded-2xl p-3 mb-3 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/60">Bài của bạn ({myHand.length} lá)</span>
          <button
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            className="text-xs text-white/50 hover:text-white disabled:opacity-30"
          >
            Bỏ chọn
          </button>
        </div>
        <div className="flex justify-center -space-x-3 min-h-[90px]">
          {myHand.length === 0 ? (
            <div className="text-white/30 text-sm italic py-6">Bạn đã đánh hết bài! 🎉</div>
          ) : (
            myHand.map((c) => {
              const isSelected = selected.find(s => s.id === c.id) !== undefined;
              return (
                <div key={c.id} style={{ zIndex: isSelected ? 100 : 1 }}>
                  <CardView
                    card={c}
                    selected={isSelected}
                    onClick={() => toggleCard(c)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={passTurn}
          disabled={!isMyTurn || !!winner || !state.currentPlay}
          className="flex-1 btn-ghost py-4 flex items-center justify-center gap-2 disabled:opacity-30"
        >
          <SkipForward size={18} />
          Bỏ lượt
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={playCards}
          disabled={!canPlay}
          className="flex-1 btn-primary py-4 flex items-center justify-center gap-2"
        >
          <Send size={18} />
          Đánh {selected.length > 0 && `(${selected.length})`}
        </motion.button>
      </div>

      {/* Pass count indicator */}
      {state.passCount > 0 && state.currentPlay && (
        <div className="text-center text-xs text-white/40">
          {state.passCount} người đã bỏ lượt
        </div>
      )}
    </div>
  );
}
