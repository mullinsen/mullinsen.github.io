const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Add CORS to allow cross-origin requests

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

// Database connection
mongoose.set('strictQuery', false);
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json());

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String },
    coins: { type: Number, default: 2000 },
    isChallengeHost: { type: Boolean, default: false },
    investments: [
        {
            share: String,
            amount: Number,
            value: Number, // Current value of the investment
        }
    ],
});

const User = mongoose.model('User', userSchema);

// Challenge Schema
const challengeSchema = new mongoose.Schema({
    title: String,
    description: String,
    reward: Number, // Coins the user can receive for completing the challenge
    completedBy: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            verified: { type: Boolean, default: false } // True if another user verified completion
        }
    ]
});

const Challenge = mongoose.model('Challenge', challengeSchema);


// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const userExists = await User.findOne({ username });
    if (userExists) {
        return res.status(400).json({
            success: false,
            message: 'Username already exists'
        });
    }

    // Proceed with creating a new user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
        username,
        password: hashedPassword
    });

    await newUser.save();
    res.json({ success: true, message: 'User registered successfully. Return to login page.' });
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Username not is use!'
        });
    } 

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({
            success: false,
            message: 'Incorrect password'
        });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, isChallengeHost: user.isChallengeHost }, 'secretKey');
    res.json({ success: true, token, isChallengeHost: user.isChallengeHost });
});

// Route to handle forgotten password
app.post('/forgot-password', async (req, res) => {
    const { username, newPassword } = req.body;

    try {
        // Check if the user exists with an empty password
        const user = await User.findOne({ username: username, password: '' });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Username does not exist or already has a password. Contact admin.' });
        }

        // Update the user's password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword; // Make sure to hash the password in a real app
        await user.save();
        res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// Middleware to authenticate user using JWT
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];  // Extract the token part
    try {
        const decoded = jwt.verify(token, 'secretKey');
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// Investment route
app.post('/invest', authenticate, async (req, res) => {
    const { share, amount } = req.body; // e.g., { share: 'AAPL', amount: 100 }
    const user = await User.findById(req.userId);

    if (user.coins >= amount) {
        user.coins -= amount;

        // Simulate investment value change
        const shareValue = getShareValue(share); // This function should fetch/share current value dynamically
        user.investments.push({ share, amount, value: shareValue * amount });

        await user.save();
        res.json({ message: 'Investment successful' });
    } else {
        res.status(400).json({ error: 'Insufficient coins' });
    }
});

// Get user investments
app.get('/portfolio', authenticate, async (req, res) => {
    const user = await User.findById(req.userId);
    res.json({ coins: user.coins, investments: user.investments });
 });

// Function to simulate fetching a share's value (in reality, connect to a stock API)
function getShareValue(share) {
    // Simulate random share value
    return Math.random() * 100; // Replace with real stock value
}

app.get('/users', authenticate, async (req, res) => {
    try {
        const users = await User.find({}, 'username'); // Only fetch usernames
        const filteredUsers = users.filter(user => user._id.toString() !== req.userId); // Exclude the current user
        res.json(filteredUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});


app.post('/transfer', authenticate, async (req, res) => {
    const { recipientUsername, transferAmount } = req.body;

     // Validate transferAmount is a number and greater than 0
     if (!recipientUsername || !transferAmount || typeof transferAmount !== 'number' || transferAmount <= 0) {
        return res.status(400).json({ message: 'Invalid transfer input' });
    }

    const sender = await User.findById(req.userId);
    const recipient = await User.findOne({ username: recipientUsername });

    if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
    }

    if (sender.coins < transferAmount) {
        return res.status(400).json({ message: 'Insufficient coins' });
    }

    // Deduct coins from sender
    sender.coins -= transferAmount;
    await sender.save();

    // Add coins to recipient
    recipient.coins += transferAmount;
    await recipient.save();

    res.json({ message: 'Transfer successful' });
});

// Get all users and sort by coins (descending order)
app.get('/standings', authenticate, async (req, res) => {
    try {
        const users = await User.find().sort({ coins: -1 }); // Sorting in descending order by coins
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve standings' });
    }
});


// Middleware to check if user is admin (Michael)
const isChallengeHost = async (req, res, next) => {
    const user = await User.findById(req.userId);
    if (user && user.isChallengeHost) {
        next();
    } else {
        return res.status(403).json({ error: 'Access denied: ChallengeHost only' });
    }
};

// Route to create or update the challenge (ChallengeHost only)
app.post('/challenge', authenticate, isChallengeHost, async (req, res) => {
    const { title, description, reward } = req.body;

    try {
        let challenge = await Challenge.findOne();

        // If a challenge already exists, update it, otherwise create a new one
        if (challenge) {
            challenge.title = title;
            challenge.description = description;
            challenge.reward = reward;
        } else {
            challenge = new Challenge({ title, description, reward });
        }

        await challenge.save();
        res.json({ message: 'Challenge created/updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current challenge
app.get('/challenge', authenticate, async (req, res) => {
    try {
        const challenge = await Challenge.findOne();
        if (!challenge) return res.status(404).json({ error: 'No challenge found' });
        res.json(challenge);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark a user as having completed the challenge
app.post('/challenge/complete', authenticate, async (req, res) => {
    const { userId } = req.body;
    try {
        const challenge = await Challenge.findOne();
        if (!challenge) return res.status(404).json({ error: 'No challenge found' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        challenge.completedBy.push({ userId: user._id, verified: false });
        await challenge.save();

        res.json({ message: 'User marked as completed the challenge' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify that a user has completed the challenge
app.post('/challenge/verify', authenticate, async (req, res) => {
    const { userId } = req.body;
    try {
        const challenge = await Challenge.findOne();
        if (!challenge) return res.status(404).json({ error: 'No challenge found' });

        const completion = challenge.completedBy.find(c => c.userId.toString() === userId);
        if (!completion) return res.status(404).json({ error: 'User has not completed the challenge' });

        completion.verified = true;
        await challenge.save();

        res.json({ message: 'Challenge completion verified for the user' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));