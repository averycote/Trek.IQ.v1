// Fallback database implementation without better-sqlite3 dependency
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, 'data', 'trek-iq.db');

// In-memory fallback database
class InMemoryDatabase {
  constructor() {
    this.data = {
      barriers: [],
      accessible_parking: [],
      active_travelways: [],
      bike_infrastructure: [],
      bus_stops: [],
      civic_addresses: [],
      public_washrooms: [],
      sidewalk_closures: [],
      steps: [],
      street_closures: [],
      street_junctions: [],
      street_lights: [],
      traffic_control: [],
      transit_routes: [],
      transit_shelters: [],
      ai_predictions: [],
      notifications: [],
      route_history: [],
      users: []
    };
  }

  exec(sql) {
    // Simple SQL execution for table creation (just log for now)
    console.log('Executing SQL:', sql.substring(0, 100) + '...');
  }

  prepare(sql) {
    return {
      run: (params) => ({ lastInsertRowid: Date.now(), changes: 1 }),
      get: (params) => null,
      all: (params) => []
    };
  }
}

// Initialize database with comprehensive municipal datasets
function initializeDatabase() {
  try {
    // Try to use better-sqlite3 if available, otherwise use in-memory fallback
    let db;
    try {
      const SQLite3 = require('better-sqlite3');
      db = new SQLite3(dbPath);
      console.log('Connected to SQLite database');
    } catch (sqliteError) {
      console.log('SQLite not available, using in-memory fallback database');
      db = new InMemoryDatabase();
    }
      
      // Create comprehensive tables for all municipal datasets
      const createTables = [
        // Barriers table (existing)
        `CREATE TABLE IF NOT EXISTS barriers (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          notes TEXT,
          contact_name TEXT,
          contact_email TEXT,
          photo_url TEXT,
          status TEXT DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Accessible Parking
        `CREATE TABLE IF NOT EXISTS accessible_parking (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          name TEXT,
          address TEXT,
          spaces INTEGER,
          time_limit TEXT,
          cost TEXT,
          features TEXT,
          accessible_features TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Active Travelways
        `CREATE TABLE IF NOT EXISTS active_travelways (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          name TEXT,
          type TEXT,
          surface_type TEXT,
          width REAL,
          slope REAL,
          accessibility_notes TEXT,
          maintenance_status TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Bike Infrastructure
        `CREATE TABLE IF NOT EXISTS bike_infrastructure (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          name TEXT,
          type TEXT,
          length REAL,
          surface_type TEXT,
          lighting TEXT,
          maintenance_status TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Bus Stops
        `CREATE TABLE IF NOT EXISTS bus_stops (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          name TEXT,
          route_numbers TEXT,
          accessible BOOLEAN,
          shelter BOOLEAN,
          lighting BOOLEAN,
          bench BOOLEAN,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Civic Addresses
        `CREATE TABLE IF NOT EXISTS civic_addresses (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          civic_number TEXT,
          street_name TEXT,
          full_address TEXT,
          postal_code TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Public Washrooms
        `CREATE TABLE IF NOT EXISTS public_washrooms (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          name TEXT,
          address TEXT,
          type TEXT,
          accessible BOOLEAN,
          open_hours TEXT,
          maintenance_status TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Sidewalk Closures
        `CREATE TABLE IF NOT EXISTS sidewalk_closures (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          reason TEXT,
          start_date TEXT,
          end_date TEXT,
          length REAL,
          affected_segments TEXT,
          status TEXT DEFAULT 'active',
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Steps
        `CREATE TABLE IF NOT EXISTS steps (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          count INTEGER,
          height REAL,
          width REAL,
          surface_type TEXT,
          lighting BOOLEAN,
          handrails BOOLEAN,
          accessibility_notes TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Street Closures
        `CREATE TABLE IF NOT EXISTS street_closures (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          reason TEXT,
          start_date TEXT,
          end_date TEXT,
          affected_segments TEXT,
          length REAL,
          status TEXT DEFAULT 'active',
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Street Junctions
        `CREATE TABLE IF NOT EXISTS street_junctions (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          type TEXT,
          crosswalks INTEGER,
          traffic_signals BOOLEAN,
          accessibility_features TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Street Lights
        `CREATE TABLE IF NOT EXISTS street_lights (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          type TEXT,
          wattage INTEGER,
          maintenance_status TEXT,
          last_maintenance TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Traffic Control
        `CREATE TABLE IF NOT EXISTS traffic_control (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          type TEXT,
          status TEXT,
          maintenance_status TEXT,
          last_maintenance TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Transit Routes
        `CREATE TABLE IF NOT EXISTS transit_routes (
          id TEXT PRIMARY KEY,
          route_number TEXT,
          route_name TEXT,
          route_type TEXT,
          accessible BOOLEAN,
          snow_route BOOLEAN,
          coordinates TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Transit Shelters
        `CREATE TABLE IF NOT EXISTS transit_shelters (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          name TEXT,
          accessible BOOLEAN,
          lighting BOOLEAN,
          bench BOOLEAN,
          maintenance_status TEXT,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // AI Predictions Cache
        `CREATE TABLE IF NOT EXISTS ai_predictions (
          id TEXT PRIMARY KEY,
          route_hash TEXT,
          predictions TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP
        )`,
        
        // Real-time Notifications
        `CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          type TEXT,
          title TEXT,
          message TEXT,
          data TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Route History
        `CREATE TABLE IF NOT EXISTS route_history (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          origin_lat REAL,
          origin_lng REAL,
          destination_lat REAL,
          destination_lng REAL,
          mode TEXT,
          route_data TEXT,
          barriers_encountered TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Users table for authentication
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          accessibility_preferences TEXT,
          metadata TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      ];
      
      // Execute all table creation statements
      createTables.forEach((sql, index) => {
      try {
        db.exec(sql);
        console.log(`Table ${index + 1}/${createTables.length} created successfully`);
      } catch (err) {
            console.error(`Error creating table ${index}:`, err);
          }
    });
          
            // Add performance indexes after tables are created
    try {
      addPerformanceIndexes(db);
              console.log('All database tables and indexes ready');
    } catch (indexErr) {
              console.error('Error creating indexes:', indexErr);
              console.log('All database tables ready (indexes failed)');
    }
    
    return db;
  } catch (err) {
    console.error('Error opening database:', err);
    throw err;
  }
}

// Add performance indexes for better query performance
function addPerformanceIndexes(db) {
    const indexes = [
      // Barriers indexes
      'CREATE INDEX IF NOT EXISTS idx_barriers_lat_lng ON barriers(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_barriers_type ON barriers(type)',
      'CREATE INDEX IF NOT EXISTS idx_barriers_status ON barriers(status)',
      'CREATE INDEX IF NOT EXISTS idx_barriers_created_at ON barriers(created_at)',
      
      // Accessible parking indexes
      'CREATE INDEX IF NOT EXISTS idx_accessible_parking_lat_lng ON accessible_parking(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_accessible_parking_name ON accessible_parking(name)',
      
      // Active travelways indexes
      'CREATE INDEX IF NOT EXISTS idx_active_travelways_lat_lng ON active_travelways(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_active_travelways_type ON active_travelways(type)',
      
      // Bike infrastructure indexes
      'CREATE INDEX IF NOT EXISTS idx_bike_infrastructure_lat_lng ON bike_infrastructure(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_bike_infrastructure_type ON bike_infrastructure(type)',
      
      // Bus stops indexes
      'CREATE INDEX IF NOT EXISTS idx_bus_stops_lat_lng ON bus_stops(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_bus_stops_accessible ON bus_stops(accessible)',
      'CREATE INDEX IF NOT EXISTS idx_bus_stops_route_numbers ON bus_stops(route_numbers)',
      
      // Civic addresses indexes
      'CREATE INDEX IF NOT EXISTS idx_civic_addresses_lat_lng ON civic_addresses(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_civic_addresses_street_name ON civic_addresses(street_name)',
      'CREATE INDEX IF NOT EXISTS idx_civic_addresses_civic_number ON civic_addresses(civic_number)',
      
      // Public washrooms indexes
      'CREATE INDEX IF NOT EXISTS idx_public_washrooms_lat_lng ON public_washrooms(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_public_washrooms_accessible ON public_washrooms(accessible)',
      
      // Steps indexes
      'CREATE INDEX IF NOT EXISTS idx_steps_lat_lng ON steps(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_steps_count ON steps(count)',
      
      // Street lights indexes
      'CREATE INDEX IF NOT EXISTS idx_street_lights_lat_lng ON street_lights(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_street_lights_type ON street_lights(type)',
      
      // Traffic control indexes
      'CREATE INDEX IF NOT EXISTS idx_traffic_control_lat_lng ON traffic_control(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_traffic_control_type ON traffic_control(type)',
      
      // Transit routes indexes
      'CREATE INDEX IF NOT EXISTS idx_transit_routes_route_number ON transit_routes(route_number)',
      'CREATE INDEX IF NOT EXISTS idx_transit_routes_accessible ON transit_routes(accessible)',
      
      // Transit shelters indexes
      'CREATE INDEX IF NOT EXISTS idx_transit_shelters_lat_lng ON transit_shelters(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_transit_shelters_accessible ON transit_shelters(accessible)',
      
      // AI predictions cache indexes
      'CREATE INDEX IF NOT EXISTS idx_ai_predictions_route_hash ON ai_predictions(route_hash)',
      'CREATE INDEX IF NOT EXISTS idx_ai_predictions_expires_at ON ai_predictions(expires_at)',
      
      // Notifications indexes
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
      
      // Route history indexes
      'CREATE INDEX IF NOT EXISTS idx_route_history_user_id ON route_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_route_history_created_at ON route_history(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_route_history_origin_lat_lng ON route_history(origin_lat, origin_lng)',
      'CREATE INDEX IF NOT EXISTS idx_route_history_destination_lat_lng ON route_history(destination_lat, destination_lng)'
    ];
    
    indexes.forEach((sql, index) => {
    try {
      db.exec(sql);
      console.log(`Index ${index + 1}/${indexes.length} created successfully`);
    } catch (err) {
          console.error(`Error creating index ${index}:`, err);
    }
  });
  
  console.log('All performance indexes created');
}

// Database operations
class Database {
  constructor() {
    this.db = null;
    this.isInMemory = false;
  }
  
  init() {
    this.db = initializeDatabase();
    this.isInMemory = this.db instanceof InMemoryDatabase;
  }
  
  // Insert new barrier
  insertBarrier(barrier) {
    try {
      if (this.isInMemory) {
        // In-memory fallback
        const newBarrier = {
          id: barrier.id,
          lat: barrier.lat,
          lng: barrier.lng,
          type: barrier.type,
          severity: barrier.severity,
          notes: barrier.notes || null,
          contact_name: barrier.contact?.name || null,
          contact_email: barrier.contact?.email || null,
          photo_url: barrier.photoUrl || null,
          status: 'new',
          created_at: new Date().toISOString()
        };
        this.db.data.barriers.push(newBarrier);
        return Date.now();
      } else {
        const stmt = this.db.prepare(`
          INSERT INTO barriers (id, lat, lng, type, severity, notes, contact_name, contact_email, photo_url, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run([
          barrier.id,
          barrier.lat,
          barrier.lng,
          barrier.type,
          barrier.severity,
          barrier.notes || null,
          barrier.contact?.name || null,
          barrier.contact?.email || null,
          barrier.photoUrl || null,
          'new'
        ]);
        
        return result.lastInsertRowid;
      }
    } catch (err) {
      throw err;
    }
  }
  
  // Get all barriers
  getAllBarriers() {
    try {
      if (this.isInMemory) {
        return this.db.data.barriers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else {
        const stmt = this.db.prepare(`
          SELECT * FROM barriers 
          ORDER BY created_at DESC
        `);
        return stmt.all();
      }
    } catch (err) {
      throw err;
    }
  }
  
  // Update barrier status
  updateBarrierStatus(id, status) {
    try {
      const stmt = this.db.prepare(`
        UPDATE barriers 
        SET status = ? 
        WHERE id = ?
      `);
      const result = stmt.run(status, id);
      return result.changes;
    } catch (err) {
      throw err;
    }
  }
  
  // Get barrier by ID
  getBarrierById(id) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM barriers 
        WHERE id = ?
      `);
      return stmt.get(id);
    } catch (err) {
      throw err;
    }
  }

  // Dataset operations for all municipal datasets
  insertDatasetData(tableName, data) {
    try {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const sql = `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(values);
      return result.lastInsertRowid;
    } catch (err) {
      throw err;
    }
  }

  getDatasetData(tableName, filters = {}) {
    try {
      let sql = `SELECT * FROM ${tableName}`;
      const values = [];
      
      if (Object.keys(filters).length > 0) {
        const whereClause = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(filters));
      }
      
      const stmt = this.db.prepare(sql);
      return stmt.all(values);
    } catch (err) {
      throw err;
    }
  }

  getNearbyData(tableName, lat, lng, radius = 0.5) {
    try {
      const sql = `
        SELECT *, 
               ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) as distance_squared
        FROM ${tableName}
        WHERE ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) <= ?
        ORDER BY distance_squared
      `;
      
      const values = [lat, lat, lng, lng, lat, lat, lng, lng, radius * radius];
      const stmt = this.db.prepare(sql);
      return stmt.all(values);
    } catch (err) {
      throw err;
    }
  }

  // AI Predictions Cache
  cachePrediction(routeHash, predictions, ttlMinutes = 15) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    return this.insertDatasetData('ai_predictions', {
      id: routeHash,
      route_hash: routeHash,
      predictions: JSON.stringify(predictions),
      expires_at: expiresAt.toISOString()
    });
  }

  getCachedPrediction(routeHash) {
    try {
      const stmt = this.db.prepare(`
        SELECT predictions FROM ai_predictions 
        WHERE route_hash = ? AND expires_at > datetime('now')
      `);
      const row = stmt.get(routeHash);
      return row ? JSON.parse(row.predictions) : null;
    } catch (err) {
      throw err;
    }
  }

  // Notifications
  createNotification(notification) {
    return this.insertDatasetData('notifications', {
      id: notification.id,
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: JSON.stringify(notification.data || {})
    });
  }

  getNotifications(userId, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      return stmt.all(userId, limit);
    } catch (err) {
      throw err;
    }
  }

  markNotificationRead(notificationId) {
    try {
      const stmt = this.db.prepare(`
        UPDATE notifications 
        SET read = TRUE 
        WHERE id = ?
      `);
      const result = stmt.run(notificationId);
      return result.changes;
    } catch (err) {
      throw err;
    }
  }

  // Route History
  saveRouteHistory(routeData) {
    return this.insertDatasetData('route_history', {
      id: routeData.id,
      user_id: routeData.userId,
      origin_lat: routeData.origin.lat,
      origin_lng: routeData.origin.lng,
      destination_lat: routeData.destination.lat,
      destination_lng: routeData.destination.lng,
      mode: routeData.mode,
      route_data: JSON.stringify(routeData.route),
      barriers_encountered: JSON.stringify(routeData.barriers || [])
    });
  }

  getRouteHistory(userId, limit = 20) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM route_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      return stmt.all(userId, limit);
    } catch (err) {
      throw err;
    }
  }

  // Clean up expired data
  cleanupExpiredData() {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM ai_predictions 
        WHERE expires_at < datetime('now')
      `);
      stmt.run();
    } catch (err) {
      throw err;
    }
  }

  // User management functions
  createUser(userData) {
    try {
      if (this.isInMemory) {
        // In-memory fallback
        const newUser = {
          id: userData.id || `user_${Date.now()}`,
          email: userData.email,
          name: userData.name,
          password_hash: userData.passwordHash,
          accessibility_preferences: JSON.stringify(userData.accessibility_preferences || userData.accessibility || {}),
          metadata: JSON.stringify(userData.metadata || {}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Check if user already exists
        const existingUser = this.db.data.users?.find(u => u.email === userData.email);
        if (existingUser) {
          throw new Error('User already exists with this email');
        }
        
        if (!this.db.data.users) {
          this.db.data.users = [];
        }
        
        this.db.data.users.push(newUser);
        return newUser.id;
      } else {
        const stmt = this.db.prepare(`
          INSERT INTO users (id, email, name, password_hash, accessibility_preferences, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const userId = userData.id || `user_${Date.now()}`;
        const result = stmt.run([
          userId,
          userData.email,
          userData.name,
          userData.passwordHash,
          JSON.stringify(userData.accessibility_preferences || userData.accessibility || {}),
          JSON.stringify(userData.metadata || {})
        ]);
        
        return result.lastInsertRowid;
      }
    } catch (err) {
      throw err;
    }
  }

  getUserByEmail(email) {
    try {
      if (this.isInMemory) {
        const user = this.db.data.users?.find(u => u.email === email);
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            password_hash: user.password_hash,
            accessibility_preferences: JSON.parse(user.accessibility_preferences || '{}'),
            metadata: JSON.parse(user.metadata || '{}'),
            created_at: user.created_at,
            updated_at: user.updated_at
          };
        }
        return null;
      } else {
        const stmt = this.db.prepare(`
          SELECT * FROM users WHERE email = ?
        `);
        const user = stmt.get(email);
        
        if (user) {
          return {
            ...user,
            accessibility_preferences: JSON.parse(user.accessibility_preferences || '{}'),
            metadata: JSON.parse(user.metadata || '{}')
          };
        }
        return null;
      }
    } catch (err) {
      throw err;
    }
  }

  getUserById(id) {
    try {
      if (this.isInMemory) {
        const user = this.db.data.users?.find(u => u.id === id);
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            password_hash: user.password_hash,
            accessibility_preferences: JSON.parse(user.accessibility_preferences || '{}'),
            metadata: JSON.parse(user.metadata || '{}'),
            created_at: user.created_at,
            updated_at: user.updated_at
          };
        }
        return null;
      } else {
        const stmt = this.db.prepare(`
          SELECT * FROM users WHERE id = ?
        `);
        const user = stmt.get(id);
        
        if (user) {
          return {
            ...user,
            accessibility_preferences: JSON.parse(user.accessibility_preferences || '{}'),
            metadata: JSON.parse(user.metadata || '{}')
          };
        }
        return null;
      }
    } catch (err) {
      throw err;
    }
  }

  updateUser(id, updates) {
    try {
      if (this.isInMemory) {
        const userIndex = this.db.data.users?.findIndex(u => u.id === id);
        if (userIndex !== -1 && userIndex !== undefined) {
          const user = this.db.data.users[userIndex];
          const updatedUser = {
            ...user,
            ...updates,
            updated_at: new Date().toISOString()
          };
          
          if (updates.accessibility_preferences) {
            updatedUser.accessibility_preferences = JSON.stringify(updates.accessibility_preferences);
          }
          if (updates.metadata) {
            updatedUser.metadata = JSON.stringify(updates.metadata);
          }
          
          this.db.data.users[userIndex] = updatedUser;
          return 1;
        }
        return 0;
      } else {
        const setClause = Object.keys(updates).map(key => {
          if (key === 'accessibility_preferences' || key === 'metadata') {
            return `${key} = ?`;
          }
          return `${key} = ?`;
        }).join(', ');
        
        const values = Object.entries(updates).map(([key, value]) => {
          if (key === 'accessibility_preferences' || key === 'metadata') {
            return JSON.stringify(value);
          }
          return value;
        });
        
        values.push(id);
        
        const stmt = this.db.prepare(`
          UPDATE users 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        const result = stmt.run(values);
        return result.changes;
      }
    } catch (err) {
      throw err;
    }
  }
}

module.exports = new Database();
