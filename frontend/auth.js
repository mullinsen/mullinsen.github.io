function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));  // Decode the token payload
        const currentTime = Math.floor(Date.now() / 1000);  // Get current time in seconds
        return payload.exp < currentTime;  // Check if the token is expired
    } catch (e) {
        return true;  // If there's an error decoding the token, consider it expired/invalid
    }
}

function checkAuthentication() {
    const token = localStorage.getItem('token');
    
    if (!token || isTokenExpired(token)) {
        window.location.href = 'index.html';  // Redirect to login if no token or if token is expired
    }
}

window.onload = checkAuthentication;