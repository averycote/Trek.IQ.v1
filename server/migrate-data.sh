#!/bin/bash

# Trek.IQ Data Migration Script
# This script converts large GeoJSON files to GeoPackage format and creates spatial indexes

set -e  # Exit on any error

echo "🚀 Starting Trek.IQ Data Migration..."
echo "======================================"

# Check if we're in the right directory
if [ ! -d "data" ]; then
    echo "❌ Error: Please run this script from the server directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: server/data/ directory should exist"
    exit 1
fi

cd data

# Check if GDAL/OGR is installed
if ! command -v ogr2ogr &> /dev/null; then
    echo "❌ Error: GDAL/OGR not found. Please install it first:"
    echo "   conda install -c conda-forge gdal"
    echo "   or"
    echo "   brew install gdal (on macOS)"
    echo "   or"
    echo "   apt-get install gdal-bin (on Ubuntu)"
    exit 1
fi

echo "✅ GDAL/OGR found: $(ogr2ogr --version | head -n1)"

# Create backup directory
echo "📁 Creating backup directory..."
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"

# Backup existing files
echo "💾 Backing up existing files..."
cp *.geojson "$BACKUP_DIR/" 2>/dev/null || true
cp *.gpkg "$BACKUP_DIR/" 2>/dev/null || true
cp *.db "$BACKUP_DIR/" 2>/dev/null || true

echo "✅ Backup created in: $BACKUP_DIR"

# Step 1: Convert large files to GeoPackage
echo ""
echo "🔄 Step 1: Converting large files to GeoPackage..."

# Create core GeoPackage with large datasets
echo "   Creating trek-iq-core.gpkg..."

if [ -f "CivicAddresses_-5590432719903009914.geojson" ]; then
    echo "   - Adding CivicAddresses..."
    ogr2ogr -f GPKG trek-iq-core.gpkg CivicAddresses_-5590432719903009914.geojson
else
    echo "   ⚠️  CivicAddresses file not found, skipping..."
fi

if [ -f "Street_Lights_-8646609400635809433.geojson" ]; then
    echo "   - Adding Street_Lights..."
    ogr2ogr -f GPKG -append trek-iq-core.gpkg Street_Lights_-8646609400635809433.geojson
else
    echo "   ⚠️  Street_Lights file not found, skipping..."
fi

if [ -f "Active_Travelways.geojson" ]; then
    echo "   - Adding Active_Travelways..."
    ogr2ogr -f GPKG -append trek-iq-core.gpkg Active_Travelways.geojson
else
    echo "   ⚠️  Active_Travelways file not found, skipping..."
fi

if [ -f "Bus_Stops_2_9086297843420881686.geojson" ]; then
    echo "   - Adding Bus_Stops..."
    ogr2ogr -f GPKG -append trek-iq-core.gpkg Bus_Stops_2_9086297843420881686.geojson
else
    echo "   ⚠️  Bus_Stops file not found, skipping..."
fi

if [ -f "Transit_Bus_Snow_Routes_2846831489590635221.geojson" ]; then
    echo "   - Adding Transit_Bus_Snow_Routes..."
    ogr2ogr -f GPKG -append trek-iq-core.gpkg Transit_Bus_Snow_Routes_2846831489590635221.geojson
else
    echo "   ⚠️  Transit_Bus_Snow_Routes file not found, skipping..."
fi

if [ -f "Bike_Infrastructure_and_Suggested_Routes_-8768028288468156838.geojson" ]; then
    echo "   - Adding Bike_Infrastructure..."
    ogr2ogr -f GPKG -append trek-iq-core.gpkg Bike_Infrastructure_and_Suggested_Routes_-8768028288468156838.geojson
else
    echo "   ⚠️  Bike_Infrastructure file not found, skipping..."
fi

# Create amenities GeoPackage
echo ""
echo "   Creating trek-iq-amenities.gpkg..."

if [ -f "Accessible_Parking.geojson" ]; then
    echo "   - Adding Accessible_Parking..."
    ogr2ogr -f GPKG trek-iq-amenities.gpkg Accessible_Parking.geojson
else
    echo "   ⚠️  Accessible_Parking file not found, skipping..."
fi

if [ -f "Accessible_Parking_Spots_-8108737058942968370.geojson" ]; then
    echo "   - Adding Accessible_Parking_Spots..."
    ogr2ogr -f GPKG -append trek-iq-amenities.gpkg Accessible_Parking_Spots_-8108737058942968370.geojson
else
    echo "   ⚠️  Accessible_Parking_Spots file not found, skipping..."
fi

if [ -f "Active_Travelways_-4200371894220343912.geojson" ]; then
    echo "   - Adding Active_Travelways_small..."
    ogr2ogr -f GPKG -append trek-iq-amenities.gpkg Active_Travelways_-4200371894220343912.geojson
else
    echo "   ⚠️  Active_Travelways_small file not found, skipping..."
fi

if [ -f "HRM_Public_Washrooms_8937353538278970153.geojson" ]; then
    echo "   - Adding HRM_Public_Washrooms..."
    ogr2ogr -f GPKG -append trek-iq-amenities.gpkg HRM_Public_Washrooms_8937353538278970153.geojson
else
    echo "   ⚠️  HRM_Public_Washrooms file not found, skipping..."
fi

# Create transit GeoPackage
echo ""
echo "   Creating trek-iq-transit.gpkg..."

if [ -f "Transit_Bus_Routes.geojson" ]; then
    echo "   - Adding Transit_Bus_Routes..."
    ogr2ogr -f GPKG trek-iq-transit.gpkg Transit_Bus_Routes.geojson
else
    echo "   ⚠️  Transit_Bus_Routes file not found, skipping..."
