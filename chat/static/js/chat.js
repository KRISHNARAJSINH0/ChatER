// AUTO SCROLL TO BOTTOM
const container = document.getElementById('message-container');
function scrollToBottom() {
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}
scrollToBottom();

// WEBSOCKET CONFIGURATION
const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
const ids = [parseInt(senderId), parseInt(receiverId)].sort((a, b) => a - b);
const roomName = `room_${ids[0]}_${ids[1]}`;
const wsUrl = `${wsScheme}://${window.location.host}/ws/chat/${roomName}/`;

let chatSocket;

function connectWebSocket() {
    chatSocket = new WebSocket(wsUrl);

    chatSocket.onopen = function() {
        console.log("WebSocket connection established successfully!");
        sendSeenReceipt();
    };

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
        if (data.type === 'seen_receipt') {
            updateDoubleTicks();
            return;
        }

        const messageText = data.message;
        const senderName = data.sender;
        
        appendMessageBubble(messageText, senderName);

        if (senderName !== senderUsername) {
            sendSeenReceipt();
        }
    };

    chatSocket.onclose = function(e) {
        console.log("WebSocket disconnected. Reconnecting in 2 seconds...");
        setTimeout(function() {
            connectWebSocket();
        }, 2000);
    };

    chatSocket.onerror = function(err) {
        console.error("WebSocket encountered an error: ", err);
        chatSocket.close();
    };
}

// Establish Connection
connectWebSocket();

// DYNAMICALLY APPEND NEW MESSAGE BUBBLE
function appendMessageBubble(messageText, senderName) {
    if (!container) return;

    // Remove the empty placeholder if it exists
    const emptyChat = document.querySelector('.empty-chat');
    if (emptyChat) {
        emptyChat.remove();
    }

    const isMe = (senderName === senderUsername);
    const messageWrapper = document.createElement('div');
    messageWrapper.className = isMe ? 'message-right' : 'message-left';

    const bubbleClass = isMe ? 'message-bubble sender' : 'message-bubble receiver';

    // Format Current Time (e.g. 10:45 AM)
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeString = `${hours}:${minutes} ${ampm}`;

    // Readability for ticks
    const ticks = isMe ? '<span style="color: #22d3ee; margin-left: 4px; font-weight: bold;">✓</span>' : '';

    const deleteTag = isMe ? `<a href="#" class="delete-btn temp-delete-btn">Delete</a>` : '';

    messageWrapper.innerHTML = `
        <div class="${bubbleClass}">
            ${messageText}
            <div class="message-time">
                ${timeString} ${ticks}
            </div>
            ${deleteTag}
        </div>
    `;

    container.appendChild(messageWrapper);
    
    // Wire up long-press touch controls on the new bubble immediately
    const newBubble = messageWrapper.querySelector('.message-bubble');
    if (newBubble && typeof initMobileLongPress === 'function') {
        initMobileLongPress(newBubble);
    }
    
    scrollToBottom();
}

// PREVENT PAGE RELOAD ON SEND & BROADCAST INSTANTLY
const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');

if (form && input) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const messageText = input.value.trim();
        if (messageText === '') return;

        // 1. Send instantly over WebSocket for true real-time broadcast
        if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
            chatSocket.send(JSON.stringify({
                'message': messageText,
                'sender': senderUsername,
                'receiver': receiverUsername,
                'sender_id': senderId
            }));
        } else {
            console.warn("WebSocket is not connected. Message sent via fallback.");
        }

        // 2. Synchronize with database in the background (silent HTTP POST)
        const formData = new FormData(form);
        fetch(window.location.pathname, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.message_id) {
                // Find any temporary delete buttons and set their true href!
                const tempBtns = document.querySelectorAll('.temp-delete-btn');
                tempBtns.forEach(btn => {
                    btn.href = `/delete-message/${data.message_id}/`;
                    btn.classList.remove('temp-delete-btn');
                });
            }
        })
        .catch(err => console.error("Database sync failed: ", err));

        // 3. Update our own local sidebar card instantly and slide it to the top!
        updateLocalSidebar(receiverUsername, messageText, receiverId);

        // 4. Reset input field instantly
        input.value = '';
    });
}

// ENTER TO SUBMIT FORM (FALLBACK FOR MOBILE AND DESKTOP ENTER KEY)
if (input) {
    input.addEventListener("keypress", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
}

// TYPING INDICATOR
const typingStatus = document.getElementById('typing-status');
if (input && typingStatus) {
    input.addEventListener('input', function() {
        typingStatus.innerHTML = 'typing...';
        clearTimeout(window.typingTimer);
        window.typingTimer = setTimeout(() => {
            typingStatus.innerHTML = '';
        }, 1500);
    });
}

// REAL-TIME SEEN RECEIPTS HELPERS
function sendSeenReceipt() {
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            'type': 'seen_receipt',
            'sender': senderUsername,
            'receiver': receiverUsername
        }));
    }
}

function updateDoubleTicks() {
    const ticksElements = document.querySelectorAll('.message-bubble.sender .message-time');
    ticksElements.forEach(el => {
        if (el.innerHTML.includes('✓') && !el.innerHTML.includes('✓✓')) {
            // Replace single tick with dynamic neon double checkmark
            el.innerHTML = el.innerHTML.replace(/✓/g, '<span style="color: #22d3ee; margin-left: 2px;">✓✓</span>');
        }
    });
}

