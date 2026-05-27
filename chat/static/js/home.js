const searchInput =
    document.getElementById('searchInput');

const users =
    document.querySelectorAll('.user-card');

if(searchInput){

    searchInput.addEventListener('keyup', function(){

        const value =
            this.value.toLowerCase();

        users.forEach(user => {

            const username =
                user.querySelector('.username')
                .textContent
                .toLowerCase();

            if(username.includes(value)){

                user.style.display = 'flex';

            }

            else{

                user.style.display = 'none';

            }

        });

    });

}