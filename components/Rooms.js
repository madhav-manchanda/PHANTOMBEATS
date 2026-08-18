import { roomService } from '../services/roomService.js';
import { icons } from '../utils/helpers.js';
import { showToast } from '../utils/animations.js';

// ─── Login-gate view ────────────────────────────────────────────────────────

function _renderLoginGate(container, onShowAuth) {
  container.innerHTML = `
    <div class="rooms-view" style="
      padding: 24px;
      max-width: 520px;
      margin: 60px auto;
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 20px;
    ">
      <div style="
        width: 72px; height: 72px;
        background: var(--bg-card);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid var(--border-color);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="var(--accent-primary)" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>

      <div>
        <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700;">Rooms require an account</h2>
        <p style="margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
          Sign in to create or join a Phantom Room and listen together in real-time with friends.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px;">
        <button id="rooms-login-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 15px;">
          Sign in to use Rooms
        </button>
        <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">
          You can still browse music, search, and play songs as a guest.
        </p>
      </div>
    </div>
  `;

  container.querySelector('#rooms-login-btn')?.addEventListener('click', () => {
    if (typeof onShowAuth === 'function') onShowAuth();
  });
}

// ─── Rooms page (authenticated users only) ─────────────────────────────────

export function renderRoomsPage(container, { isGuest = true, onShowAuth } = {}) {
  // Auth gate — render login prompt and return early, never initialise roomService
  if (isGuest) {
    _renderLoginGate(container, onShowAuth);
    return;
  }

  container.innerHTML = `
    <div class="rooms-view" style="padding: 24px; max-width: 800px; margin: 0 auto; color: var(--text-primary);">
      <div class="section-header">
        <h2 class="section-title">${icons.headphones} Phantom Rooms</h2>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">Listen together in real-time with your friends. Music syncs automatically.</p>

      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 300px; background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--accent-primary);">
          <h3>Create a Room</h3>
          <p style="color: var(--text-secondary); font-size: 13px; margin: 8px 0 16px;">Host a listening session. Only you control playback.</p>
          <input type="text" id="create-username" placeholder="Your name..." style="width:100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); margin-bottom: 16px;" />
          <button id="create-btn" class="btn btn-primary" style="width: 100%;">Create Room</button>
        </div>

        <div style="flex: 1; min-width: 300px; background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
          <h3>Join a Room</h3>
          <p style="color: var(--text-secondary); font-size: 13px; margin: 8px 0 16px;">Enter a 6-character room code to join.</p>
          <input type="text" id="join-username" placeholder="Your name..." style="width:100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); margin-bottom: 12px;" />
          <input type="text" id="join-code" placeholder="Room Code (e.g., PH-X7K2)" style="width:100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); margin-bottom: 16px; text-transform: uppercase;" />
          <button id="join-btn" class="btn btn-primary" style="width: 100%;">Join Room</button>
        </div>
      </div>
    </div>
  `;

  const createBtn = container.querySelector('#create-btn');
  const joinBtn = container.querySelector('#join-btn');
  const toastContainer = document.getElementById('toast-container');

  createBtn.addEventListener('click', () => {
    const name = container.querySelector('#create-username').value.trim();
    if (!name) return showToast(toastContainer, 'Please enter a name');
    roomService.connect(name, 'CREATE');
  });

  joinBtn.addEventListener('click', () => {
    const name = container.querySelector('#join-username').value.trim();
    const code = container.querySelector('#join-code').value.trim().replace('PH-', '').toUpperCase();
    if (!name || !code) return showToast(toastContainer, 'Please enter name and code');
    roomService.connect(name, 'JOIN', code);
  });
}

// ─── Persistent room panel (authenticated users only) ──────────────────────

