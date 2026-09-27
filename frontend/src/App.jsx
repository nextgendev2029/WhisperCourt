import React, { useState, useEffect, useRef } from 'react';
import MainMenu from './screens/MainMenu';
import GameSetup from './screens/GameSetup';
import GameShell from './screens/GameShell';
import CourtLobby from './screens/CourtLobby';
import CreateCourtModal from './components/CreateCourtModal';
import JoinCourtModal from './components/JoinCourtModal';
import HowItWorksModal from './components/HowItWorksModal';
import SettingsModal from './components/SettingsModal';
import './App.css';

const DEFAULT_SETTINGS = {
  animations: true,
  reducedMotion: false,
  autoAdvance: true,
  sound: true,
  gmView: false,
};

import { getApiBase, getWsBase } from './utils/network';

export default function App() {
  /* ── Screen Navigation State ── */
  const [currentScreen, setCurrentScreen] = useState('landing'); // 'landing' | 'setup' | 'lobby' | 'game'
  const [setupMode, setSetupMode] = useState('solo'); // 'solo' | 'spectator'
  const [sessionConfig, setSessionConfig] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  /* ── Multiplayer Room State ── */
  const [room, setRoom] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(
    () => localStorage.getItem('whisper_court_player_id') || ('p_' + Math.random().toString(36).substring(2, 9))
  );
  const [currentPlayerToken, setCurrentPlayerToken] = useState(
    () => localStorage.getItem('whisper_court_player_token') || ('tok_' + Math.random().toString(36).substring(2, 12))
  );
  const [isStartingCourt, setIsStartingCourt] = useState(false);

  /* ── Modals State ── */
  const [isCreateCourtOpen, setIsCreateCourtOpen] = useState(false);
  const [isJoinCourtOpen, setIsJoinCourtOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  /* ── Async State for Create/Join ── */
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState(null);

  /* ── Lobby WebSocket Ref ── */
  const lobbyWsRef = useRef(null);

  /* ── Global Settings with LocalStorage Persistence ── */
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('whisper_court_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('whisper_court_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('[WhisperCourt] Failed to write settings to localStorage', e);
    }
  };

  /* ── Maintain Player ID & Token in LocalStorage ── */
  useEffect(() => {
    if (currentPlayerId) localStorage.setItem('whisper_court_player_id', currentPlayerId);
    if (currentPlayerToken) localStorage.setItem('whisper_court_player_token', currentPlayerToken);
  }, [currentPlayerId, currentPlayerToken]);

  /* ── Solo & Spectator Setup Handlers ── */
  const handleSelectPlaySolo = () => {
    setSetupMode('solo');
    setCurrentScreen('setup');
  };

  const handleSelectWatchCourt = () => {
    setSetupMode('spectator');
    setCurrentScreen('setup');
  };

  const handleBeginCourt = (config) => {
    setIsInitializing(true);
    const gameId = `court_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    setTimeout(() => {
      setSessionConfig({
        ...config,
        gameId,
      });
      setCurrentScreen('game');
      setIsInitializing(false);
    }, 300);
  };

  /* ── Multiplayer: Create Court Handler ── */
  const handleCreateCourtSubmit = async ({ courtSize, playerName }) => {
    setCreateLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_size: courtSize,
          player_name: playerName,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to convene court session.');
      }

      const data = await res.json();
      setCurrentPlayerId(data.player_id);
      setCurrentPlayerToken(data.player_token);

      // Fetch full room info
      const roomRes = await fetch(`${getApiBase()}/api/rooms/${data.join_code}`);
      const roomData = await roomRes.json();

      setRoom(roomData);
      setIsCreateCourtOpen(false);
      setCurrentScreen('lobby');
    } catch (err) {
      console.error('[WhisperCourt] Create room error:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  /* ── Multiplayer: Join Court Handler ── */
  const handleJoinCourtSubmit = async ({ roomCode, playerName }) => {
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          join_code: roomCode,
          player_name: playerName,
          player_token: currentPlayerToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.detail || 'COURT NOT FOUND');
        return;
      }

      setCurrentPlayerId(data.player_id);
      if (data.player_token) setCurrentPlayerToken(data.player_token);

      // Fetch room status
      const roomRes = await fetch(`${getApiBase()}/api/rooms/${roomCode}`);
      const roomData = await roomRes.json();

      setRoom(roomData);
      setIsJoinCourtOpen(false);

      if (roomData.started) {
        // If reconnecting to an active game: jump straight into chamber
        setSessionConfig({
          roomId: roomData.room_id,
          joinCode: roomData.join_code,
          courtSize: roomData.court_size,
          isHost: roomData.host_player_id === data.player_id,
          playerId: data.player_id,
          playerToken: data.player_token || currentPlayerToken,
        });
        setCurrentScreen('game');
      } else {
        setCurrentScreen('lobby');
      }
    } catch (err) {
      console.error('[WhisperCourt] Join court error:', err);
      setJoinError('CONNECTION FAILED. THE CHAMBER MAY BE DISSOLVED.');
    } finally {
      setJoinLoading(false);
    }
  };

  /* ── Lobby WebSocket Lifecycle (Active ONLY during 'lobby' screen) ── */
  useEffect(() => {
    if (currentScreen !== 'lobby' || !room?.room_id) {
      if (lobbyWsRef.current) {
        lobbyWsRef.current.close();
        lobbyWsRef.current = null;
      }
      return;
    }

    const wsUrl = `${getWsBase()}/ws/room/${room.room_id}?player_id=${encodeURIComponent(currentPlayerId)}&player_token=${encodeURIComponent(currentPlayerToken)}`;
    const ws = new WebSocket(wsUrl);
    lobbyWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room_state') {
          setRoom(prev => ({ ...prev, ...msg }));
          if (msg.started) {
            // Close lobby WebSocket so GameShell can open its authoritative connection
            ws.close();
            lobbyWsRef.current = null;

            setSessionConfig({
              roomId: room.room_id,
              joinCode: room.join_code,
              courtSize: room.court_size,
              isHost: room.host_player_id === currentPlayerId,
              playerId: currentPlayerId,
              playerToken: currentPlayerToken,
            });
            setCurrentScreen('game');
          }
        } else if (msg.type === 'court_started') {
          ws.close();
          lobbyWsRef.current = null;

          setSessionConfig({
            roomId: room.room_id,
            joinCode: room.join_code,
            courtSize: room.court_size,
            isHost: room.host_player_id === currentPlayerId,
            playerId: currentPlayerId,
            playerToken: currentPlayerToken,
          });
          setCurrentScreen('game');
        }
      } catch (e) {
        console.warn('[WhisperCourt Lobby] Non-JSON message:', event.data);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      lobbyWsRef.current = null;
    };
  }, [currentScreen, room?.room_id, currentPlayerId, currentPlayerToken]);

  /* ── Start Court from Lobby (Host Only) ── */
  const handleStartCourtFromLobby = () => {
    setIsStartingCourt(true);
    if (lobbyWsRef.current && lobbyWsRef.current.readyState === WebSocket.OPEN) {
      lobbyWsRef.current.send(JSON.stringify({ action: 'start_court' }));
    }
  };

  /* ── Leave Lobby ── */
  const handleLeaveLobby = () => {
    if (lobbyWsRef.current) {
      lobbyWsRef.current.close();
      lobbyWsRef.current = null;
    }
    setRoom(null);
    setIsStartingCourt(false);
    setCurrentScreen('landing');
  };

  /* ── Return to Menu from Active Chamber ── */
  const handleReturnToMenu = () => {
    setSessionConfig(null);
    setRoom(null);
    setCurrentScreen('landing');
  };

  /* ── Restart Court ── */
  const handleRestartCourt = () => {
    if (!sessionConfig) return;
    if (sessionConfig.roomId) {
      // Re-convene with new room
      handleReturnToMenu();
    } else {
      const newGameId = `court_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setSessionConfig(prev => ({
        ...prev,
        gameId: newGameId,
      }));
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08090B] text-[#E8DEC8] select-none font-sans overflow-x-hidden">
      {/* SCREEN A: LANDING / MAIN MENU */}
      {currentScreen === 'landing' && (
        <MainMenu
          onSelectPlaySolo={handleSelectPlaySolo}
          onOpenCreateCourt={() => setIsCreateCourtOpen(true)}
          onOpenJoinCourt={() => {
            setJoinError(null);
            setIsJoinCourtOpen(true);
          }}
          onSelectWatchCourt={handleSelectWatchCourt}
          onOpenHowItWorks={() => setIsHowItWorksOpen(false || true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* SCREEN B: ASSEMBLE THE COURT / SETUP (Solo & Spectator) */}
      {currentScreen === 'setup' && (
        <GameSetup
          initialMode={setupMode}
          onBack={() => setCurrentScreen('landing')}
          onBeginCourt={handleBeginCourt}
          isInitializing={isInitializing}
        />
      )}

      {/* SCREEN C: MULTIPLAYER COURT LOBBY */}
      {currentScreen === 'lobby' && room && (
        <CourtLobby
          room={room}
          currentPlayerId={currentPlayerId}
          onStartCourt={handleStartCourtFromLobby}
          onLeaveCourt={handleLeaveLobby}
          isStarting={isStartingCourt}
        />
      )}

      {/* SCREEN D: COURT CHAMBER / GAME SHELL */}
      {currentScreen === 'game' && sessionConfig && (
        <GameShell
          sessionConfig={sessionConfig}
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onReturnToMenu={handleReturnToMenu}
          onRestartCourt={handleRestartCourt}
        />
      )}

      {/* MODAL: CREATE COURT */}
      <CreateCourtModal
        isOpen={isCreateCourtOpen}
        onClose={() => setIsCreateCourtOpen(false)}
        onCreateCourt={handleCreateCourtSubmit}
        isLoading={createLoading}
      />

      {/* MODAL: JOIN COURT */}
      <JoinCourtModal
        isOpen={isJoinCourtOpen}
        onClose={() => {
          setIsJoinCourtOpen(false);
          setJoinError(null);
        }}
        onJoinCourt={handleJoinCourtSubmit}
        isLoading={joinLoading}
        serverError={joinError}
      />

      {/* MODAL: HOW IT WORKS CODEX */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      {/* MODAL: CHAMBER SETTINGS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}
