// AUTO SCROLL

const container =
    document.querySelector('.message-container');

if(container){

    container.scrollTop =
        container.scrollHeight;

}


// ENTER TO SEND

const input =
    document.getElementById('message-input');

if(input){

    input.addEventListener("keypress", function(e){

        if(e.key === "Enter"){

            e.preventDefault();

            this.form.submit();

        }

    });

}
// TYPING INDICATOR

const typingInput =
    document.getElementById('message-input');

const typingStatus =
    document.getElementById('typing-status');

if(typingInput){

    typingInput.addEventListener('keyup', function(){

        typingStatus.innerHTML =
            'Typing...';

        clearTimeout(window.typingTimer);

        window.typingTimer = setTimeout(() => {

            typingStatus.innerHTML = '';

        }, 1000);

    });

}
// LIVE CHAT REFRESH

function loadMessages(){

    const receiverId =
        window.location.pathname.split('/')[2];

    fetch(`/get-messages/${receiverId}/`)

    .then(response => response.json())

    .then(data => {

        document.getElementById(
            'message-container'
        ).innerHTML = data.html;

    });

}


// AUTO REFRESH EVERY 2 SEC

setInterval(loadMessages, 2000);