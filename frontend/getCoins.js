async function loadCoins() {
    alert('loading coins!3');
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
            alert('failed loading coins!');
        }

        const data = await response.json();

        // Update the coin inventory
        const coinElement = document.getElementById('coin-inventory');
        if(!coinElement) {
            alert('No Coin element on page!');
            return;
        }
        alert('Coin element on page!');
        coinElement.textContent = data.coins;

    } catch (error) {
        console.error(error);
        alert('FAILED loading coins!');
    }
}
alert('loading coins!1');
// Load the coins when the page loads
window.onload = loadCoins;