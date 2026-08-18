/**
 * roomService.js — Supabase Realtime Rooms
 *
 * Uses Supabase Realtime Broadcast + Presence to replace the old WSS room server.
 *
 * - Broadcast: fire-and-forget playback events (PLAY_PAUSE, SEEK, SONG_CHANGE, SYNC, CHAT_MESSAGE)
 * - Presence: member tracking (join, leave, host promotion)
 *
 * No backend involvement — rooms are managed entirely by Supabase's edge.
 */

import { getSupabase } from './supabaseClient.js';
import player from './playerEngine.js';

class RoomService {
  constructor() {
    this.channel = null;
    this.roomCode = null;
    this.clientId = null;
    this.hostId = null;
    this.username = null;
    this.members = [];
    this.listeners = {};

    // Bind player hooks so we can detach them later
    this.onPlayerTimeUpdate = this.onPlayerTimeUpdate.bind(this);
    this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
    this.onPlayerSongChange = this.onPlayerSongChange.bind(this);
  }

  // ─── Event emitter ────────────────────────────────────────────────────────

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _genRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  _genClientId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /** Parse Supabase presence state → flat array of member objects */
  _parseMembers(presenceState) {
    return Object.values(presenceState).flat().map(p => ({
      id: p.clientId,
      username: p.username,
      isHost: p.isHost,
      isActive: true,
    }));
  }

  // ─── Connect ───────────────────────────────────────────────────────────────

