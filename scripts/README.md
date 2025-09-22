# Trek.IQ Accessibility Data Scripts

This directory contains scripts for downloading and managing accessibility data for Trek.IQ.

## Overview

Trek.IQ uses a massive dataset of 150,000+ accessibility records from [accessibility.cloud](https://www.accessibility.cloud/sources/LiBTS67TjmBcXdEmX?limit=150000) containing comprehensive Wheelmap data. This provides detailed accessibility information for places worldwide, with a focus on wheelchair accessibility.

## Quick Start

### 1. Download Accessibility Data

```bash
# From the project root
npm run download:accessibility

# Or directly
node scripts/downloadAccessibilityData.js
```

This will:
- Download 150k+ accessibility records from accessibility.cloud
- Create optimized data structures for fast queries
- Generate indexes for categories and accessibility status
- Save multiple formats (GeoJSON, optimized JSON, backups)
- Display comprehensive statistics

### 2. Verify Data

Check if the data was downloaded successfully:

```bash
curl http://localhost:8081/api/accessibility/health
```

### 3. Query Data

Once downloaded, you can query the data through the API:

```bash
# Get accessibility statistics
curl http://localhost:8081/api/accessibility/stats

# Find accessible places near Halifax Central Library
curl "http://localhost:8081/api/accessibility/nearby?lat=44.6488&lon=-63.5752&wheelchair=yes&limit=10"

# Search for libraries
curl "http://localhost:8081/api/accessibility/search?q=library&wheelchair=yes"

# Get places in a bounding box
curl "http://localhost:8081/api/accessibility/places?bbox=-63.6,44.6,-63.5,44.7&wheelchair=yes&limit=50"
```

## API Endpoints

### GET /api/accessibility/health
Check if the accessibility service is ready.

### GET /api/accessibility/stats
Get dataset statistics including:
- Total number of places
- Breakdown by accessibility status
- Breakdown by category
- Geographic bounds
- Last update timestamp

### GET /api/accessibility/places
Get places within a bounding box.

**Parameters:**
- `bbox` (required): Bounding box as `minLon,minLat,maxLon,maxLat`
- `wheelchair` (optional): Filter by accessibility (`yes`, `limited`, `no`, `unknown`)
- `category` (optional): Filter by category
- `limit` (optional): Maximum number of results (default: 500)

**Example:**
```
GET /api/accessibility/places?bbox=-63.6,44.6,-63.5,44.7&wheelchair=yes&limit=50
```

### GET /api/accessibility/nearby
Get places near a specific coordinate.

**Parameters:**
- `lat` (required): Latitude
- `lon` (required): Longitude
- `radius` (optional): Search radius in meters (default: 1000)
- `wheelchair` (optional): Filter by accessibility
- `limit` (optional): Maximum number of results (default: 20)

**Example:**
```
GET /api/accessibility/nearby?lat=44.6488&lon=-63.5752&wheelchair=yes&radius=500
```

### GET /api/accessibility/search
Search places by name or category.

**Parameters:**
- `q` (required): Search query
- `wheelchair` (optional): Filter by accessibility
- `limit` (optional): Maximum number of results (default: 50)

**Example:**
```
GET /api/accessibility/search?q=library&wheelchair=yes
```

### GET /api/accessibility/categories/:category
Get places by category.

**Parameters:**
- `category` (required): Category name (in URL path)
- `wheelchair` (optional): Filter by accessibility
- `limit` (optional): Maximum number of results (default: 100)

**Example:**
```
GET /api/accessibility/categories/restaurant?wheelchair=yes&limit=20
```

## Data Structure

### Place Object
```json
{
  "id": "place_12345",
  "name": "Halifax Central Library",
  "coordinates": [-63.5752, 44.6488],
  "category": "library",
  "wheelchair": "yes",
  "address": "5440 Spring Garden Road",
  "website": "https://www.halifaxpubliclibraries.ca/",
  "phone": "+1-902-490-5700"
}
```

### Wheelchair Accessibility Values
- `yes`: Fully wheelchair accessible
- `limited`: Partially accessible (may have some limitations)
- `no`: Not wheelchair accessible
- `unknown`: Accessibility status unknown

### Common Categories
- `restaurant`: Restaurants and cafes
- `shop`: Retail stores
- `tourism`: Tourist attractions and hotels
- `healthcare`: Medical facilities
- `education`: Schools and libraries
- `government`: Government buildings
- `transport`: Transportation hubs
- `parking`: Parking facilities

## File Structure

After running the download script, you'll find these files in `server/data/accessibility/`:

- `wheelmap-accessibility.geojson`: Raw GeoJSON data for spatial operations
- `wheelmap-optimized.json`: Optimized data structure for fast queries
- `indexes.json`: Pre-built indexes for categories and accessibility
- `wheelmap-backup-TIMESTAMP.json`: Timestamped backup files

## Performance

The local accessibility service provides:
- **Fast queries**: Optimized data structures with pre-built indexes
- **Spatial search**: Efficient bounding box and radius-based queries
- **Full-text search**: Name and category search with relevance scoring
- **Memory efficient**: Data loaded on-demand with intelligent caching

## Updating Data

To update the accessibility data:

```bash
npm run update:data
```

This will re-download the latest data from accessibility.cloud and update all local files.

## Integration with Trek.IQ

The accessibility data is automatically integrated into Trek.IQ's route analysis:

1. **Route Planning**: Shows accessible places along routes
2. **Destination Info**: Displays nearby accessible places at destinations
3. **Map Filters**: Allows filtering by accessibility status
4. **Search**: Enhanced search with accessibility information

## Troubleshooting

### Service Not Ready
If you get "service not ready" errors:
```bash
npm run download:accessibility
```

### API Timeouts
The download script includes retry logic and rate limiting. If downloads fail:
- Check internet connection
- Verify the accessibility.cloud API is accessible
- Try running the script again (it will resume from where it left off)

### Large Dataset
The 150k+ record dataset requires:
- ~50MB disk space
- ~100MB RAM when fully loaded
- Good internet connection for initial download

## Development

To modify the download script or add new features:

1. **Download Script**: `scripts/downloadAccessibilityData.js`
2. **Local Service**: `server/services/localAccessibilityService.js`
3. **API Routes**: `server/routes/accessibilityData.js`

The system is designed to be modular and extensible for additional data sources.