export function initRoomPanel() {
  let panel = document.getElementById('persistent-room-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'persistent-room-panel';
    panel.className = 'room-panel hidden';
    document.body.appendChild(panel);
  }

  // Click on minimized indicator to expand
  panel.addEventListener('click', (e) => {
    if (panel.classList.contains('minimized') && e.target.closest('.room-minimize-indicator')) {
      panel.classList.remove('minimized');
    }
  });

  const renderPanel = () => {
    if (!roomService.roomCode) {
      panel.classList.add('hidden');
      panel.classList.remove('minimized');
      return;
    }
    panel.classList.remove('hidden');

    panel.innerHTML = `
      <div class="room-minimize-indicator">
        <div class="room-mini-icon">${icons.waveform}</div>
        <div class="room-mini-code">PH-${roomService.roomCode}</div>
      </div>
      <div class="room-panel-header">
        PH-<span>${roomService.roomCode}</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <button id="copy-code-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;" title="Copy code">${icons.clipboard}</button>
          <button id="dock-room-btn" class="room-dock-btn" title="Minimize to side">${icons.minimizeLeft}</button>
        </div>
      </div>
      <div class="room-panel-body">
        <div style="font-size: 11px; color: var(--text-secondary); text-align: center; margin-bottom: 16px;">
          ${roomService.clientId === roomService.hostId ? 'You are the host' : 'Synced to host'}
        </div>
        
        <div class="room-members">
          <div class="room-section-title">${icons.users} Listeners (${roomService.members.length}/20)</div>
          ${roomService.members.map(m => `
            <div style="font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span style="color: ${m.isActive ? '#4CAF50' : 'var(--text-secondary)'}; font-size: 10px;">●</span>
              ${m.username} ${m.id === roomService.hostId ? `<span class="room-host-icon">${icons.crown}</span>` : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="room-chat" style="flex: 1; overflow-y: auto; margin: 16px 0; border-top: 1px solid var(--border-color); padding-top: 8px;">
          <div class="room-section-title">${icons.messageCircle} Chat</div>
          <div id="chat-messages" style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;"></div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <input type="text" id="chat-input" placeholder="Type..." style="flex: 1; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);" />
          <button id="send-btn" style="background: var(--accent-primary); border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; color: var(--bg-primary); font-weight: bold;">&gt;</button>
        </div>
        
        <button id="leave-room-btn" style="width: 100%; margin-top: 12px; background: rgba(229, 57, 53, 0.2); color: #e53935; border: 1px solid rgba(229, 57, 53, 0.4); padding: 8px; border-radius: 4px; cursor: pointer;">Leave Room</button>
      </div>
    `;

    panel.querySelector('#copy-code-btn').addEventListener('click', () => {
      navigator.clipboard.writeText('PH-' + roomService.roomCode);
      showToast(document.getElementById('toast-container'), 'Code copied!');
    });

    panel.querySelector('#dock-room-btn').addEventListener('click', () => {
      panel.classList.toggle('minimized');
    });

    panel.querySelector('#leave-room-btn').addEventListener('click', () => {
      roomService.leave();
    });

    const chatInput = panel.querySelector('#chat-input');
    panel.querySelector('#send-btn').addEventListener('click', () => {
      if (chatInput.value.trim()) {
        roomService.sendMessage(chatInput.value.trim());
        chatInput.value = '';
      }
    });
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && chatInput.value.trim()) {
        roomService.sendMessage(chatInput.value.trim());
        chatInput.value = '';
      }
    });
  };

  roomService.on('room_update', renderPanel);
  roomService.on('chat_message', (msg) => {
    const chatBox = panel.querySelector('#chat-messages');
    if (chatBox) {
      const div = document.createElement('div');
      if (msg.system) {
        div.style.color = 'var(--text-secondary)';
        div.style.fontStyle = 'italic';
        div.textContent = msg.text;
      } else {
        div.innerHTML = `<span style="color:var(--accent-primary);">${msg.username}:</span> ${msg.text}`;
      }
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });

  roomService.on('error', (err) => {
    showToast(document.getElementById('toast-container'), err);
  });
}
