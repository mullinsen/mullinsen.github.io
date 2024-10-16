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

window.onload = loadCoins;