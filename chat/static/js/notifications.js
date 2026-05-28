// DYNAMIC NOTIFICATION TOAST STYLES
const notificationStyles = `
#toast-notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 320px;
    pointer-events: none;
}

.glass-toast-notification {
    background: rgba(13, 15, 24, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-top: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 16px;
    padding: 14px 18px;
    color: #ffffff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35),
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 0 20px rgba(99, 102, 241, 0.2);
    transform: translateX(120%);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    animation: toastSlideIn 0.4s forwards;
    font-family: 'Poppins', sans-serif;
}

@keyframes toastSlideIn {
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.toast-fadeout {
    transform: translateY(-20px) scale(0.9) !important;
    opacity: 0 !important;
    transition: all 0.4s ease-in-out !important;
}

.toast-header-inner {
    display: flex;
    align-items: center;
    gap: 8px;
}

.toast-bell {
    font-size: 14px;
    animation: bellRinger 1.2s ease infinite alternate;
    display: inline-block;
}

@keyframes bellRinger {
    0% { transform: rotate(-12deg); }
    100% { transform: rotate(12deg); }
}

.toast-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
}

.toast-body-inner {
    font-size: 13px;
    line-height: 1.4;
    color: #e2e8f0;
}

.toast-body-inner strong {
    color: #a5b4fc;
}
`;

// Inject Styles dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = notificationStyles;
document.head.appendChild(styleSheet);

// WEBSOCKET FOR NOTIFICATIONS
const notifyScheme = window.location.protocol === "https:" ? "wss" : "ws";
const notifyUrl = `${notifyScheme}://${window.location.host}/ws/notifications/`;
let notificationSocket;

function connectNotificationSocket() {
    notificationSocket = new WebSocket(notifyUrl);

    notificationSocket.onopen = function() {
        console.log("Global Notification Socket connected!");
    };

    notificationSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const message = data.message;
        const sender = data.sender;
        const senderId = data.sender_id;

        // Don't show toast if the user is already inside the chat room with that sender!
        if (typeof receiverUsername !== 'undefined' && receiverUsername === sender) {
            console.log("Already chatting with sender. Muting notification toast.");
            return;
        }

        // 1. Play chime tone
        playNotificationChime();

        // 2. Slide in glass popup toast
        showNotificationToast(sender, message, senderId);

        // 3. Update homepage user card list dynamically in real time
        updateHomeUserCard(sender, message, senderId);
    };

    notificationSocket.onclose = function() {
        console.log("Notification Socket disconnected. Reconnecting in 3 seconds...");
        setTimeout(connectNotificationSocket, 3000);
    };

    notificationSocket.onerror = function(err) {
        console.error("Notification socket error: ", err);
        notificationSocket.close();
    };
}

// Establish Notification Connection
connectNotificationSocket();

// WEB AUDIO SYNTHESIZER BEEP (No external MP3 required!)
function playNotificationChime() {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Sound pitch (D5 -> A5)
        const osc = context.createOscillator();
        const gain = context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12); // A5
        
        gain.gain.setValueAtTime(0.12, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.28);
        
        osc.connect(gain);
        gain.connect(context.destination);
        
        osc.start();
        osc.stop(context.currentTime + 0.28);
    } catch (err) {
        console.warn("Audio Context is blocked or not supported on this browser context.");
    }
}

// SLIDE IN GORGEOUS GLASS TOAST
function showNotificationToast(senderName, messageText, senderId) {
    let container = document.getElementById('toast-notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-notification-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'glass-toast-notification';

    // Truncate long messages
    const previewText = messageText.length > 42 ? messageText.substring(0, 39) + '...' : messageText;

    toast.innerHTML = `
        <div class="toast-header-inner">
            <span class="toast-bell">🔔</span>
            <span class="toast-title">New Message</span>
        </div>
        <div class="toast-body-inner">
            <strong>${senderName}</strong>: "${previewText}"
        </div>
    `;

    // Click redirects straight to chat room
    if (senderId) {
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', function() {
            window.location.href = `/chat/${senderId}/`;
        });
    }

    container.appendChild(toast);

    // Auto fade out after 4 seconds
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4000);
}

// UPDATE USER CARD LISTS ON HOME
function updateHomeUserCard(senderName, messageText, senderId) {
    const cards = document.querySelectorAll('.user-card');
    const listParent = document.getElementById('userList');
    
    let cardExists = false;
    if (cards.length > 0) {
        cards.forEach(card => {
            const usernameH3 = card.querySelector('.username');
            if (!usernameH3) return;

            const cardUsername = usernameH3.textContent.trim();
            if (cardUsername === senderName) {
                cardExists = true;
                
                // Update last message preview
                const textP = card.querySelector('.chat-info p');
                if (textP) {
                    textP.innerHTML = messageText.length > 25 ? messageText.substring(0, 22) + '...' : messageText;
                    textP.style.color = '#a5b4fc'; // lavender highlight
                    textP.style.fontWeight = '500';
                }

                // Create/Update glowing cyan NEW badge
                let badge = card.querySelector('.msg-unread-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'msg-unread-badge';
                    badge.style.background = '#22d3ee';
                    badge.style.color = '#06070d';
                    badge.style.fontSize = '9px';
                    badge.style.fontWeight = '700';
                    badge.style.padding = '2px 6px';
                    badge.style.borderRadius = '8px';
                    badge.style.marginLeft = '8px';
                    badge.style.boxShadow = '0 0 10px rgba(34, 211, 238, 0.6)';
                    badge.textContent = 'NEW';
                    card.querySelector('.chat-info').appendChild(badge);
                }

                // Shuffle this active user card to the absolute top of the homepage chat list!
                const listParent = card.parentNode;
                if (listParent) {
                    listParent.insertBefore(card, listParent.firstChild);
                }
            }
        });
    }

    // Dynamic generation: If card doesn't exist yet, construct and slide it into the list parent!
    if (!cardExists && listParent && senderId) {
        if (listParent.innerHTML.includes('No users found')) {
            listParent.innerHTML = '';
        }

        const newCard = document.createElement('a');
        newCard.href = `/chat/${senderId}/`;
        newCard.className = 'user-card';

        const firstLetter = senderName.charAt(0).toUpperCase();

        newCard.innerHTML = `
            <div class="avatar-fallback">${firstLetter}</div>
            <div class="chat-info">
                <h3 class="username">${senderName}</h3>
                <p style="font-size: 12px; color: #a5b4fc; font-weight: 500;">
                    ${messageText.length > 25 ? messageText.substring(0, 22) + '...' : messageText}
                </p>
                <span class="msg-unread-badge" style="background: #22d3ee; color: #06070d; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 8px; margin-left: 8px; box-shadow: 0 0 10px rgba(34, 211, 238, 0.6);">NEW</span>
            </div>
        `;

        listParent.insertBefore(newCard, listParent.firstChild);
    }
}
