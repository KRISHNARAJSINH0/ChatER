const searchInput = document.getElementById('searchInput');
const userListContainer = document.getElementById('userList');

// High-performance dynamic fetch and render routine
function fetchAndRenderUsers(query) {
    if (!userListContainer) return;

    fetch(`/search-users/?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            const users = data.users;

            // Empty state handlers
            if (users.length === 0) {
                if (query !== '') {
                    userListContainer.innerHTML = `
                        <div style="text-align: center; color: rgba(255,255,255,0.3); padding: 30px; font-size: 13px;">
                            No users found 🔍
                        </div>
                    `;
                } else {
                    userListContainer.innerHTML = `
                        <div style="text-align: center; color: rgba(248, 250, 252, 0.35); padding: 40px 20px; font-size: 13.5px; line-height: 1.6;">
                            Your active chats will appear here.<br>Use the search bar above to find users to chat with! 💬
                        </div>
                    `;
                }
                return;
            }

            // Build list dynamically
            let html = '';
            users.forEach(user => {
                let avatarHTML = '';
                if (user.img_url) {
                    avatarHTML = `<img src="${user.img_url}" class="profile-image" alt="${user.username}">`;
                } else {
                    avatarHTML = `<div class="avatar-fallback">${user.first_letter}</div>`;
                }

                // Add glowing unread badge if message is new!
                let badgeHTML = '';
                let textStyle = '';
                if (user.is_unread) {
                    badgeHTML = `<span class="msg-unread-badge" style="background: #22d3ee; color: #06070d; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 8px; margin-left: 8px; box-shadow: 0 0 10px rgba(34, 211, 238, 0.6); flex-shrink: 0;">NEW</span>`;
                    textStyle = `color: #a5b4fc; font-weight: 500;`;
                } else {
                    textStyle = `color: rgba(248, 250, 252, 0.35);`;
                }

                html += `
                    <a href="/chat/${user.id}/" class="user-card">
                        ${avatarHTML}
                        <div class="chat-info">
                            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                                <h3 class="username">${user.username}</h3>
                                ${badgeHTML}
                            </div>
                            <p style="font-size: 11px; ${textStyle}">${user.preview}</p>
                        </div>
                    </a>
                `;
            });

            userListContainer.innerHTML = html;
        })
        .catch(err => {
            console.error("AJAX Fetch failed: ", err);
        });
}

if (searchInput && userListContainer) {
    // Initial fetch to load up-to-date active chats list on load!
    // Since we do this dynamically, it guarantees that going back in browser history is ALWAYS 100% correct!
    fetchAndRenderUsers('');

    // Dynamic search / clear handler
    searchInput.addEventListener('input', function() {
        fetchAndRenderUsers(this.value.trim());
    });
}