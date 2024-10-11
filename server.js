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
});

const User = mongoose.model('User', userSchema);

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

    // Generate JWT token or session, etc.
    const token = jwt.sign({ id: user._id }, 'secretKey');
    res.json({ success: true, token });
});

// Route to handle forgotten password
app.post('/forgot-password', async (req, res) => {
    const { username, newPassword } = req.body;

    try {
        console.log('1');
        // Check if the user exists with an empty password
        const user = await User.findOne({ username: username, password: '' });

        if (!user) {
            console.log('1.5');
            return res.status(404).json({ success: false, message: 'Username does not exist or already has a password. Contact admin.' });
        }
        console.log('2');

        // Update the user's password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword; // Make sure to hash the password in a real app
        console.log('3');
        await user.save();
        console.log('4');
        res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
        console.log('5');
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// Middleware to authenticate user using JWT
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    try {
        const decoded = jwt.verify(token, 'secretkey');
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
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

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));