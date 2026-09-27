import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

import CourtHeader from '../components/CourtHeader';
import TestimonyCard from '../components/game/TestimonyCard';
import ThinkingCard from '../components/game/ThinkingCard';
import CourtRoster from '../components/game/CourtRoster';
import DossierPanel from '../components/game/DossierPanel';
import InterrogationModal from '../components/game/InterrogationModal';
import AccusationModal from '../components/game/AccusationModal';
import DefenseModal from '../components/game/DefenseModal';
import VotingView from '../components/game/VotingView';
import VerdictModal from '../components/game/VerdictModal';
import TrustShiftToast from '../components/game/TrustShiftToast';
import CaseTimelineDrawer from '../components/game/CaseTimelineDrawer';
import GameMenuModal from '../components/GameMenuModal';
import ConfirmModal from '../components/ConfirmModal';
import ErrorBanner from '../components/ErrorBanner';
import CourtNotice from '../components/game/CourtNotice';
import CatchUpModal from '../components/game/CatchUpModal';
import ObservatoryDrawer from '../components/game/ObservatoryDrawer';
import RelationshipDossierModal from '../components/game/RelationshipDossierModal';

// Master Prompt 07 New Cinematic & Replay Components
import PhaseTransitionOverlay from '../components/game/PhaseTransitionOverlay';
import ContradictionBanner from '../components/game/ContradictionBanner';
import CourtReplayModal from '../components/game/CourtReplayModal';
import TranscriptModal from '../components/game/TranscriptModal';
import { courtAudio } from '../utils/courtAudio';
import { getWsBase } from '../utils/network';

import { COURT_PERSONAS } from '../data/personas';

/* ── Character Color Palette (Noble heraldic colors, distinguishable on charcoal) ── */
const COURT_COLORS = [
  '#C6A15B', // Antique Gold
  '#A8A295', // Parchment
  '#D4B56A', // Brass
  '#8C8E94', // Slate
  '#9B2C2C', // Crimson
  '#2E7D5B', // Emerald
];

