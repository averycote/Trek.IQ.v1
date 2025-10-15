// routes/profile.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticate = require('../middleware/authenticate');

// GET /api/profile - Get user profile and accessibility preferences
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return profile without password hash
    const { password_hash, ...profile } = user;
    res.json({ profile });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/profile - Update profile and accessibility preferences
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, accessibility, accessibility_preferences, metadata } = req.body;

    // Handle both 'accessibility' and 'accessibility_preferences' for backward compatibility
    const accessibilityData = accessibility || accessibility_preferences;

    // Validate accessibility preferences structure
    if (accessibilityData && typeof accessibilityData !== 'object') {
      return res.status(400).json({ message: 'Accessibility preferences must be an object' });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (accessibilityData !== undefined) updateData.accessibility_preferences = accessibilityData;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Update user in database
    const changes = await db.updateUser(userId, updateData);
    
    if (changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch updated user data
    const updatedUser = await db.getUserById(userId);
    const { password_hash, ...profile } = updatedUser;
    
    res.json({ 
      message: 'Profile updated successfully',
      profile 
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/profile - Create new user profile (for registration)
router.post('/', async (req, res) => {
  try {
    const { email, name, passwordHash, accessibility, metadata } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Create new user
    const userData = {
      email,
      name: name || null,
      passwordHash: passwordHash || null,
      accessibility: accessibility || {},
      metadata: metadata || {}
    };

    await db.createUser(userData);
    
    // Fetch created user (without password hash)
    const newUser = await db.getUserByEmail(email);
    const { password_hash, ...profile } = newUser;
    
    res.status(201).json({ 
      message: 'User created successfully',
      profile 
    });
  } catch (err) {
    console.error('Error creating profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