function updateLocalSidebar(receiverName, messageText, receiverId) {
    const cards = document.querySelectorAll('.sidebar .user-card');
    const listParent = document.getElementById('userList');
    
    let cardExists = false;
    if (cards.length > 0) {
        cards.forEach(card => {
            const usernameH3 = card.querySelector('.username');
            if (usernameH3 && usernameH3.textContent.trim() === receiverName) {
                cardExists = true;
                
                // Update last message preview
                const textP = card.querySelector('.chat-info p');
                if (textP) {
                    textP.innerHTML = messageText.length > 25 ? messageText.substring(0, 22) + '...' : messageText;
                    textP.style.color = 'rgba(248, 250, 252, 0.4)';
                    textP.style.fontWeight = '400';
                }

                // Remove unread badge since we are the sender
                const badge = card.querySelector('.msg-unread-badge');
                if (badge) badge.remove();

                // Shuffle this card to the top
                const parent = card.parentNode;
                if (parent) {
                    parent.insertBefore(card, parent.firstChild);
                }
            }
        });
    }

    // Dynamic generation for sender side if no card exists yet
    if (!cardExists && listParent && receiverId) {
        if (listParent.innerHTML.includes('No users found')) {
            listParent.innerHTML = '';
        }

        const newCard = document.createElement('a');
        newCard.href = `/chat/${receiverId}/`;
        newCard.className = 'user-card';

        const firstLetter = receiverName.charAt(0).toUpperCase();

        newCard.innerHTML = `
            <div class="avatar-fallback">${firstLetter}</div>
            <div class="chat-info">
                <h3 class="username">${receiverName}</h3>
                <p style="font-size: 11px; color: rgba(248, 250, 252, 0.4); font-weight: 400;">
                    ${messageText.length > 25 ? messageText.substring(0, 22) + '...' : messageText}
                </p>
            </div>
        `;

        listParent.insertBefore(newCard, listParent.firstChild);
    }
}

// THREE-DOTS SETTINGS DROPDOWN & CLEAR CHAT
document.addEventListener("DOMContentLoaded", function() {
    const dotsBtn = document.getElementById("settingsDotsBtn");
    const dropdownMenu = document.getElementById("settingsDropdownMenu");
    const clearChatBtn = document.getElementById("clearChatBtn");

    if (dotsBtn && dropdownMenu) {
        dotsBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle("show");
        });

        document.addEventListener("click", function(e) {
            if (!dotsBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove("show");
            }
        });
    }

    if (clearChatBtn && typeof receiverId !== 'undefined') {
        clearChatBtn.addEventListener("click", function() {
            if (confirm("Are you sure you want to clear this chat? This will clear the chat history for you privately.")) {
                fetch(`/clear-chat/${receiverId}/`, {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        // Instantly clear messages list in the UI without a full reload!
                        if (container) {
                            container.innerHTML = '<div class="empty-chat">Start chatting 🚀</div>';
                        }
                        dropdownMenu.classList.remove("show");
                    }
                })
                .catch(err => console.error("Error clearing chat: ", err));
            }
        });
    }

    // Initialize long-press gesture on all existing messages
    const bubbles = document.querySelectorAll('.message-bubble');
    bubbles.forEach(bubble => initMobileLongPress(bubble));
});

// PREMIUM LONG PRESS TRIGGER FOR MOBILE TOUCH DEVICES
function initMobileLongPress(bubble) {
    let pressTimer;
    let startX = 0;
    let startY = 0;

    const startPress = function(e) {
        if (e.touches && e.touches[0]) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
        
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            // Remove active long-press on all other bubbles first
            document.querySelectorAll('.message-bubble.show-delete').forEach(b => {
                if (b !== bubble) b.classList.remove('show-delete');
            });

            // Toggle show-delete class on this bubble
            bubble.classList.add('show-delete');

            // Trigger micro-vibration for a native-like feedback
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500); // 500ms hold is responsive and intentional
    };

    const cancelPress = function() {
        clearTimeout(pressTimer);
    };

    const movePress = function(e) {
        if (e.touches && e.touches[0]) {
            const diffX = Math.abs(e.touches[0].clientX - startX);
            const diffY = Math.abs(e.touches[0].clientY - startY);
            // Cancel hold only if they scroll/move finger more than 10px (anti-finger-wobble tolerance)
            if (diffX > 10 || diffY > 10) {
                clearTimeout(pressTimer);
            }
        }
    };

    // Touch Event hooks
    bubble.addEventListener('touchstart', startPress, { passive: true });
    bubble.addEventListener('touchend', cancelPress);
    bubble.addEventListener('touchmove', movePress, { passive: true });
    bubble.addEventListener('touchcancel', cancelPress);
}

// Global click/touch outside to close any active mobile delete menus
document.addEventListener('touchstart', function(e) {
    if (!e.target.closest('.message-bubble')) {
        document.querySelectorAll('.message-bubble.show-delete').forEach(b => {
            b.classList.remove('show-delete');
        });
    }
}, { passive: true });