fi

if [ -f "Traffic_Control.geojson" ]; then
    echo "   - Adding Traffic_Control..."
    ogr2ogr -f GPKG -append trek-iq-transit.gpkg Traffic_Control.geojson
else
    echo "   ⚠️  Traffic_Control file not found, skipping..."
fi

# Step 2: Create spatial database
echo ""
echo "🔄 Step 2: Creating spatial database..."

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ Error: sqlite3 not found. Please install it first."
    exit 1
fi

echo "✅ SQLite3 found: $(sqlite3 --version)"

# Create spatial database with indexes
cat > create_spatial_db.sql << 'EOF'
-- Create spatial tables for fast proximity searches
CREATE VIRTUAL TABLE IF NOT EXISTS civic_addresses USING rtree(
  id, min_lat, max_lat, min_lng, max_lng
);

CREATE VIRTUAL TABLE IF NOT EXISTS street_lights USING rtree(
  id, min_lat, max_lat, min_lng, max_lng
);

CREATE VIRTUAL TABLE IF NOT EXISTS active_travelways USING rtree(
  id, min_lat, max_lat, min_lng, max_lng
);

CREATE VIRTUAL TABLE IF NOT EXISTS bus_stops USING rtree(
  id, min_lat, max_lat, min_lng, max_lng
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_civic_addresses_street ON civic_addresses(street_name);
CREATE INDEX IF NOT EXISTS idx_street_lights_status ON street_lights(status);
CREATE INDEX IF NOT EXISTS idx_active_travelways_type ON active_travelways(type);
CREATE INDEX IF NOT EXISTS idx_bus_stops_route ON bus_stops(route_number);

-- Create metadata table
CREATE TABLE IF NOT EXISTS dataset_metadata (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_date TEXT NOT NULL,
  feature_count INTEGER,
  file_size INTEGER,
  description TEXT
);

-- Insert metadata
INSERT OR REPLACE INTO dataset_metadata (name, type, created_date, description) VALUES
('trek-iq-core', 'geopackage', datetime('now'), 'Core datasets including addresses, street lights, and travelways'),
('trek-iq-amenities', 'geopackage', datetime('now'), 'Amenity datasets including parking and washrooms'),
('trek-iq-transit', 'geopackage', datetime('now'), 'Transit-related datasets including bus routes and traffic control');
EOF

sqlite3 trek-iq-spatial.db < create_spatial_db.sql
rm create_spatial_db.sql

echo "✅ Spatial database created: trek-iq-spatial.db"

# Step 3: Create directory structure
echo ""
echo "🔄 Step 3: Creating directory structure..."

mkdir -p dynamic static

# Move frequently updated files to dynamic directory
echo "   Moving dynamic files..."
mv Steps_577353981712784942.geojson dynamic/ 2>/dev/null || echo "   ⚠️  Steps file not found"
mv "Sidewalk Closures.geojson" dynamic/ 2>/dev/null || echo "   ⚠️  Sidewalk Closures file not found"
mv Street_Closures.geojson dynamic/ 2>/dev/null || echo "   ⚠️  Street Closures file not found"
mv Transit_Shelters_1139561051208148127.geojson dynamic/ 2>/dev/null || echo "   ⚠️  Transit Shelters file not found"

# Move static files to static directory
echo "   Moving static files..."
mv Street_Junctions.geojson static/ 2>/dev/null || echo "   ⚠️  Street Junctions file not found"

# Step 4: Generate migration report
echo ""
echo "🔄 Step 4: Generating migration report..."

# Calculate file sizes
echo "📊 Migration Report" > migration_report.txt
echo "==================" >> migration_report.txt
echo "Generated: $(date)" >> migration_report.txt
echo "" >> migration_report.txt

echo "Original GeoJSON files:" >> migration_report.txt
echo "----------------------" >> migration_report.txt
if [ -d "$BACKUP_DIR" ]; then
    for file in "$BACKUP_DIR"/*.geojson; do
        if [ -f "$file" ]; then
            size=$(du -h "$file" | cut -f1)
            name=$(basename "$file")
            echo "  $name: $size" >> migration_report.txt
        fi
    done
fi

echo "" >> migration_report.txt
echo "New GeoPackage files:" >> migration_report.txt
echo "-------------------" >> migration_report.txt
for file in *.gpkg; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "  $file: $size" >> migration_report.txt
    fi
done

echo "" >> migration_report.txt
echo "Database files:" >> migration_report.txt
echo "--------------" >> migration_report.txt
for file in *.db; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "  $file: $size" >> migration_report.txt
    fi
done

echo "" >> migration_report.txt
echo "Directory structure:" >> migration_report.txt
echo "-------------------" >> migration_report.txt
echo "  dynamic/: Frequently updated data" >> migration_report.txt
echo "  static/: Rarely changed data" >> migration_report.txt
echo "  backup/: Original files backup" >> migration_report.txt

cat migration_report.txt

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📁 New file structure:"
echo "   trek-iq-core.gpkg          # Large datasets"
echo "   trek-iq-amenities.gpkg     # Amenity datasets"
echo "   trek-iq-transit.gpkg       # Transit datasets"
echo "   trek-iq-spatial.db         # Spatial database"
echo "   dynamic/                   # Frequently updated data"
echo "   static/                    # Rarely changed data"
echo "   backup/                    # Original files backup"
echo ""
echo "📋 Next steps:"
echo "   1. Update your routing service to use the new GeoPackage files"
echo "   2. Test the spatial database queries"
echo "   3. Update client-side data loading"
echo "   4. Remove old GeoJSON files after testing"
echo ""
echo "📄 Full report saved to: migration_report.txt"
