const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'data', 'trek-iq.db');

// Initialize database with comprehensive municipal datasets
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
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
        )`
      ];
      
      // Execute all table creation statements
      let completed = 0;
      const totalTables = createTables.length;
      
      createTables.forEach((sql, index) => {
        db.run(sql, (err) => {
          if (err) {
            console.error(`Error creating table ${index}:`, err);
          } else {
            console.log(`Table ${index + 1}/${totalTables} created successfully`);
          }
          
          completed++;
          if (completed === totalTables) {
            // Add performance indexes after tables are created
            addPerformanceIndexes(db).then(() => {
              console.log('All database tables and indexes ready');
              resolve(db);
            }).catch((indexErr) => {
              console.error('Error creating indexes:', indexErr);
              // Still resolve even if indexes fail
              console.log('All database tables ready (indexes failed)');
              resolve(db);
            });
          }
        });
      });
    });
  });
}

// Add performance indexes for better query performance
function addPerformanceIndexes(db) {
  return new Promise((resolve, reject) => {
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
    
    let completed = 0;
    const totalIndexes = indexes.length;
    
    indexes.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          console.error(`Error creating index ${index}:`, err);
        } else {
          console.log(`Index ${index + 1}/${totalIndexes} created successfully`);
        }
        
        completed++;
        if (completed === totalIndexes) {
          console.log('All performance indexes created');
          resolve();
        }
      });
    });
  });
}

// Database operations
class Database {
  constructor() {
    this.db = null;
  }
  
  async init() {
    this.db = await initializeDatabase();
  }
  
  // Insert new barrier
  insertBarrier(barrier) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO barriers (id, lat, lng, type, severity, notes, contact_name, contact_email, photo_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
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
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
      
      stmt.finalize();
    });
  }
  
  // Get all barriers
  getAllBarriers() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM barriers 
        ORDER BY created_at DESC
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // Update barrier status
  updateBarrierStatus(id, status) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE barriers 
        SET status = ? 
        WHERE id = ?
      `, [status, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
  
  // Get barrier by ID
  getBarrierById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM barriers 
        WHERE id = ?
      `, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Dataset operations for all municipal datasets
  async insertDatasetData(tableName, data) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const sql = `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getDatasetData(tableName, filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM ${tableName}`;
      const values = [];
      
      if (Object.keys(filters).length > 0) {
        const whereClause = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(filters));
      }
      
      this.db.all(sql, values, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getNearbyData(tableName, lat, lng, radius = 0.5) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT *, 
               ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) as distance_squared
        FROM ${tableName}
        WHERE ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) <= ?
        ORDER BY distance_squared
      `;
      
      const values = [lat, lat, lng, lng, lat, lat, lng, lng, radius * radius];
      
      this.db.all(sql, values, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // AI Predictions Cache
  async cachePrediction(routeHash, predictions, ttlMinutes = 15) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    return this.insertDatasetData('ai_predictions', {
      id: routeHash,
      route_hash: routeHash,
      predictions: JSON.stringify(predictions),
      expires_at: expiresAt.toISOString()
    });
  }

  async getCachedPrediction(routeHash) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT predictions FROM ai_predictions 
        WHERE route_hash = ? AND expires_at > datetime('now')
      `, [routeHash], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? JSON.parse(row.predictions) : null);
        }
      });
    });
  }

  // Notifications
  async createNotification(notification) {
    return this.insertDatasetData('notifications', {
      id: notification.id,
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: JSON.stringify(notification.data || {})
    });
  }

  async getNotifications(userId, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async markNotificationRead(notificationId) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE notifications 
        SET read = TRUE 
        WHERE id = ?
      `, [notificationId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Route History
  async saveRouteHistory(routeData) {
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

  async getRouteHistory(userId, limit = 20) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM route_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Clean up expired data
  async cleanupExpiredData() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        DELETE FROM ai_predictions 
        WHERE expires_at < datetime('now')
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = new Database();
