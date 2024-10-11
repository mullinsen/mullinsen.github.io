const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Add CORS to allow cross-origin requests

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/investmentDB';

// Database connection
//mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//.then(() => console.log('MongoDB connected'))
//.catch(err => console.log(err));

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json());

// User Schema
// const userSchema = new mongoose.Schema({
//     username: { type: String, unique: true },
//     password: { type: String },
//     coins: { type: Number, default: 1000 },
//     investments: [
//         {
//             share: String,
//             amount: Number,
//             value: Number, // Current value of the investment
//         }
//     ],
// });

// const User = mongoose.model('User', userSchema);

// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    //const hashedPassword = await bcrypt.hash(password, 10);
    //const newUser = new User({ username, password: hashedPassword });
    //await newUser.save();
    res.json({ message: 'User created successfully' });
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    //const user = await User.findOne({ username });
    //if (user && (await bcrypt.compare(password, user.password))) {
    //    const token = jwt.sign({ userId: user._id }, 'secretkey');
    //    res.json({ token });
    //} else {
    res.status(400).json({ error: 'Invalid credentials' });
    //}
});

// Middleware to authenticate user using JWT
// const authenticate = (req, res, next) => {
//     const token = req.headers['authorization'];
//     try {
//         const decoded = jwt.verify(token, 'secretkey');
//         req.userId = decoded.userId;
//         next();
//     } catch (err) {
//         res.status(401).json({ error: 'Unauthorized' });
//     }
// };

// Investment route
// app.post('/invest', authenticate, async (req, res) => {
    // const { share, amount } = req.body; // e.g., { share: 'AAPL', amount: 100 }
    // const user = await User.findById(req.userId);

    // if (user.coins >= amount) {
    //     user.coins -= amount;

    //     // Simulate investment value change
    //     const shareValue = getShareValue(share); // This function should fetch/share current value dynamically
    //     user.investments.push({ share, amount, value: shareValue * amount });

    //     await user.save();
    //     res.json({ message: 'Investment successful' });
    // } else {
    // res.status(400).json({ error: 'Insufficient coins' });
    // }
// });

// Get user investments
// app.get('/portfolio', authenticate, async (req, res) => {
    //const user = await User.findById(req.userId);
    //res.json({ coins: user.coins, investments: user.investments });
    // res.status(400).json({ error: 'You have no coins' });
// });

// Function to simulate fetching a share's value (in reality, connect to a stock API)
function getShareValue(share) {
    // Simulate random share value
    return Math.random() * 100; // Replace with real stock value
}

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));