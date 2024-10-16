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
            alert("No invenstment list on page!");
            return;
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
    }
}

// Load the investments when the page loads
window.onload = loadInvestments;