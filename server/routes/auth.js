// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database');

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const userData = {
      email,
      name,
      passwordHash,
      accessibility: {
        wheelchair: false,
        avoidSteps: false,
        avoidSteepSlopes: false,
        lowVision: false,
        requireAudibleCrosswalks: false,
        preferWellLitAtNight: false,
        blind: false,
        requireTactilePaving: false,
        hearingImpaired: false,
        preferVisualSignals: false,
        cognitiveAccessibility: false,
        simplifiedInstructions: false
      },
      metadata: {}
    };

    await db.createUser(userData);
    
    // Fetch created user (without password hash)
    const newUser = await db.getUserByEmail(email);
    const { password_hash, ...userProfile } = newUser;
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email 
      },
      process.env.JWT_SECRET || 'trek-iq-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email 
      },
      process.env.JWT_SECRET || 'trek-iq-secret-key',
      { expiresIn: '7d' }
    );

    // Return user profile without password hash
    const { password_hash, ...userProfile } = user;
    
    res.json({ 
      message: 'Login successful',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('Error logging in user:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/auth/verify - Verify JWT token
router.post('/verify', async (req, res) => {
  try {
    const auth = req.header('Authorization') || '';
    const token = auth.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'trek-iq-secret-key');
    const user = await db.getUserById(payload.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { password_hash, ...userProfile } = user;
    
    res.json({ 
      message: 'Token valid',
      user: userProfile
    });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
