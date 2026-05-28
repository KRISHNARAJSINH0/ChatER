const searchInput = document.getElementById('searchInput');
const userListContainer = document.getElementById('userList');

// Save the original active chats HTML structure to restore it instantly when search is cleared
let originalChatListHTML = '';
if (userListContainer) {
    originalChatListHTML = userListContainer.innerHTML;
}

if (searchInput && userListContainer) {
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();

        // 1. If search input is cleared, instantly restore original conversations
        if (query === '') {
            userListContainer.innerHTML = originalChatListHTML;
            return;
        }

        // 2. Fetch search results dynamically from database via AJAX
        fetch(`/search-users/?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                const users = data.users;

                if (users.length === 0) {
                    userListContainer.innerHTML = `
                        <div style="text-align: center; color: rgba(255,255,255,0.3); padding: 30px; font-size: 13px;">
                            No users found 🔍
                        </div>
                    `;
                    return;
                }

                // Build search results cards dynamically
                let html = '';
                users.forEach(user => {
                    let avatarHTML = '';
                    if (user.img_url) {
                        avatarHTML = `<img src="${user.img_url}" class="profile-image" alt="${user.username}">`;
                    } else {
                        avatarHTML = `<div class="avatar-fallback">${user.first_letter}</div>`;
                    }

                    html += `
                        <a href="/chat/${user.id}/" class="user-card">
                            ${avatarHTML}
                            <div class="chat-info">
                                <h3 class="username">${user.username}</h3>
                                <p style="font-size: 11px; color: rgba(248, 250, 252, 0.35);">Click to start chatting</p>
                            </div>
                        </a>
                    `;
                });

                userListContainer.innerHTML = html;
            })
            .catch(err => {
                console.error("AJAX Search failed: ", err);
            });
    });
}