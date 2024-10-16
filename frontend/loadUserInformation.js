async function loadInvestments() {
    try {
        // Fetch the user's portfolio from the backend
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }

        const response = await fetch('https://mullinsen-github-io.onrender.com/portfolio', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Prefix the token with 'Bearer '
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }

        const data = await response.json();

        // Update the investment list
        const investmentList = document.getElementById('investment-list');
        if(!investmentList){
            throw new Error("No invenstment list on page!");
        }

        investmentList.innerHTML = ''; // Clear the existing content

        if (data.investments && data.investments.length > 0) {
            data.investments.forEach(investment => {
                const li = document.createElement('li');
                li.textContent = `${investment.amount} coins in ${investment.share}`;
                investmentList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No investments yet';
            investmentList.appendChild(li);
        }

    } catch (error) {
        console.error(error);
        alert("Failed to load invenstments!")
    }
}

async function loadCoins() {
    try {
        // Fetch the user's portfolio from the backend
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }

        const response = await fetch('https://mullinsen-github-io.onrender.com/portfolio', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Prefix the token with 'Bearer '
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }

        const data = await response.json();

        // Update the coin inventory
        const coinElement = document.getElementById('coin-inventory');
        if(!coinElement) {
            throw new Error('No coin-inventory element found');
        }
        coinElement.textContent = data.coins;

    } catch (error) {
        console.error(error);
        alert('FAILED loading coins!');
    }
}

// Fetch users from the backend and populate the recipient dropdown
async function loadUsers() {
    try {
        const response = await fetch('https://mullinsen-github-io.onrender.com/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') // Assuming you're using JWT for authentication
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        const recipientSelect = document.getElementById('recipient-username');

        if(!recipientSelect)
        {
            throw new Error('No recipient-username element found!');
        }
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            recipientSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading users:', error);
        alert('FAILED loading users!');
    }
}