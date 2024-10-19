// Fetch and display comments for the specific page
async function loadComments() {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = ''; // Clear current comments

    try {
        const response = await fetch(`https://mullinsen-github-io.onrender.com/comments/${pageId}`);
        const comments = await response.json();
        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment');
            commentElement.textContent = `${comment.username}: ${comment.text}`;
            commentsList.appendChild(commentElement);
        });
    } catch (error) {
        console.error('Error loading comments:', error);
        alert("Failed to load comments.");
    }
}

// Submit comment functionality with server-side storage for a specific page
async function submitComment() {
    const commentInput = document.getElementById('comment-input');
    const commentsList = document.getElementById('comments-list');
    const commentText = commentInput.value.trim();
    const username = localStorage.getItem('username') || 'Anonymous'; // Get username from Local Storage

    if (commentText) {
        try {
            // Post the comment to the server with pageId
            const response = await fetch('https://mullinsen-github-io.onrender.com/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pageId, username, text: commentText })
            });

            if (!response.ok) {
                throw new Error('Failed to submit comment');
            }

            // Add the comment to the list
            const newComment = await response.json();
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment');
            commentElement.textContent = `${newComment.username}: ${newComment.text}`;
            commentsList.appendChild(commentElement);

            // Clear the input field
            commentInput.value = '';
        } catch (error) {
            console.error('Error submitting comment:', error);
            alert("Failed to submit comment!");
        }
    } else {
        alert("Please enter a comment before submitting!");
    }
}