export default function GameShell({
  sessionConfig,
  settings,
  onOpenSettings,
  onReturnToMenu,
  onRestartCourt,
}) {
  const {
    gameId,
    roomId,
    courtSize = 5,
    numHumans = 1,
    joinCode: initialJoinCode = null,
    playerId: configPlayerId = null,
    playerToken: configPlayerToken = null,
  } = sessionConfig;

  // Persistent Player Identity & Session Token
  const [playerId] = useState(() => {
    return configPlayerId || localStorage.getItem('whisper_court_player_id') || ('p_' + Math.random().toString(36).substring(2, 9));
  });
  const [playerToken] = useState(() => {
    return configPlayerToken || localStorage.getItem('whisper_court_player_token') || ('tok_' + Math.random().toString(36).substring(2, 12));
  });
  const [joinCode, setJoinCode] = useState(initialJoinCode);

  useEffect(() => {
    if (playerId) localStorage.setItem('whisper_court_player_id', playerId);
    if (playerToken) localStorage.setItem('whisper_court_player_token', playerToken);
  }, [playerId, playerToken]);

  /* ── Core Game State ── */
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [trustData, setTrustData] = useState({});
  const [roundNumber, setRoundNumber] = useState(1);
  const [phase, setPhase] = useState('discussion'); // 'discussion' | 'voting' | 'reveal' | 'ended'
  const [revealInfo, setRevealInfo] = useState(null);
  const [winResult, setWinResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  /* ── Audio State ── */
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  /* ── Court Notices & Reconnect Catch-Up ── */
  const [courtNotices, setCourtNotices] = useState([]);
  const [catchUpData, setCatchUpData] = useState({ isOpen: false, awaySeconds: 0, events: [] });

  const addCourtNotice = useCallback((text, type = 'info') => {
    const id = Date.now() + Math.random();
    setCourtNotices(prev => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setCourtNotices(prev => prev.filter(n => n.id !== id));
    }, 5500);
  }, []);

  /* ── Courtroom Dynamics ── */
  const [activeSpeaker, setActiveSpeaker] = useState(null); // { id, name }
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [trustNotifications, setTrustNotifications] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);

  /* ── Modals & Drawers ── */
  const [isInterrogationOpen, setIsInterrogationOpen] = useState(false);
  const [isAccusationOpen, setIsAccusationOpen] = useState(false);
  const [isDefenseOpen, setIsDefenseOpen] = useState(false);
  const [isCaseTimelineOpen, setIsCaseTimelineOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // 'leave' | 'restart' | null

  /* ── Master Prompt 07 Replay & Transcript Modals ── */
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [dismissedContradictionIds, setDismissedContradictionIds] = useState(new Set());
  const [activeContradictionAlert, setActiveContradictionAlert] = useState(null);

  /* ── Observatory State ── */
  const [isObservatoryOpen, setIsObservatoryOpen] = useState(false);
  const [claims, setClaims] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [influenceEvents, setInfluenceEvents] = useState([]);
  const [socialHeat, setSocialHeat] = useState([]);
  const [socialEvents, setSocialEvents] = useState([]);
  const [courtAnalysis, setCourtAnalysis] = useState(null);
  const [dossierState, setDossierState] = useState({
    isOpen: false,
    evaluator: null,
    target: null,
    dossierData: null,
  });

  /* ── Refs ── */
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);
  const graphContainerRef = useRef(null);
  const fgRef = useRef(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 380, height: 340 });
  const trustDeltasRef = useRef([]);

  /* ── Character Helpers ── */
  const agentColor = useCallback((agentId) => {
    const idx = agents.findIndex(a => a.id === agentId);
    return COURT_COLORS[idx % COURT_COLORS.length] || '#A8A295';
  }, [agents]);

  const livingAgents = useMemo(() => agents.filter(a => a.is_alive), [agents]);
  const humanAgent = useMemo(() => agents.find(a => a.is_human), [agents]);

  /* ── Selected Agent Object for Dossier ── */
  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return agents.find(a => a.id === selectedAgentId) || null;
  }, [agents, selectedAgentId]);

  /* ── Selected Agent's Recent Statements ── */
  const selectedAgentTestimonies = useMemo(() => {
    if (!selectedAgentId) return [];
    return messages.filter(m => m.speakerId === selectedAgentId);
  }, [messages, selectedAgentId]);

  /* ── Derived: Recently Accused Character IDs for Roster ── */
  const recentlyAccusedIds = useMemo(() => {
    const accused = new Set();
    messages.forEach(m => {
      if (m.tag === 'ACCUSATION' && m.target_name) {
        const ag = agents.find(a => a.name === m.target_name);
        if (ag) accused.add(ag.id);
      }
    });
    return Array.from(accused);
  }, [messages, agents]);

  /* ── Derived: Top Surfaced Contradiction for Chamber Banner ── */
  const activeContradiction = useMemo(() => {
    if (activeContradictionAlert && !dismissedContradictionIds.has(activeContradictionAlert.description)) {
      return activeContradictionAlert;
    }
    const unDismissed = contradictions.find(c => !dismissedContradictionIds.has(c.description));
    return unDismissed || null;
  }, [activeContradictionAlert, contradictions, dismissedContradictionIds]);

  /* ── Auto-scroll Chamber Feed ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSpeaker]);

  /* ── Auto-dismiss Trust Notification Toasts (4.5s) ── */
  useEffect(() => {
    if (trustNotifications.length === 0) return;
    const timer = setTimeout(() => {
      setTrustNotifications(prev => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [trustNotifications]);

  /* ── Clean Up Expired Graph Canvas Deltas (3.5s) ── */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const filtered = trustDeltasRef.current.filter(d => now - d.timestamp < 3500);
      if (filtered.length !== trustDeltasRef.current.length) {
        trustDeltasRef.current = filtered;
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  /* ── Desktop Resizable Layout State (Client-Side Only) ── */
  const sidebarContainerRef = useRef(null);
  const dragInfoRef = useRef(null);
  const [activeDrag, setActiveDrag] = useState(null); // 'vertical' | 'sepA' | 'sepB' | null

  const [isDesktop, setIsDesktop] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return Math.max(340, Math.min(540, Math.round(window.innerWidth * 0.38)));
    }
    return 420;
  });

  const [topPanelHeight, setTopPanelHeight] = useState(280);
  const [midPanelHeight, setMidPanelHeight] = useState(220);

  // Monitor desktop breakpoint
  useEffect(() => {
    const handleWinResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarWidth(prev => Math.max(320, Math.min(window.innerWidth * 0.58, prev)));
      }
    };
    window.addEventListener('resize', handleWinResize);
    return () => window.removeEventListener('resize', handleWinResize);
  }, []);

  // Monitor sidebar total height to prevent vertical overflow on desktop
  useEffect(() => {
    if (!sidebarContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const totalH = entry.contentRect.height;
        if (totalH > 560) {
          const maxTopMid = totalH - 160; // 160px reserved for dossier panel
          if (topPanelHeight + midPanelHeight > maxTopMid) {
            const excess = (topPanelHeight + midPanelHeight) - maxTopMid;
            const topExcess = Math.min(topPanelHeight - 220, Math.round(excess * 0.55));
            const midExcess = Math.min(midPanelHeight - 180, excess - topExcess);
            setTopPanelHeight(prev => Math.max(220, prev - topExcess));
            setMidPanelHeight(prev => Math.max(180, prev - midExcess));
          }
        }
      }
    });
    observer.observe(sidebarContainerRef.current);
    return () => observer.disconnect();
  }, [topPanelHeight, midPanelHeight]);

  // Window drag handlers for smooth, bounded panel resizing
  useEffect(() => {
    if (!activeDrag) return;

    let rafId = null;

    const handleMouseMove = (e) => {
      if (!dragInfoRef.current) return;
      const { type, startX, startY, startWidth, startTop, startMid, totalH } = dragInfoRef.current;

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (type === 'vertical') {
          // Dragging left makes sidebar wider; dragging right makes sidebar narrower
          const deltaX = startX - e.clientX;
          const minW = 320;
          const maxW = Math.min(window.innerWidth * 0.58, window.innerWidth - 440);
          const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
          setSidebarWidth(newWidth);
        } else if (type === 'sepA') {
          // Between Top (Trust Network) and Mid (Living Court)
          const deltaY = e.clientY - startY;
          const totalTopMid = startTop + startMid;
          const minTop = 220;
          const minMid = 180;
          const newTop = Math.max(minTop, Math.min(totalTopMid - minMid, startTop + deltaY));
          const newMid = totalTopMid - newTop;
          setTopPanelHeight(newTop);
          setMidPanelHeight(newMid);
        } else if (type === 'sepB') {
          // Between Mid (Living Court) and Bottom (Dossier)
          const deltaY = e.clientY - startY;
          const minMid = 180;
          const minBottom = 160;
          const availableForMidBottom = totalH - topPanelHeight;
          const maxMid = availableForMidBottom - minBottom;
          const newMid = Math.max(minMid, Math.min(maxMid, startMid + deltaY));
          setMidPanelHeight(newMid);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      dragInfoRef.current = null;
      setActiveDrag(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    if (activeDrag === 'vertical') {
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = 'row-resize';
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [activeDrag, topPanelHeight]);

  const handleStartDragVertical = (e) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'vertical',
      startX: e.clientX,
      startWidth: sidebarWidth,
    };
    setActiveDrag('vertical');
  };

  const handleStartDragSepA = (e) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'sepA',
      startY: e.clientY,
      startTop: topPanelHeight,
      startMid: midPanelHeight,
    };
    setActiveDrag('sepA');
  };

  const handleStartDragSepB = (e) => {
    e.preventDefault();
    const totalH = sidebarContainerRef.current ? sidebarContainerRef.current.clientHeight : 800;
    dragInfoRef.current = {
      type: 'sepB',
      startY: e.clientY,
      startMid: midPanelHeight,
      totalH,
    };
    setActiveDrag('sepB');
  };

  /* ── Resize Observer for Force Graph Viewport ── */
  useEffect(() => {
    if (!graphContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGraphDimensions({
          width: Math.max(260, Math.round(entry.contentRect.width)),
          height: Math.max(160, Math.round(entry.contentRect.height)),
        });
      }
    });
    observer.observe(graphContainerRef.current);
    return () => observer.disconnect();
  }, []);

  /* ── Auto-fit graph camera when dimensions or agents change ── */
  useEffect(() => {
    if (!fgRef.current) return;
    const timer = setTimeout(() => {
      if (fgRef.current) {
        try {
          fgRef.current.zoomToFit(300, 32);
        } catch {
          // Canvas initializing
        }
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [graphDimensions.width, graphDimensions.height, agents.length]);

  /* ── Zoom & Fit Controls for Trust Network ── */
  const handleZoomIn = useCallback(() => {
    if (!fgRef.current) return;
    try {
      const z = fgRef.current.zoom();
      fgRef.current.zoom(Math.min(z * 1.35, 4.0), 250);
    } catch {
      // safe fallback
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!fgRef.current) return;
    try {
      const z = fgRef.current.zoom();
      fgRef.current.zoom(Math.max(z / 1.35, 0.35), 250);
    } catch {
      // safe fallback
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    if (!fgRef.current) return;
    try {
      fgRef.current.zoomToFit(350, 32);
    } catch {
      // safe fallback
    }
  }, []);

  /* ── Force Simulation Tuning for Collision-Free Court Graph ── */
  useEffect(() => {
    if (!fgRef.current) return;
    try {
      // Strong repulsion to prevent label collision in 5 & 6-seat configurations
      fgRef.current.d3Force('charge')?.strength(-160);
      fgRef.current.d3Force('link')?.distance(85);
    } catch {
      // Ignore if d3 internal forces are initializing
    }
  }, [agents.length, graphDimensions.width]);

  /* ── Audio Mute Toggle Helper ── */
  const handleToggleAudio = useCallback(() => {
    setIsAudioMuted(prev => {
      const next = !prev;
      courtAudio.setMuted(next);
      if (!next) {
        courtAudio.playGavel();
        addCourtNotice('Courtroom acoustic resonance enabled.', 'info');
      } else {
        addCourtNotice('Courtroom audio muted.', 'info');
      }
      return next;
    });
  }, [addCourtNotice]);

  /* ── WebSocket Connection Lifecycle (Strictly Single Connection with Token Reuse) ── */
  useEffect(() => {
    let isMounted = true;
    let ws = null;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsBase = getWsBase();
    let wsUrl = '';
    if (roomId) {
      wsUrl = `${wsBase}/ws/room/${roomId}?player_id=${encodeURIComponent(playerId)}&player_token=${encodeURIComponent(playerToken)}`;
    } else {
      wsUrl = `${wsBase}/ws/game/${gameId}?num_agents=${courtSize}&num_humans=${numHumans}`;
    }

    ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted) return;
      setConnected(true);
      setConnectionError(null);
      console.log(`[WhisperCourt] Connected to court session ${roomId || gameId}`);
    };

    ws.onclose = () => {
      if (!isMounted) return;
      setConnected(false);
      console.log('[WhisperCourt] Disconnected from court session');
    };

    ws.onerror = (err) => {
      if (!isMounted) return;
      console.error('[WhisperCourt] Connection error:', err);
      setConnectionError('disconnect');
    };

    ws.onmessage = (event) => {
      if (!isMounted) return;
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.warn('[WhisperCourt] Received non-JSON payload:', event.data);
      }
    };

    return () => {
      isMounted = false;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, gameId, playerId, playerToken, courtSize, numHumans]);

  /* ── Inbound Message Dispatcher ── */
  const handleServerMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'room_state':
        if (msg.agents && msg.agents.length > 0) {
          setAgents(msg.agents);
        } else if (msg.seats && msg.seats.length > 0) {
          setAgents(prev => (prev && prev.length > 0 ? prev : msg.seats.map(s => ({
            id: s.seat_id,
            name: s.character_name,
            personality: s.character_archetype,
            is_alive: s.is_alive ?? true,
            is_human: s.control_type === 'human',
            control_type: s.control_type,
            player_id: s.player_id,
            player_name: s.player_name,
          }))));
        }
        if (msg.join_code) setJoinCode(msg.join_code);
        break;

      case 'game_state':
        if (msg.agents && msg.agents.length > 0) {
          setAgents(msg.agents);
        }
        setRoundNumber(msg.round_number || 1);
        setPhase(msg.phase || 'discussion');
        if (msg.trust_data) setTrustData(msg.trust_data);
        if (msg.join_code) setJoinCode(msg.join_code);
        if (msg.claims) setClaims(msg.claims);
        if (msg.contradictions) setContradictions(msg.contradictions);
        if (msg.social_heat) setSocialHeat(msg.social_heat);
        if (msg.influence_events) setInfluenceEvents(msg.influence_events);
        if (msg.social_events) setSocialEvents(msg.social_events);
        if (msg.court_analysis) setCourtAnalysis(msg.court_analysis);
        setIsProcessing(false);
        break;

      case 'observatory_update':
        if (msg.claims) setClaims(msg.claims);
        if (msg.contradictions) setContradictions(msg.contradictions);
        if (msg.influence_events) setInfluenceEvents(msg.influence_events);
        if (msg.social_heat) setSocialHeat(msg.social_heat);
        if (msg.social_events) setSocialEvents(msg.social_events);
        if (msg.court_analysis) setCourtAnalysis(msg.court_analysis);
        break;

      case 'contradiction_detected':
        if (msg.contradiction) {
          setContradictions(prev => [msg.contradiction, ...prev]);
          setActiveContradictionAlert(msg.contradiction);
          courtAudio.playContradiction();
          addCourtNotice(`CONTRADICTION DETECTED: ${msg.contradiction.description}`, 'alert');
        }
        break;

      case 'relationship_dossier':
        if (msg.dossier) {
          setDossierState(prev => ({
            ...prev,
            dossierData: msg.dossier,
            isOpen: true,
          }));
        }
        break;

      case 'player_joined':
        addCourtNotice(`${msg.player_name || 'A noble'} has entered the Court.`, 'join');
        break;

      case 'player_left':
        addCourtNotice(
          `${msg.player_name || 'A noble'} has left the Court.${
            msg.grace_seconds ? ` (${msg.grace_seconds}s reconnect window)` : ' AI control assumed.'
          }`,
          'leave'
        );
        break;

      case 'control_changed':
        if (msg.control_type === 'ai') {
          addCourtNotice(`SEAT CONTINUITY: ${msg.player_name || 'Noble'} has left the court. Her seat remains occupied under AI control.`, 'takeover');
        } else {
          addCourtNotice(`SEAT RECLAIMED: ${msg.player_name || 'Noble'} has returned. AI control ended. Court history remains intact.`, 'return');
        }
        break;

      case 'player_returned':
        addCourtNotice(`SEAT RECLAIMED: ${msg.player_name || 'A noble'} has returned to the Court.`, 'return');
        if (msg.player_id === playerId) {
          setCatchUpData({
            isOpen: true,
            awaySeconds: msg.away_seconds || 0,
            events: msg.recent_events || [],
          });
        }
        break;

      case 'host_transferred':
        addCourtNotice(`Lordship transferred: ${msg.new_host_name || 'A peer'} is now Court Host.`, 'info');
        break;

      case 'speaker_thinking':
        setActiveSpeaker({
          id: msg.speaker_id,
          name: msg.speaker_name,
        });
        break;

      case 'statement':
        setActiveSpeaker(null); // Clear thinking state upon speech arrival
        courtAudio.playParchment();
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          type: 'statement',
          speakerId: msg.speaker_id,
          speakerName: msg.speaker_name,
          text: msg.text,
          roundNumber: msg.round_number,
          tag: msg.tag || null,
          target_name: msg.target_name || null,
          is_human: msg.is_human || false,
        }]);

        // Add to timeline if accusation or question
        if (msg.tag === 'ACCUSATION' || msg.tag === 'QUESTION') {
          setTimelineEvents(prev => [{
            roundNumber: msg.round_number,
            badge: msg.tag,
            title: `${msg.speakerName} leveled ${msg.tag.toLowerCase()} at ${msg.target_name || 'the court'}`,
            detail: msg.text,
          }, ...prev]);
        }
        break;

      case 'trust_update':
        setTrustData(msg.trust_data || {});
        if (msg.agents) setAgents(msg.agents);
        if (msg.social_heat) {
          setSocialHeat(msg.social_heat);
          // Feature 5: Detect high social heat crossings (>= 60)
          msg.social_heat.forEach(h => {
            if (h.heat_score >= 60 && (h.tension_level === 'VOLATILE' || h.tension_level === 'TENSE')) {
              addCourtNotice(`SOCIAL HEAT RISING: ${h.agent_a_name} ↔ ${h.agent_b_name} - TENSION ${h.heat_score} (${h.tension_level})`, 'alert');
            }
          });
        }
        if (msg.influence_events) setInfluenceEvents(msg.influence_events);
        if (msg.contradictions) setContradictions(msg.contradictions);

        // Process significant trust delta shifts (>= 15 points)
        if (msg.trust_log && msg.trust_log.length > 0) {
          const now = Date.now();
          const bigDeltas = msg.trust_log
            .filter(entry => Math.abs(entry.delta) >= 15)
            .map((entry, i) => ({
              id: `${now}-${i}`,
              sourceId: entry.evaluator_id,
              sourceName: entry.evaluator_name,
              targetId: entry.target_id,
              targetName: entry.target_name,
              delta: entry.delta,
              reason: entry.reason || '',
              timestamp: now + i * 50,
            }));

          if (bigDeltas.length > 0) {
            courtAudio.playTension();
            trustDeltasRef.current = [...trustDeltasRef.current, ...bigDeltas];
            setTrustNotifications(prev => [...prev, ...bigDeltas].slice(-4));

            // Log major shift into case timeline
            bigDeltas.forEach(d => {
              setTimelineEvents(prev => [{
                roundNumber: roundNumber,
                badge: 'TRUST SHIFT',
                title: `${d.sourceName} → ${d.targetName} (${d.delta > 0 ? '+' : ''}${d.delta})`,
                detail: d.reason,
              }, ...prev]);
            });
          }
        }
        break;

      case 'phase_change':
        setPhase(msg.phase);
        setRoundNumber(msg.round_number || roundNumber);
        setIsProcessing(false);
        if (msg.phase === 'voting') {
          courtAudio.playTension();
        }
        break;

      case 'reveal':
        setRevealInfo(msg);
        setPhase('reveal');
        courtAudio.playVerdict();
        if (msg.agents) setAgents(msg.agents);
        if (msg.court_analysis) setCourtAnalysis(msg.court_analysis);
        setIsProcessing(false);

        // Log formal exile decree in timeline
        setTimelineEvents(prev => [{
          roundNumber: roundNumber,
          badge: 'DECREE',
          title: `${msg.eliminated} was banished from Whisper Court`,
          detail: `True Role: ${msg.true_role.toUpperCase()} (${msg.votes_received} votes)`,
        }, ...prev]);
        break;

      case 'win':
        setWinResult(msg);
        setPhase('ended');
        courtAudio.playVerdict();
        if (msg.court_analysis) setCourtAnalysis(msg.court_analysis);
        setIsProcessing(false);
        setIsDemoMode(false);
        break;

      case 'processing':
        setIsProcessing(true);
        break;

      default:
        console.log('[WhisperCourt] Message:', msg);
    }
  }, [roundNumber, addCourtNotice, playerId]);

  /* ── Dispatch Helper ── */
  const sendAction = useCallback((action) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(action));
    }
  }, []);

  /* ── Open Relationship Dossier ("Why did trust change?") ── */
  const handleOpenDossier = useCallback((evaluatorId, targetId) => {
    const evAgent = agents.find(a => a.id === evaluatorId);
    const tgAgent = agents.find(a => a.id === targetId);
    if (!evAgent || !tgAgent) return;

    setDossierState({
      isOpen: true,
      evaluator: evAgent,
      target: tgAgent,
      dossierData: null,
    });

    sendAction({ action: 'get_dossier', evaluator_id: evaluatorId, target_id: targetId });
  }, [agents, sendAction]);

  /* ── Player Action Triggers ── */
  const mySeat = useMemo(() => {
    return agents.find(a => a.player_id === playerId) || agents.find(a => a.is_human);
  }, [agents, playerId]);

  const isSeatAiControlled = mySeat?.control_type === 'ai';

  const handleReclaimSeat = () => {
    sendAction({ action: 'reclaim_seat' });
  };

  const handleAskQuestion = (targetId, question) => {
    sendAction({ action: 'question', target_id: targetId, question });
  };

  const handleAccuse = (targetId, reason) => {
    courtAudio.playTension();
    sendAction({ action: 'accuse', target_id: targetId, reason });
  };

  const handleDefend = (statement) => {
    sendAction({ action: 'defend', statement });
  };

  const handleStaySilent = () => {
    sendAction({ action: 'stay_silent' });
    addCourtNotice('YOU REMAINED SILENT - Observing the chamber proceedings.', 'info');
  };

  const handleCastVote = (accusedId) => {
    sendAction({ action: 'vote', accused_id: accusedId });
    setIsProcessing(true);
  };

  const handleNextRound = () => {
    courtAudio.playGavel();
    sendAction({ action: 'next_round' });
    setIsProcessing(true);
    setRevealInfo(null);
  };

  const handleRunDemo = () => {
    setIsDemoMode(true);
    courtAudio.playGavel();
    sendAction({ action: 'run_demo', rounds: 2, delay: 1.5 });
    setIsProcessing(true);
    setRevealInfo(null);
  };

  /* ── Courtier Graph Label Formatter (Compact & Collision-Free) ── */
  const formatCourtierGraphLabel = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return parts[0];
    return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
  };

  /* ── Force Graph Data Preparation ── */
  const graphData = useMemo(() => {
    const N = agents.length;
    const nodes = agents.map((agent, i) => {
      // Deterministic elliptical placement adapting to actual graph dimensions
      const angle = (i / Math.max(1, N)) * 2 * Math.PI - Math.PI / 2;
      const radiusX = Math.min(graphDimensions.width * 0.36, 145);
      const radiusY = Math.min(graphDimensions.height * 0.32, 95);
      return {
        id: agent.id,
        name: agent.name,
        alive: agent.is_alive,
        color: agent.is_alive ? agentColor(agent.id) : '#333742',
        isSpeaking: activeSpeaker?.id === agent.id,
        isSelected: selectedAgentId === agent.id,
        x: radiusX * Math.cos(angle),
        y: radiusY * Math.sin(angle),
      };
    });

    const links = [];
    const seenPairs = new Set();

    for (const [sourceId, targets] of Object.entries(trustData)) {
      for (const [targetId, score] of Object.entries(targets || {})) {
        const pairKey = [sourceId, targetId].sort().join('::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const reverseScore = trustData[targetId]?.[sourceId] ?? score;
        const avgTrust = (score + reverseScore) / 2;

        const sourceAlive = agents.find(a => a.id === sourceId)?.is_alive;
        const targetAlive = agents.find(a => a.id === targetId)?.is_alive;
        if (!sourceAlive || !targetAlive) continue;

        links.push({
          source: sourceId,
          target: targetId,
          trust: avgTrust,
          width: Math.max(0.6, (avgTrust / 100) * 4),
          opacity: Math.max(0.12, avgTrust / 100),
        });
      }
    }

    return { nodes, links };
  }, [agents, trustData, agentColor, activeSpeaker, selectedAgentId, graphDimensions.width, graphDimensions.height]);

  /* ── Canvas Custom Node Painter with Radial Label Offset & Protective Pill ── */
  const paintNode = useCallback((node, ctx) => {
    const size = node.alive ? 7 : 4;
    const label = formatCourtierGraphLabel(node.name);

    // Glowing aura if currently speaking or selected
    if (node.isSpeaking) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(198, 161, 91, 0.35)';
      ctx.fill();
    } else if (node.isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(216, 183, 116, 0.22)';
      ctx.fill();
    }

    // Node body
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.alive ? '#1A1D24' : '#22252C';
    ctx.fill();

    // Node border
    ctx.strokeStyle = node.isSpeaking ? '#E0C788' : (node.alive ? (node.color || '#C6A15B') : '#4B5263');
    ctx.lineWidth = node.isSpeaking ? 3 : (node.alive ? 2 : 1);
    ctx.stroke();

    // Smart radial label placement:
    // Nodes in the upper half of the ring (node.y < 0) render labels ABOVE the node.
    // Nodes in the lower half (node.y >= 0) render labels BELOW the node.
    // This pushes labels radially outward away from the busy center links!
    const isTop = (node.y || 0) < 0;
    const fontStr = `${node.isSpeaking ? 'bold 10px' : (node.alive ? '600 9.5px' : '400 8.5px')} Cinzel, Georgia, serif`;
    ctx.font = fontStr;
    const textWidth = ctx.measureText(label).width;
    const pillW = textWidth + 10;
    const pillH = 15;
    const pillY = isTop ? (node.y - size - 6 - pillH) : (node.y + size + 6);
    const textY = pillY + pillH / 2;

    // Protective dark pill background with subtle border
    ctx.fillStyle = node.isSpeaking ? 'rgba(28, 22, 14, 0.94)' : 'rgba(11, 13, 16, 0.88)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(node.x - pillW / 2, pillY, pillW, pillH, 3);
    } else {
      ctx.rect(node.x - pillW / 2, pillY, pillW, pillH);
    }
    ctx.fill();

    ctx.strokeStyle = node.isSpeaking ? 'rgba(224, 199, 136, 0.75)' : 'rgba(65, 74, 90, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Centered label text inside pill
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = node.isSpeaking ? '#FFF6E0' : (node.alive ? '#E8DEC8' : '#7A8290');
    ctx.fillText(label, node.x, textY);
  }, []);

  /* ── Canvas Custom Link Painter (With Floating Delta Labels) ── */
  const paintLink = useCallback((link, ctx) => {
    const trustColor = link.trust > 60
      ? `rgba(46, 125, 91, ${link.opacity})`   // Muted Emerald
      : link.trust > 35
        ? `rgba(140, 142, 148, ${link.opacity})` // Warm Charcoal / Grey
        : `rgba(180, 44, 44, ${link.opacity})`;  // Muted Crimson

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = trustColor;
    ctx.lineWidth = link.width;
    ctx.stroke();

    // Floating delta labels
    const now = Date.now();
    const deltas = trustDeltasRef.current;
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    for (const d of deltas) {
      const matches =
        (d.sourceId === sourceId && d.targetId === targetId) ||
        (d.sourceId === targetId && d.targetId === sourceId);
      if (!matches) continue;

      const age = now - d.timestamp;
      if (age > 3500) continue;

      const opacity = Math.max(0, 1 - age / 3500);
      const floatY = -(age / 3500) * 16;

      const midX = ((link.source.x || 0) + (link.target.x || 0)) / 2;
      const midY = ((link.source.y || 0) + (link.target.y || 0)) / 2 + floatY;

      const sign = d.delta > 0 ? '+' : '';
      const label = `${sign}${d.delta}`;
      const reasonShort = d.reason.length > 22 ? d.reason.substring(0, 22) + '…' : d.reason;

      ctx.font = 'bold 9px Inter, sans-serif';
      const textWidth = ctx.measureText(`${label} (${reasonShort})`).width;
      const pillW = textWidth + 10;
      const pillH = 16;

      const bgColor = d.delta > 0
        ? `rgba(35, 99, 72, ${opacity * 0.9})`
        : `rgba(155, 44, 44, ${opacity * 0.9})`;

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 3);
      ctx.fill();

      ctx.fillStyle = `rgba(245, 237, 226, ${opacity})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${label} (${reasonShort})`, midX, midY);
    }
  }, []);

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-[#08090B] text-[#E8DEC8] select-none relative overflow-y-auto lg:overflow-hidden">
      {/* ── Feature 1: Cinematic Court Phase Overlay ── */}
      <PhaseTransitionOverlay
        currentPhase={phase}
        roundNumber={roundNumber}
      />

      {/* ── Court In-Game Notices Banner ── */}
      <CourtNotice
        notices={courtNotices}
        onDismiss={(id) => setCourtNotices(prev => prev.filter(n => n.id !== id))}
      />

      {/* ── Top Court Header ── */}
      <CourtHeader
        roundNumber={roundNumber}
        phase={phase}
        onOpenCaseTimeline={() => setIsCaseTimelineOpen(true)}
        onOpenObservatory={() => setIsObservatoryOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenReplay={() => setIsReplayOpen(true)}
        onOpenTranscript={() => setIsTranscriptOpen(true)}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
        connected={connected}
        gmView={settings.gmView}
        isDemoMode={isDemoMode}
        joinCode={joinCode}
        activeContradictionsCount={contradictions.length}
      />

      {/* ── GM View Caution Warning Strip ── */}
      {settings.gmView && (
        <div className="w-full bg-[#2A2312] border-b border-[#C6A15B]/50 px-4 py-1 text-center shrink-0 flex items-center justify-center gap-2">
          <span className="text-xs">⚠️</span>
          <span className="text-[11px] font-mono text-[#D8B774] uppercase tracking-wider">
            Game Master Debug Mode Enabled - Secret Alignments Visible • Ensure disabled for demo captures
          </span>
        </div>
      )}

      {/* ── Connection Error Banner ── */}
      {connectionError && (
        <ErrorBanner
          type={connectionError}
          onRetry={() => {
            setConnectionError(null);
            setPhase(p => p);
          }}
          onReturnMenu={onReturnToMenu}
        />
      )}

      {/* ── Main Viewport Content (Responsive Desktop Layout with User-Resizable Sidebar) ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
        {/* ── LEFT / CENTER: THE CHAMBER (Conversation & Testimonies) ── */}
        <div className="w-full lg:flex-1 flex flex-col border-b lg:border-b-0 border-[#1F232B] bg-[#0A0C0F]/95 relative min-h-[480px] lg:min-h-0 min-w-0">
          
          {/* ── Feature 6: Surfaced Contradiction Alert Banner in Chamber ── */}
          {activeContradiction && (
            <div className="px-4 pt-3">
              <ContradictionBanner
                contradiction={activeContradiction}
                onInvestigate={() => setIsObservatoryOpen(true)}
                onDismiss={() => {
                  setDismissedContradictionIds(prev => new Set(prev).add(activeContradiction.description));
                  setActiveContradictionAlert(null);
                }}
              />
            </div>
          )}

          {/* Testimonies Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
            {messages.length === 0 && !activeSpeaker && (
              <div className="flex items-center justify-center h-full text-center text-[#726E65]">
                <div className="max-w-md p-6 border border-[#1F232B] bg-[#0E1014]/60">
                  <span className="text-3xl text-[#C6A15B] font-serif block mb-2">⚜</span>
                  <h3 className="font-title text-sm uppercase tracking-widest text-[#E8DEC8] mb-1">
                    The Chamber Awaits
                  </h3>
                  <p className="text-xs font-serif italic text-[#A8A295] leading-relaxed">
                    The lords and ladies have assembled under royal decree. Order the inquiry to proceed or run the full automated demo below.
                  </p>
                </div>
              </div>
            )}

            {/* Testimonies Stream */}
            {messages.map((msg, index) => {
              const persona = COURT_PERSONAS.find(p => p.name === msg.speakerName);
              const isLastStatement = index === messages.length - 1 && !activeSpeaker;
              const agentObj = agents.find(a => a.id === msg.speakerId);

              // Gather matching trust delta reactions for this statement
              const reactions = (timelineEvents || [])
                .filter(ev => ev.badge === 'TRUST SHIFT' && ev.roundNumber === msg.roundNumber)
                .slice(0, 3)
                .map(ev => ({
                  evaluatorName: ev.title?.split('→')?.[0]?.trim() || 'Peer',
                  delta: ev.title?.includes('+') ? 15 : -15,
                  reason: ev.detail,
                }));

              return (
                <TestimonyCard
                  key={msg.id}
                  message={msg}
                  archetype={persona?.archetype}
                  agentColor={agentColor(msg.speakerId)}
                  gmView={settings.gmView}
                  isTraitor={agentObj?.role === 'traitor'}
                  isFocused={isLastStatement}
                  isDimmed={Boolean(activeSpeaker)}
                  trustReactions={reactions}
                  onInspectCharacter={(aid) => setSelectedAgentId(aid)}
                  onInspectEvidence={() => setIsObservatoryOpen(true)}
                />
              );
            })}

            {/* Active Speaker Thinking Card */}
            {activeSpeaker && (
              <ThinkingCard
                speakerName={activeSpeaker.name}
                archetype={COURT_PERSONAS.find(p => p.name === activeSpeaker.name)?.archetype}
                color={agentColor(activeSpeaker.id)}
              />
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── BOTTOM: Player Action Controls (Persistent) ── */}
          <div className="p-4 border-t border-[#1F232B] bg-[#0E1015] shrink-0 space-y-3">
            {/* AI Control Notice Banner if Seat is Temporarily Controlled by AI */}
            {isSeatAiControlled && (
              <div className="flex items-center justify-between p-2.5 bg-[#251E14] border border-[#C6A15B]/50 text-xs animate-fade-in">
                <div className="flex items-center gap-2 text-[#D8B774] font-serif">
                  <span className="text-sm">⚙</span>
                  <span>Autonomous AI is currently commanding your seat.</span>
                </div>
                <button
                  onClick={handleReclaimSeat}
                  className="px-3 py-1 bg-[#C6A15B]/20 hover:bg-[#C6A15B]/35 border border-[#C6A15B] text-[#E8DEC8] text-[10px] font-title uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Reclaim Control
                </button>
              </div>
            )}

            {/* Feature 7, 8, 9: YOU HAVE THE FLOOR Decision Window */}
            {phase === 'discussion' && !isDemoMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-title uppercase tracking-widest text-[#C6A15B] font-bold">
                    <span>⚜</span>
                    <span>YOU HAVE THE FLOOR</span>
                  </div>
                  <span className="text-[10px] font-serif italic text-[#8A857A]">
                    {isSeatAiControlled
                      ? 'AI CONTROLS YOUR SEAT - Reclaim above to participate'
                      : isProcessing
                        ? 'WAIT FOR TESTIMONY TO CONCLUDE…'
                        : 'Every word moves private trust and enters court memory'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsInterrogationOpen(true)}
                    disabled={isProcessing || isSeatAiControlled}
                    className="flex-1 py-2 px-3 font-title text-xs tracking-wider uppercase border border-[#2A3445] bg-[#121722] hover:bg-[#1A2233] hover:border-[#3D4F6E] text-[#D8E4F8] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isProcessing ? "Wait for current testimony to finish" : isSeatAiControlled ? "Reclaim seat to question" : "Direct an inquiry to any living attendee"}
                  >
                    <span>❓</span>
                    <span>Question</span>
                  </button>

                  <button
                    onClick={() => setIsAccusationOpen(true)}
                    disabled={isProcessing || isSeatAiControlled}
                    className="flex-1 py-2 px-3 font-title text-xs tracking-wider uppercase border border-[#3A1E1E] bg-[#1C1212] hover:bg-[#2B1414] hover:border-[#8A2626] text-[#E88C8C] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isProcessing ? "Wait for current testimony to finish" : isSeatAiControlled ? "Reclaim seat to accuse" : "Level formal charges on record against a suspect"}
                  >
                    <span>⚔</span>
                    <span>Accuse</span>
                  </button>

                  <button
                    onClick={() => setIsDefenseOpen(true)}
                    disabled={isProcessing || isSeatAiControlled}
                    className="flex-1 py-2 px-3 font-title text-xs tracking-wider uppercase border border-[#1A2E22] bg-[#111A14] hover:bg-[#17281D] hover:border-[#2E7D5B] text-[#8CE8B5] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isProcessing ? "Wait for current testimony to finish" : isSeatAiControlled ? "Reclaim seat to speak" : "Deliver a spoken defense before the council"}
                  >
                    <span>🛡</span>
                    <span>Defend</span>
                  </button>

                  <button
                    onClick={handleStaySilent}
                    disabled={isProcessing || isSeatAiControlled}
                    className="py-2 px-3 font-title text-xs tracking-wider uppercase border border-[#232730] bg-[#101217] hover:bg-[#161922] text-[#8A857A] hover:text-[#E8DEC8] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isProcessing ? "Wait for current testimony to finish" : isSeatAiControlled ? "Reclaim seat" : "Remain silent and observe proceedings"}
                  >
                    <span>🤫</span>
                    <span>Stay Silent</span>
                  </button>
                </div>
              </div>
            )}

            {/* Progression & Demo Bar */}
            <div className="flex items-center gap-3">
              {(phase === 'discussion' || phase === 'reveal') && (
                <>
                  <button
                    onClick={handleNextRound}
                    disabled={isProcessing || phase === 'ended'}
                    className="flex-1 py-2.5 px-4 btn-court-primary text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-[#C6A15B]" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>The Council Deliberates...</span>
                      </>
                    ) : phase === 'reveal' ? (
                      <span>⚔ Continue to Next Round</span>
                    ) : (
                      <span>⚔ Next Testimony</span>
                    )}
                  </button>

                  <button
                    onClick={handleRunDemo}
                    disabled={isProcessing || phase === 'ended' || isDemoMode}
                    className="py-2.5 px-5 btn-court-secondary text-xs flex items-center gap-2 cursor-pointer hover:border-[#C6A15B]/50 hover:text-[#E8DEC8] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Auto-plays 2 discussion rounds with 1.5s delay, then votes automatically for demo video recording"
                  >
                    <span>🎬</span>
                    <span>{isDemoMode ? 'Demo In Progress...' : 'Run Full Demo'}</span>
                  </button>
                </>
              )}

              {/* Game Ended Action */}
              {phase === 'ended' && winResult && (
                <div className="w-full flex flex-col sm:flex-row items-center justify-between p-3.5 bg-[#121417] border border-[#23272E] gap-3">
                  <div>
                    <span className="font-title text-xs tracking-wider uppercase text-[#E8DEC8] block font-bold">
                      {winResult.result === 'innocents_win' ? '⚜ Royal Triumph' : '💀 The Court Has Fallen'}
                    </span>
                    <span className="text-[11px] font-serif italic text-[#8A857A]">
                      All council testimonies concluded.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setIsObservatoryOpen(true)}
                      className="px-3 py-1.5 bg-[#181B22] border border-[#2D3340] hover:border-[#C6A15B] text-[11px] font-title uppercase tracking-wider text-[#E8DEC8] cursor-pointer"
                    >
                      Court Analysis
                    </button>
                    <button
                      onClick={() => setIsReplayOpen(true)}
                      className="px-3 py-1.5 bg-[#181B22] border border-[#2D3340] hover:border-[#C6A15B] text-[11px] font-title uppercase tracking-wider text-[#E8DEC8] cursor-pointer"
                    >
                      Social Replay
                    </button>
                    <button
                      onClick={onRestartCourt}
                      className="px-3 py-1.5 btn-court-primary text-[11px] tracking-wider cursor-pointer"
                    >
                      Restart Court
                    </button>
                    <button
                      onClick={onReturnToMenu}
                      className="px-3 py-1.5 btn-court-secondary text-[11px] tracking-wider cursor-pointer"
                    >
                      Return to Menu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Vertical Resize Divider between Chamber and Sidebar (Desktop) ── */}
        <div
          onMouseDown={handleStartDragVertical}
          className={`hidden lg:flex items-center justify-center w-2 -mx-1 relative z-30 cursor-col-resize group select-none transition-colors shrink-0 ${
            activeDrag === 'vertical' ? 'bg-[#C6A15B]/20' : 'hover:bg-[#C6A15B]/10'
          }`}
          title="Drag left/right to resize court and sidebar"
          aria-label="Resize sidebar width"
        >
          <div className={`h-full w-[1px] transition-colors ${
            activeDrag === 'vertical' ? 'bg-[#C6A15B]' : 'bg-[#1F232B] group-hover:bg-[#C6A15B]/60'
          }`} />
          <div className={`absolute py-2 px-0.5 rounded-sm border transition-colors flex flex-col items-center gap-1 shadow-sm ${
            activeDrag === 'vertical'
              ? 'bg-[#181A1F] border-[#C6A15B] text-[#C6A15B]'
              : 'bg-[#0D0F13] border-[#2A2E38] text-[#55524A] group-hover:border-[#C6A15B]/60 group-hover:text-[#C6A15B]'
          }`}>
            <span className="h-3.5 w-[2px] bg-current rounded-full block opacity-80" />
          </div>
        </div>

        {/* ── RIGHT: THE COURT (Trust Network, Roster & Dossier) ── */}
        <div
          ref={sidebarContainerRef}
          style={{ width: isDesktop ? `${sidebarWidth}px` : undefined }}
          className="flex flex-col w-full lg:w-auto bg-[#08090B] overflow-y-auto lg:overflow-hidden border-t lg:border-t-0 border-[#1F232B] shrink-0"
        >
          {/* 1. TRUST NETWORK (Top Panel) */}
          <div
            style={{ height: isDesktop ? `${topPanelHeight}px` : undefined }}
            className="flex flex-col border-b border-[#1F232B] shrink-0 min-h-[220px]"
          >
            <div className="px-4 py-2 border-b border-[#1F232B] flex items-center justify-between bg-[#0B0D10] shrink-0">
              <div>
                <h3 className="font-title text-xs uppercase tracking-wider text-[#C6A15B] font-semibold">
                  Trust Network
                </h3>
                <p className="text-[10px] text-[#7A756C] font-serif italic">
                  Private relationships are shifting beneath the conversation.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-[#8A857A]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2E7D5B]" /> Trust
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#C53030]" /> Distrust
                </span>
              </div>
            </div>

            <div ref={graphContainerRef} className="flex-1 relative overflow-hidden force-graph-container bg-[#08090B] min-h-0">
              <ForceGraph2D
                ref={fgRef}
                width={graphDimensions.width}
                height={graphDimensions.height}
                graphData={graphData}
                nodeCanvasObject={paintNode}
                linkCanvasObject={paintLink}
                cooldownTicks={70}
                linkDirectionalParticles={settings.animations ? 2 : 0}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={() => '#C6A15B'}
                backgroundColor="#08090B"
                enableNodeDrag={true}
                enableZoomInteraction={true}
                onNodeClick={(node) => setSelectedAgentId(node.id)}
                onLinkClick={(link) => {
                  const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                  const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                  handleOpenDossier(srcId, tgtId);
                }}
              />

              {/* Restrained Court Zoom & Fit Controls */}
              <div className="absolute top-2.5 right-2.5 z-10 flex flex-col bg-[#0D0F13]/90 border border-[#23272E] shadow-lg rounded-[2px] select-none">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-6 h-6 flex items-center justify-center text-[#A8A295] hover:text-[#E8DEC8] hover:bg-[#1A1D24] text-xs font-mono transition-colors border-b border-[#23272E] cursor-pointer"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-6 h-6 flex items-center justify-center text-[#A8A295] hover:text-[#E8DEC8] hover:bg-[#1A1D24] text-xs font-mono transition-colors border-b border-[#23272E] cursor-pointer"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="px-1.5 h-5 flex items-center justify-center text-[#8A857A] hover:text-[#C6A15B] hover:bg-[#1A1D24] text-[9px] font-title uppercase tracking-widest transition-colors cursor-pointer"
                  title="Fit Network to Viewport"
                  aria-label="Fit Network"
                >
                  Fit
                </button>
              </div>
            </div>
          </div>

          {/* ── Separator A: between Trust Network and Living Court ── */}
          <div
            onMouseDown={handleStartDragSepA}
            className={`hidden lg:flex items-center justify-center h-2 -my-1 relative z-20 cursor-row-resize group select-none transition-colors shrink-0 ${
              activeDrag === 'sepA' ? 'bg-[#C6A15B]/20' : 'hover:bg-[#C6A15B]/10'
            }`}
            title="Drag up/down to resize Trust Network & Living Court"
            aria-label="Resize Trust Network and Living Court"
          >
            <div className={`w-full h-[1px] transition-colors ${
              activeDrag === 'sepA' ? 'bg-[#C6A15B]' : 'bg-[#1F232B] group-hover:bg-[#C6A15B]/60'
            }`} />
            <div className={`absolute px-2 py-0.5 rounded-sm border transition-colors flex items-center gap-1 shadow-sm ${
              activeDrag === 'sepA'
                ? 'bg-[#181A1F] border-[#C6A15B] text-[#C6A15B]'
                : 'bg-[#0D0F13] border-[#2A2E38] text-[#55524A] group-hover:border-[#C6A15B]/60 group-hover:text-[#C6A15B]'
            }`}>
              <span className="w-3.5 h-[2px] bg-current rounded-full block opacity-80" />
            </div>
          </div>

          {/* 2. LIVING COURT ROSTER (Middle Panel) */}
          <div
            style={{ height: isDesktop ? `${midPanelHeight}px` : undefined }}
            className="shrink-0 flex flex-col min-h-[180px] overflow-hidden"
          >
            <CourtRoster
              agents={agents}
              activeSpeakerId={activeSpeaker?.id}
              selectedAgentId={selectedAgentId}
              onSelectAgent={(aid) => setSelectedAgentId(aid)}
              agentColor={agentColor}
              gmView={settings.gmView}
              currentPlayerId={playerId}
              recentlyAccusedIds={recentlyAccusedIds}
            />
          </div>

          {/* ── Separator B: between Living Court and Selected Noble / Dossier ── */}
          <div
            onMouseDown={handleStartDragSepB}
            className={`hidden lg:flex items-center justify-center h-2 -my-1 relative z-20 cursor-row-resize group select-none transition-colors shrink-0 ${
              activeDrag === 'sepB' ? 'bg-[#C6A15B]/20' : 'hover:bg-[#C6A15B]/10'
            }`}
            title="Drag up/down to resize Living Court & Dossier"
            aria-label="Resize Living Court and Dossier"
          >
            <div className={`w-full h-[1px] transition-colors ${
              activeDrag === 'sepB' ? 'bg-[#C6A15B]' : 'bg-[#1F232B] group-hover:bg-[#C6A15B]/60'
            }`} />
            <div className={`absolute px-2 py-0.5 rounded-sm border transition-colors flex items-center gap-1 shadow-sm ${
              activeDrag === 'sepB'
                ? 'bg-[#181A1F] border-[#C6A15B] text-[#C6A15B]'
                : 'bg-[#0D0F13] border-[#2A2E38] text-[#55524A] group-hover:border-[#C6A15B]/60 group-hover:text-[#C6A15B]'
            }`}>
              <span className="w-3.5 h-[2px] bg-current rounded-full block opacity-80" />
            </div>
          </div>

          {/* 3. CHARACTER DOSSIER PANEL (Bottom Panel) */}
          <div className="flex-1 min-h-[160px] overflow-y-auto p-3 bg-[#08090B]">
            {selectedAgent ? (
              <DossierPanel
                agent={selectedAgent}
                recentTestimonies={selectedAgentTestimonies}
                onClose={() => setSelectedAgentId(null)}
                agentColor={agentColor(selectedAgent.id)}
                gmView={settings.gmView}
              />
            ) : (
              <div className="h-full border border-dashed border-[#1C2028] flex items-center justify-center p-6 text-center text-[#5A574E]">
                <div>
                  <span className="text-xl text-[#3A3830] block mb-1">📜</span>
                  <p className="font-title text-[11px] uppercase tracking-wider text-[#726E65]">
                    Select any noble
                  </p>
                  <p className="text-[10px] font-serif italic text-[#55524A] mt-0.5">
                    Click a dignitary in the roster or graph to inspect their public record.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS & OVERLAYS ── */}

      {/* 1. DEDICATED VOTING VIEW */}
      {phase === 'voting' && (
        <VotingView
          livingAgents={livingAgents}
          trustData={trustData}
          contradictions={contradictions}
          onCastVote={handleCastVote}
          isProcessing={isProcessing}
          agentColor={agentColor}
          currentAgentId={mySeat?.id}
          currentPlayerId={playerId}
        />
      )}

      {/* 2. VERDICT REVEAL MODAL */}
      <VerdictModal
        revealInfo={revealInfo}
        roundNumber={roundNumber}
        onAcknowledge={() => setRevealInfo(null)}
        onOpenAnalysis={() => setIsObservatoryOpen(true)}
        onOpenReplay={() => setIsReplayOpen(true)}
        onOpenTranscript={() => setIsTranscriptOpen(true)}
      />

      {/* 3. INTERROGATION / QUESTION MODAL */}
      <InterrogationModal
        isOpen={isInterrogationOpen}
        livingAgents={livingAgents}
        trustData={trustData}
        contradictions={contradictions}
        onClose={() => setIsInterrogationOpen(false)}
        onSubmitQuestion={handleAskQuestion}
        isProcessing={isProcessing}
        currentAgentId={mySeat?.id}
        currentPlayerId={playerId}
      />

      {/* 4. ACCUSATION MODAL */}
      <AccusationModal
        isOpen={isAccusationOpen}
        livingAgents={livingAgents}
        contradictions={contradictions}
        onClose={() => setIsAccusationOpen(false)}
        onSubmitAccusation={handleAccuse}
        isProcessing={isProcessing}
        currentAgentId={mySeat?.id}
        currentPlayerId={playerId}
      />

      {/* 5. DEFENSE MODAL */}
      <DefenseModal
        isOpen={isDefenseOpen}
        onClose={() => setIsDefenseOpen(false)}
        onSubmitDefense={handleDefend}
        isProcessing={isProcessing}
      />

      {/* 6. CASE / COURT RECORD TIMELINE DRAWER */}
      <CaseTimelineDrawer
        isOpen={isCaseTimelineOpen}
        onClose={() => setIsCaseTimelineOpen(false)}
        timelineEvents={timelineEvents}
      />

      {/* 7. TRUST SHIFT FLOATING TOASTS */}
      <TrustShiftToast
        notifications={trustNotifications}
        onDismiss={(id) => setTrustNotifications(prev => prev.filter(t => t.id !== id))}
      />

      {/* 8. IN-GAME RECESS MENU */}
      <GameMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onResume={() => setIsMenuOpen(false)}
        onRequestRestart={() => {
          setIsMenuOpen(false);
          setConfirmDialog('restart');
        }}
        onRequestReturnMenu={() => {
          setIsMenuOpen(false);
          setConfirmDialog('leave');
        }}
        onOpenSettings={() => {
          setIsMenuOpen(false);
          onOpenSettings();
        }}
      />

      {/* 9. CONFIRMATION DIALOG: LEAVE COURT */}
      <ConfirmModal
        isOpen={confirmDialog === 'leave'}
        title="Leave This Court?"
        message="Your current investigation, testimonies, and trust network will be discarded. Do you wish to withdraw to the main chamber?"
        confirmLabel="Leave Court"
        cancelLabel="Stay in Chamber"
        isDanger={true}
        onConfirm={() => {
          setConfirmDialog(null);
          onReturnToMenu();
        }}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* 10. CONFIRMATION DIALOG: RESTART COURT */}
      <ConfirmModal
        isOpen={confirmDialog === 'restart'}
        title="Restart Court?"
        message="The current court will be dissolved and re-convened with a fresh alignment of roles. Are you certain you wish to proceed?"
        confirmLabel="Restart Proceedings"
        cancelLabel="Cancel"
        isDanger={false}
        onConfirm={() => {
          setConfirmDialog(null);
          onRestartCourt();
        }}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* 11. RECONNECT CATCH-UP MODAL */}
      <CatchUpModal
        isOpen={catchUpData.isOpen}
        playerName={mySeat?.name || ''}
        awaySeconds={catchUpData.awaySeconds}
        recentEvents={catchUpData.events}
        onClose={() => setCatchUpData(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 12. THE AGENT OBSERVATORY DRAWER */}
      <ObservatoryDrawer
        isOpen={isObservatoryOpen}
        onClose={() => setIsObservatoryOpen(false)}
        socialHeat={socialHeat}
        contradictions={contradictions}
        influenceEvents={influenceEvents}
        socialEvents={socialEvents}
        claims={claims}
        courtAnalysis={courtAnalysis}
        phase={phase}
        roundNumber={roundNumber}
        agents={agents}
        onInspectRelationship={handleOpenDossier}
        agentColor={agentColor}
      />

      {/* 13. RELATIONSHIP CAUSAL DOSSIER MODAL */}
      <RelationshipDossierModal
        isOpen={dossierState.isOpen}
        onClose={() => setDossierState(prev => ({ ...prev, isOpen: false }))}
        evaluator={dossierState.evaluator}
        target={dossierState.target}
        dossierData={dossierState.dossierData}
        onRequestDossier={(evId, tgId) => sendAction({ action: 'get_dossier', evaluator_id: evId, target_id: tgId })}
        agentColor={agentColor}
      />

      {/* 14. Feature 19, 20, 21: COURT REPLAY MODAL (Strictly Read-Only, 0 Extra LLM Calls) */}
      <CourtReplayModal
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        socialEvents={socialEvents}
        messages={messages}
        contradictions={contradictions}
        socialHeat={socialHeat}
        agentColor={agentColor}
      />

      {/* 15. Feature 18: FULL COURT TRANSCRIPT MODAL */}
      <TranscriptModal
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        messages={messages}
        claims={claims}
        contradictions={contradictions}
        onInspectEvidence={() => setIsObservatoryOpen(true)}
      />
    </div>
  );
}
