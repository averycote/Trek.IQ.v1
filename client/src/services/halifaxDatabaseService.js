// Halifax Database Service - Local business and building data management
class HalifaxDatabaseService {
  constructor() {
    this.businesses = new Map();
    this.buildings = new Map();
    this.searchIndex = new Map();
    this.initializeData();
  }

  // Initialize Halifax data
  initializeData() {
    // Halifax Business Directory
    const businesses = [
      // Coffee Shops & Restaurants
      {
        id: 'tim_hortons_barrington',
        name: 'Tim Hortons',
        type: 'restaurant',
        category: 'coffee',
        address: '1234 Barrington Street',
        fullAddress: 'Tim Hortons, 1234 Barrington Street, Halifax, NS',
        coordinates: [-63.5742, 44.6488],
        phone: '+1-902-555-0101',
        hours: '24/7',
        accessibility: ['wheelchair_accessible', 'accessible_parking'],
        tags: ['coffee', 'donuts', 'breakfast', 'fast_food']
      },
      {
        id: 'tim_hortons_spring_garden',
        name: 'Tim Hortons',
        type: 'restaurant',
        category: 'coffee',
        address: '5678 Spring Garden Road',
        fullAddress: 'Tim Hortons, 5678 Spring Garden Road, Halifax, NS',
        coordinates: [-63.5756, 44.6423],
        phone: '+1-902-555-0102',
        hours: '6:00 AM - 10:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['coffee', 'donuts', 'breakfast', 'fast_food']
      },
      {
        id: 'tim_hortons_robie',
        name: 'Tim Hortons',
        type: 'restaurant',
        category: 'coffee',
        address: '9012 Robie Street',
        fullAddress: 'Tim Hortons, 9012 Robie Street, Halifax, NS',
        coordinates: [-63.5891, 44.6456],
        phone: '+1-902-555-0103',
        hours: '5:30 AM - 11:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_parking'],
        tags: ['coffee', 'donuts', 'breakfast', 'fast_food']
      },
      {
        id: 'starbucks_barrington',
        name: 'Starbucks',
        type: 'restaurant',
        category: 'coffee',
        address: '1250 Barrington Street',
        fullAddress: 'Starbucks, 1250 Barrington Street, Halifax, NS',
        coordinates: [-63.5745, 44.6485],
        phone: '+1-902-555-0201',
        hours: '6:00 AM - 9:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['coffee', 'espresso', 'pastries', 'premium']
      },
      {
        id: 'starbucks_spring_garden',
        name: 'Starbucks',
        type: 'restaurant',
        category: 'coffee',
        address: '5680 Spring Garden Road',
        fullAddress: 'Starbucks, 5680 Spring Garden Road, Halifax, NS',
        coordinates: [-63.5752, 44.6420],
        phone: '+1-902-555-0202',
        hours: '6:30 AM - 8:30 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['coffee', 'espresso', 'pastries', 'premium']
      },
      {
        id: 'second_cup_quinpool',
        name: 'Second Cup',
        type: 'restaurant',
        category: 'coffee',
        address: '2345 Quinpool Road',
        fullAddress: 'Second Cup, 2345 Quinpool Road, Halifax, NS',
        coordinates: [-63.5823, 44.6401],
        phone: '+1-902-555-0301',
        hours: '7:00 AM - 8:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['coffee', 'espresso', 'sandwiches']
      },

      // Grocery Stores
      {
        id: 'sobeys_barrington',
        name: 'Sobeys',
        type: 'store',
        category: 'grocery',
        address: '1200 Barrington Street',
        fullAddress: 'Sobeys, 1200 Barrington Street, Halifax, NS',
        coordinates: [-63.5738, 44.6492],
        phone: '+1-902-555-0401',
        hours: '7:00 AM - 11:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_parking', 'accessible_entrance'],
        tags: ['grocery', 'fresh_produce', 'dairy', 'meat']
      },
      {
        id: 'sobeys_quinpool',
        name: 'Sobeys',
        type: 'store',
        category: 'grocery',
        address: '2300 Quinpool Road',
        fullAddress: 'Sobeys, 2300 Quinpool Road, Halifax, NS',
        coordinates: [-63.5830, 44.6405],
        phone: '+1-902-555-0402',
        hours: '7:00 AM - 11:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_parking'],
        tags: ['grocery', 'fresh_produce', 'dairy', 'meat']
      },
      {
        id: 'superstore_barrington',
        name: 'Superstore',
        type: 'store',
        category: 'grocery',
        address: '1205 Barrington Street',
        fullAddress: 'Superstore, 1205 Barrington Street, Halifax, NS',
        coordinates: [-63.5740, 44.6490],
        phone: '+1-902-555-0501',
        hours: '7:00 AM - 11:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_parking', 'accessible_entrance'],
        tags: ['grocery', 'bulk_items', 'organic', 'international']
      },
      {
        id: 'walmart_bayers_lake',
        name: 'Walmart',
        type: 'store',
        category: 'retail',
        address: '1000 Bayers Lake Business Park',
        fullAddress: 'Walmart, 1000 Bayers Lake Business Park, Halifax, NS',
        coordinates: [-63.6500, 44.6800],
        phone: '+1-902-555-0601',
        hours: '7:00 AM - 11:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_parking', 'accessible_entrance'],
        tags: ['retail', 'electronics', 'clothing', 'household']
      },

      // Banks
      {
        id: 'rbc_barrington',
        name: 'RBC Royal Bank',
        type: 'bank',
        category: 'financial',
        address: '1240 Barrington Street',
        fullAddress: 'RBC Royal Bank, 1240 Barrington Street, Halifax, NS',
        coordinates: [-63.5748, 44.6482],
        phone: '+1-902-555-0701',
        hours: '9:00 AM - 5:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_entrance'],
        tags: ['banking', 'atm', 'financial_services']
      },
      {
        id: 'rbc_spring_garden',
        name: 'RBC Royal Bank',
        type: 'bank',
        category: 'financial',
        address: '5685 Spring Garden Road',
        fullAddress: 'RBC Royal Bank, 5685 Spring Garden Road, Halifax, NS',
        coordinates: [-63.5758, 44.6418],
        phone: '+1-902-555-0702',
        hours: '9:00 AM - 5:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['banking', 'atm', 'financial_services']
      },
      {
        id: 'td_barrington',
        name: 'TD Bank',
        type: 'bank',
        category: 'financial',
        address: '1235 Barrington Street',
        fullAddress: 'TD Bank, 1235 Barrington Street, Halifax, NS',
        coordinates: [-63.5743, 44.6486],
        phone: '+1-902-555-0801',
        hours: '9:00 AM - 5:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['banking', 'atm', 'financial_services']
      },
      {
        id: 'scotiabank_spring_garden',
        name: 'Scotiabank',
        type: 'bank',
        category: 'financial',
        address: '5675 Spring Garden Road',
        fullAddress: 'Scotiabank, 5675 Spring Garden Road, Halifax, NS',
        coordinates: [-63.5754, 44.6422],
        phone: '+1-902-555-0901',
        hours: '9:00 AM - 5:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['banking', 'atm', 'financial_services']
      },

      // Pharmacies
      {
        id: 'shoppers_barrington',
        name: 'Shoppers Drug Mart',
        type: 'pharmacy',
        category: 'health',
        address: '1245 Barrington Street',
        fullAddress: 'Shoppers Drug Mart, 1245 Barrington Street, Halifax, NS',
        coordinates: [-63.5746, 44.6484],
        phone: '+1-902-555-1001',
        hours: '8:00 AM - 10:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['pharmacy', 'cosmetics', 'health_products']
      },
      {
        id: 'shoppers_spring_garden',
        name: 'Shoppers Drug Mart',
        type: 'pharmacy',
        category: 'health',
        address: '5670 Spring Garden Road',
        fullAddress: 'Shoppers Drug Mart, 5670 Spring Garden Road, Halifax, NS',
        coordinates: [-63.5750, 44.6425],
        phone: '+1-902-555-1002',
        hours: '8:00 AM - 10:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['pharmacy', 'cosmetics', 'health_products']
      },
      {
        id: 'lawtons_quinpool',
        name: 'Lawtons Drugs',
        type: 'pharmacy',
        category: 'health',
        address: '2310 Quinpool Road',
        fullAddress: 'Lawtons Drugs, 2310 Quinpool Road, Halifax, NS',
        coordinates: [-63.5825, 44.6403],
        phone: '+1-902-555-1101',
        hours: '8:00 AM - 9:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['pharmacy', 'health_products', 'convenience']
      },

      // Universities & Schools
      {
        id: 'dalhousie_university',
        name: 'Dalhousie University',
        type: 'university',
        category: 'education',
        address: '6299 South Street',
        fullAddress: 'Dalhousie University, 6299 South Street, Halifax, NS',
        coordinates: [-63.5912, 44.6368],
        phone: '+1-902-494-2211',
        hours: '24/7 (Campus)',
        accessibility: ['wheelchair_accessible', 'accessible_parking', 'accessible_entrance'],
        tags: ['university', 'education', 'research', 'student_services']
      },
      {
        id: 'saint_marys_university',
        name: "Saint Mary's University",
        type: 'university',
        category: 'education',
        address: '923 Robie Street',
        fullAddress: "Saint Mary's University, 923 Robie Street, Halifax, NS",
        coordinates: [-63.5898, 44.6458],
        phone: '+1-902-420-5400',
        hours: '24/7 (Campus)',
        accessibility: ['wheelchair_accessible', 'accessible_parking'],
        tags: ['university', 'education', 'research', 'student_services']
      },

      // Government Buildings
      {
        id: 'halifax_city_hall',
        name: 'Halifax City Hall',
        type: 'government',
        category: 'municipal',
        address: '1841 Argyle Street',
        fullAddress: 'Halifax City Hall, 1841 Argyle Street, Halifax, NS',
        coordinates: [-63.5756, 44.6489],
        phone: '+1-902-490-4000',
        hours: '8:30 AM - 4:30 PM',
        accessibility: ['wheelchair_accessible', 'accessible_entrance'],
        tags: ['government', 'municipal', 'city_services', 'permits']
      },
      {
        id: 'province_house',
        name: 'Province House',
        type: 'government',
        category: 'provincial',
        address: '1726 Hollis Street',
        fullAddress: 'Province House, 1726 Hollis Street, Halifax, NS',
        coordinates: [-63.5752, 44.6485],
        phone: '+1-902-424-4661',
        hours: '9:00 AM - 5:00 PM',
        accessibility: ['wheelchair_accessible'],
        tags: ['government', 'provincial', 'legislature', 'historic']
      }
    ];

    // Halifax Building Directory
    const buildings = [
      {
        id: 'purdys_wharf',
        name: "Purdy's Wharf",
        type: 'office',
        category: 'commercial',
        address: '1959 Upper Water Street',
        fullAddress: "Purdy's Wharf, 1959 Upper Water Street, Halifax, NS",
        coordinates: [-63.5725, 44.6475],
        phone: '+1-902-555-2001',
        hours: '6:00 AM - 8:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_entrance'],
        tags: ['office_building', 'commercial', 'waterfront', 'premium']
      },
      {
        id: 'scotia_square',
        name: 'Scotia Square',
        type: 'office',
        category: 'commercial',
        address: '5201 Duke Street',
        fullAddress: 'Scotia Square, 5201 Duke Street, Halifax, NS',
        coordinates: [-63.5745, 44.6485],
        phone: '+1-902-555-2002',
        hours: '6:00 AM - 8:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_entrance'],
        tags: ['office_building', 'commercial', 'downtown']
      },
      {
        id: 'cogswell_tower',
        name: 'Cogswell Tower',
        type: 'residential',
        category: 'apartment',
        address: '2000 Barrington Street',
        fullAddress: 'Cogswell Tower, 2000 Barrington Street, Halifax, NS',
        coordinates: [-63.5742, 44.6482],
        phone: '+1-902-555-2003',
        hours: '24/7',
        accessibility: ['wheelchair_accessible', 'accessible_entrance'],
        tags: ['residential', 'apartment', 'downtown', 'luxury']
      },
      {
        id: 'halifax_central_library',
        name: 'Halifax Central Library',
        type: 'library',
        category: 'public',
        address: '5440 Spring Garden Road',
        fullAddress: 'Halifax Central Library, 5440 Spring Garden Road, Halifax, NS',
        coordinates: [-63.5752, 44.6422],
        phone: '+1-902-490-5700',
        hours: '9:00 AM - 9:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_entrance', 'accessible_parking'],
        tags: ['library', 'public', 'books', 'study_space', 'events']
      },
      {
        id: 'art_gallery_nova_scotia',
        name: 'Art Gallery of Nova Scotia',
        type: 'museum',
        category: 'cultural',
        address: '1723 Hollis Street',
        fullAddress: 'Art Gallery of Nova Scotia, 1723 Hollis Street, Halifax, NS',
        coordinates: [-63.5750, 44.6480],
        phone: '+1-902-424-7542',
        hours: '10:00 AM - 5:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_entrance'],
        tags: ['museum', 'art', 'cultural', 'exhibitions']
      },
      {
        id: 'halifax_citadel',
        name: 'Halifax Citadel',
        type: 'fortress',
        category: 'historic',
        address: '5425 Sackville Street',
        fullAddress: 'Halifax Citadel, 5425 Sackville Street, Halifax, NS',
        coordinates: [-63.5800, 44.6450],
        phone: '+1-902-426-5080',
        hours: '9:00 AM - 5:00 PM',
        accessibility: ['wheelchair_accessible', 'accessible_entrance'],
        tags: ['historic', 'fortress', 'museum', 'tourism']
      }
    ];

    // Index businesses
    businesses.forEach(business => {
      this.businesses.set(business.id, business);
      this.indexForSearch(business);
    });

    // Index buildings
    buildings.forEach(building => {
      this.buildings.set(building.id, building);
      this.indexForSearch(building);
    });
  }

  // Index items for search
  indexForSearch(item) {
    const searchTerms = [
      item.name.toLowerCase(),
      item.address.toLowerCase(),
      item.category.toLowerCase(),
      ...item.tags.map(tag => tag.toLowerCase())
    ];

    searchTerms.forEach(term => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, []);
      }
      this.searchIndex.get(term).push(item);
    });
  }

  // Search businesses and buildings
  search(query, options = {}) {
    const queryLower = query.toLowerCase();
    const results = [];
    const seen = new Set();

    // Search by name, address, category, and tags
    for (const [term, items] of this.searchIndex) {
      if (term.includes(queryLower) || queryLower.includes(term)) {
        items.forEach(item => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            results.push({
              ...item,
              relevance: this.calculateRelevance(query, item),
              source: item.type === 'university' || item.type === 'government' ? 'local_building' : 'local_business'
            });
          }
        });
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  // Calculate relevance score
  calculateRelevance(query, item) {
    const queryLower = query.toLowerCase();
    const nameLower = item.name.toLowerCase();
    const addressLower = item.address.toLowerCase();
    
    let score = 0;
    
    // Exact name match
    if (nameLower === queryLower) score += 100;
    // Name starts with query
    else if (nameLower.startsWith(queryLower)) score += 80;
    // Name contains query
    else if (nameLower.includes(queryLower)) score += 60;
    
    // Address contains query
    if (addressLower.includes(queryLower)) score += 40;
    
    // Category match
    if (item.category.toLowerCase().includes(queryLower)) score += 30;
    
    // Tag matches
    item.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) score += 20;
    });
    
    return score;
  }

  // Get business by ID
  getBusiness(id) {
    return this.businesses.get(id);
  }

  // Get building by ID
  getBuilding(id) {
    return this.buildings.get(id);
  }

  // Get all businesses
  getAllBusinesses() {
    return Array.from(this.businesses.values());
  }

  // Get all buildings
  getAllBuildings() {
    return Array.from(this.buildings.values());
  }

  // Search by category
  searchByCategory(category) {
    const results = [];
    const categoryLower = category.toLowerCase();
    
    for (const item of [...this.businesses.values(), ...this.buildings.values()]) {
      if (item.category.toLowerCase() === categoryLower) {
        results.push(item);
      }
    }
    
    return results;
  }

  // Search by accessibility features
  searchByAccessibility(features) {
    const results = [];
    
    for (const item of [...this.businesses.values(), ...this.buildings.values()]) {
      if (features.every(feature => item.accessibility.includes(feature))) {
        results.push(item);
      }
    }
    
    return results;
  }

  // Get nearby places
  getNearbyPlaces(coordinates, radius = 1000) {
    const results = [];
    
    for (const item of [...this.businesses.values(), ...this.buildings.values()]) {
      const distance = this.calculateDistance(coordinates, item.coordinates);
      if (distance <= radius) {
        results.push({
          ...item,
          distance
        });
      }
    }
    
    return results.sort((a, b) => a.distance - b.distance);
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1[1] * Math.PI / 180;
    const φ2 = coord2[1] * Math.PI / 180;
    const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
    const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Get statistics
  getStats() {
    return {
      totalBusinesses: this.businesses.size,
      totalBuildings: this.buildings.size,
      totalItems: this.businesses.size + this.buildings.size,
      categories: this.getCategoryStats(),
      accessibility: this.getAccessibilityStats()
    };
  }

  // Get category statistics
  getCategoryStats() {
    const stats = {};
    
    for (const item of [...this.businesses.values(), ...this.buildings.values()]) {
      stats[item.category] = (stats[item.category] || 0) + 1;
    }
    
    return stats;
  }

  // Get accessibility statistics
  getAccessibilityStats() {
    const stats = {};
    
    for (const item of [...this.businesses.values(), ...this.buildings.values()]) {
      item.accessibility.forEach(feature => {
        stats[feature] = (stats[feature] || 0) + 1;
      });
    }
    
    return stats;
  }
}

// Create singleton instance
const halifaxDatabaseService = new HalifaxDatabaseService();
export default halifaxDatabaseService;