  /**
   * @param {string} username  Display name
   * @param {'CREATE'|'JOIN'} action
   * @param {string|null} roomCode  Required when action === 'JOIN'
   */
  async connect(username, action, roomCode = null) {
    const sb = getSupabase();
    if (!sb) {
      this.emit('error', 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      return;
    }

    // ── Hard auth check ──────────────────────────────────────────────────────
    // Verify a live session before opening any Realtime channel.
    // This prevents unauthenticated users from bypassing the UI gate.
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      this.emit('error', 'You must be signed in to use Rooms.');
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    const isHost = action === 'CREATE';
    const code = isHost ? this._genRoomCode() : roomCode.toUpperCase().replace(/^PH-/, '');
    this.roomCode = code;
    this.clientId = this._genClientId();
    this.username = username;

    // Each room is its own Supabase Realtime channel
    const channelName = `room:${code}`;

    this.channel = sb.channel(channelName, {
      config: {
        // broadcast.self: false → we don't receive our own broadcasts
        broadcast: { self: false },
        // presence.key → identifies THIS client in the presence state
        presence: { key: this.clientId },
      },
    });

    this._setupPresence();
    this._setupBroadcast();

    // Subscribe, then track our presence once connected
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({
          clientId: this.clientId,
          username,
          isHost,
          joinedAt: Date.now(),
        });

        if (isHost) {
          this.hostId = this.clientId;
          this.emit('room_update', this);
        }

        this.attachPlayerHooks();
        console.log(`[Rooms] ${isHost ? 'Created' : 'Joined'} room PH-${code}`);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`[Rooms] Channel error: ${status}`);
        this.emit('error', 'Could not connect to room. Please try again.');
        this.cleanup();
      }
    });
  }

  // ─── Presence (member list) ────────────────────────────────────────────────

  _setupPresence() {
    // 'sync' fires once on join and whenever any member joins/leaves
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState();
      this.members = this._parseMembers(state);

      // Determine host from presence metadata
      const allPresences = Object.values(state).flat();
      const hostPresence = allPresences.find(p => p.isHost);
      if (hostPresence) this.hostId = hostPresence.clientId;

      this.emit('room_update', this);
    });

    // 'join' fires for each newly arrived member
    this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      newPresences.forEach(p => {
        if (p.clientId !== this.clientId) {
          this.emit('chat_message', { system: true, text: `${p.username} joined` });
        }
      });
    });

    // 'leave' fires for each departing member
    this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach(p => {
        this.emit('chat_message', { system: true, text: `${p.username} left` });

        // If the host left, promote the next member (if that's us, re-track as host)
        if (p.clientId === this.hostId) {
          const state = this.channel.presenceState();
          const remaining = Object.values(state).flat();

          if (remaining.length > 0) {
            const newHost = remaining[0];
            this.hostId = newHost.clientId;

            // If we are the promoted member, update our presence to reflect isHost
            if (newHost.clientId === this.clientId) {
              this.channel.track({
                clientId: this.clientId,
                username: this.username,
                isHost: true,
                joinedAt: Date.now(),
              });
              this.emit('chat_message', { system: true, text: 'You are now the host' });
            } else {
              this.emit('chat_message', { system: true, text: `${newHost.username} is now the host` });
            }
            this.emit('room_update', this);
          }
        }
      });
    });
  }

  // ─── Broadcast (playback + chat events) ───────────────────────────────────

  _setupBroadcast() {
    this.channel.on('broadcast', { event: 'PLAY_PAUSE' }, ({ payload }) => {
      if (this.clientId !== this.hostId) {
        if (payload.isPlaying) player.audio.play().catch(() => {});
        else player.audio.pause();
      }
    });

    this.channel.on('broadcast', { event: 'SEEK' }, ({ payload }) => {
      if (this.clientId !== this.hostId) {
        player.audio.currentTime = payload.currentTime;
      }
    });

    this.channel.on('broadcast', { event: 'SONG_CHANGE' }, ({ payload }) => {
      if (this.clientId !== this.hostId) {
        player.playSongList([payload.song], 0);
      }
    });

    this.channel.on('broadcast', { event: 'SYNC' }, ({ payload }) => {
      if (this.clientId !== this.hostId) {
        if (Math.abs(player.audio.currentTime - payload.currentTime) > 2) {
          player.audio.currentTime = payload.currentTime;
        }
        if (payload.isPlaying && player.audio.paused) player.audio.play().catch(() => {});
        else if (!payload.isPlaying && !player.audio.paused) player.audio.pause();
      }
    });

    this.channel.on('broadcast', { event: 'CHAT_MESSAGE' }, ({ payload }) => {
      this.emit('chat_message', payload);
    });
  }

  // ─── Send helpers ──────────────────────────────────────────────────────────

  /** Send a Realtime broadcast event */
  broadcast(event, payload) {
    if (!this.channel) return;
    this.channel.send({ type: 'broadcast', event, payload });
  }

  sendMessage(text) {
    this.broadcast('CHAT_MESSAGE', { username: this.username, text });
  }

  // ─── Player hooks ──────────────────────────────────────────────────────────

  attachPlayerHooks() {
    player.on('timeupdate', this.onPlayerTimeUpdate);
    player.on('statechange', this.onPlayerStateChange);
    player.on('songchange', this.onPlayerSongChange);
  }

  detachPlayerHooks() {
    player.off('timeupdate', this.onPlayerTimeUpdate);
    player.off('statechange', this.onPlayerStateChange);
    player.off('songchange', this.onPlayerSongChange);
  }

  onPlayerTimeUpdate({ currentTime }) {
    // Host broadcasts a sync pulse every 5 seconds
    if (this.clientId === this.hostId && Math.floor(currentTime) % 5 === 0) {
      this.broadcast('SYNC', { currentTime, isPlaying: player.isPlaying });
    }
  }

  onPlayerStateChange({ isPlaying }) {
    if (this.clientId === this.hostId) {
      this.broadcast('PLAY_PAUSE', { isPlaying });
    }
  }

  onPlayerSongChange({ song }) {
    if (this.clientId === this.hostId) {
      this.broadcast('SONG_CHANGE', { song });
    }
  }

  // ─── Leave / Cleanup ───────────────────────────────────────────────────────

  leave() {
    if (this.channel) {
      // Untrack removes us from presence immediately
      this.channel.untrack().catch(() => {});
    }
    this.cleanup();
  }

  cleanup() {
    if (this.channel) {
      const sb = getSupabase();
      if (sb) sb.removeChannel(this.channel).catch(() => {});
      this.channel = null;
    }
    this.detachPlayerHooks();
    this.roomCode = null;
    this.clientId = null;
    this.hostId = null;
    this.members = [];
    this.emit('room_update', this);
  }
}

export const roomService = new RoomService();
