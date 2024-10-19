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
    investments: [
        {
            share: String,
            amount: Number,
            value: Number, // Current value of the investment
        }
    ],
    isChallengeHost: { type: Boolean, default: false },
    transactions: [
        {
            type: { type: String }, // e.g., "bet", "reward", "transfer"
            amount: { type: Number }, // Amount of coins gained or lost
            date: { type: Date, default: Date.now }, // Timestamp of the transaction
            totalCoins: { type: Number }, // Total coins after the transaction
            details: { type: String } // Optional: Additional details like 'bet' or 'transfer to userX'
        }
    ]
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


// Function to log a transaction with additional details
async function logTransaction(userId, type, amount, details) {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    const totalCoins = user.coins;

    const transaction = {
        type,
        amount,
        totalCoins,
        details
    };

    await User.findByIdAndUpdate(userId, {
        $push: {
            transactions: {
                $each: [transaction],
                $slice: -50
            }
        }
    });
}

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
    const token = jwt.sign({ id: user._id, isChallengeHost: user.isChallengeHost }, process.env.JWT_SECRET_KEY);
    res.json({
        success: true, token, isChallengeHost: user.isChallengeHost,
        userId: user._id });
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
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

        await logTransaction(req.userId, 'invest', amount, share);

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

    // Log transactions for both sender and recipient
    await logTransaction(sender._id, 'transfer', transferAmount,`Transferred to ${recipient.username}`);
    await logTransaction(recipient._id, 'transfer', transferAmount, `Received from ${sender.username}`);

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
        // Use populate to retrieve the username of users who completed the challenge
        const challenge = await Challenge.findOne().populate('completedBy.userId', 'username');
        if (!challenge) return res.status(404).json({ error: 'No challenge found' });
        res.json(challenge);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


// Mark a user as having completed the challenge
app.post('/challenge/complete', authenticate, async (req, res) => {
    try {
        const challenge = await Challenge.findOne();
        if (!challenge) return res.status(404).json({ error: 'No challenge found' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if the user has already claimed completion
        const hasCompleted = challenge.completedBy.some(c => c.userId.toString() === req.userId.toString());
        if (hasCompleted) {
            return res.status(400).json({ message: 'User has already claimed the challenge' });
        }

        challenge.completedBy.push({ userId: user._id, verified: false });
        await challenge.save();

        res.json({ message: 'User marked as completed the challenge' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


// Verify that a user has completed the challenge and award coins
app.post('/challenge/verify', authenticate, async (req, res) => {
    const { userId } = req.body;
    
    try {
        const challenge = await Challenge.findOne();
        if (!challenge) return res.status(404).json({ error: 'No challenge found' });

        const completion = challenge.completedBy.find(c => c.userId.toString() === userId);
        if (!completion) return res.status(404).json({ error: 'User has not completed the challenge' });

        // Check if the challenge is already verified for this user
        if (completion.verified) {
            return res.status(400).json({ message: 'Challenge completion has already been verified for this user' });
        }

        // Verify completion
        completion.verified = true;

        // Award coins to the user
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.coins += challenge.reward; // Award the reward coins
        await user.save(); // Save the updated user

        await challenge.save(); // Save the updated challenge

        await logTransaction(userId, 'challenge reward', challenge.reward, '');

        res.json({ message: 'Challenge completion verified for the user', awardedCoins: challenge.reward });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/betting/place', authenticate, async (req, res) => {
    const { betAmount } = req.body;

     // Validate betAmount is a number and greater than 0
     if (!betAmount || typeof betAmount !== 'number' || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet input' });
    }

    const gambler = await User.findById(req.userId);
    if (!gambler) return res.status(404).json({ error: 'User not found' });

    if (gambler.coins < betAmount) {
        return res.status(400).json({ message: 'Insufficient coins' });
    }

    // Deduct coins from gambler
    gambler.coins -= betAmount;
    await gambler.save();

    // Log the transaction
    await logTransaction(req.userId, 'bet', betAmount, 'Bet placed');

    res.json({ message: 'Bet placed successfully' });
});

app.post('/betting/reward', authenticate, async (req, res) => {
    const { reward } = req.body;

     // Validate reward is a number and greater than 0
     if (!reward || typeof reward !== 'number' || reward <= 0) {
        return res.status(400).json({ message: 'Invalid reward' });
    }

    const gambler = await User.findById(req.userId);
    if (!gambler) return res.status(404).json({ error: 'User not found' });

    // Add coins to gambler
    gambler.coins += reward;
    await gambler.save();

    // Log the transaction
    await logTransaction(req.userId, 'bet', reward, 'Bet reward');

    res.json({ message: 'Rewarded successfully' });
});


// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));