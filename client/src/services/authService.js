/**
 * Authentication Service
 * 
 * Simple authentication service for demo purposes
 * In production, this would integrate with a proper auth provider
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.init();
  }

  init() {
    // Check for existing auth data in localStorage
    const storedToken = localStorage.getItem('jwt');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      this.token = storedToken;
      this.currentUser = JSON.parse(storedUser);
    }
  }

  // Demo login - creates a demo user
  async login(email = 'demo@trek-iq.com', password = 'demo123') {
    try {
      // In a real app, this would make an API call to authenticate
      const demoUser = {
        id: 'demo_user_' + Date.now(),
        email: email,
        name: 'Demo User',
        accessibility_preferences: {
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

      const demoToken = 'demo_jwt_token_' + Date.now();
      
      this.currentUser = demoUser;
      this.token = demoToken;
      
      // Store in localStorage
      localStorage.setItem('jwt', demoToken);
      localStorage.setItem('user', JSON.stringify(demoUser));
      
      return { user: demoUser, token: demoToken };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Demo logout
  logout() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token && !!this.currentUser;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get auth token
  getToken() {
    return this.token;
  }

  // Get auth headers for API calls
  getAuthHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // Update user profile
  async updateProfile(updates) {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      // Update local user data
      this.currentUser = { ...this.currentUser, ...updates };
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      
      // In a real app, this would make an API call to update the server
      return this.currentUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  // Create a new user account (demo)
  async register(email, name, password) {
    try {
      const newUser = {
        id: 'user_' + Date.now(),
        email: email,
        name: name,
        accessibility_preferences: {},
        metadata: {}
      };

      const token = 'jwt_token_' + Date.now();
      
      this.currentUser = newUser;
      this.token = token;
      
      localStorage.setItem('jwt', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      return { user: newUser, token: token };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new AuthService();


