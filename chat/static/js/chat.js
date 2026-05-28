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
    };

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const messageText = data.message;
        const senderName = data.sender;
        
        appendMessageBubble(messageText, senderName);
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

    messageWrapper.innerHTML = `
        <div class="${bubbleClass}">
            ${messageText}
            <div class="message-time">
                ${timeString} ${ticks}
            </div>
        </div>
    `;

    container.appendChild(messageWrapper);
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
        }).catch(err => console.error("Database sync failed: ", err));

        // 3. Reset input field instantly
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