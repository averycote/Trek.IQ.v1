# Trek.IQ Data Migration Script for Windows
# This script converts large GeoJSON files to GeoPackage format and creates spatial indexes

param(
    [switch]$Force
)

Write-Host "🚀 Starting Trek.IQ Data Migration..." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "data")) {
    Write-Host "❌ Error: Please run this script from the server directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Expected: server/data/ directory should exist" -ForegroundColor Yellow
    exit 1
}

Set-Location data

# Check if GDAL/OGR is installed
try {
    $gdalVersion = ogr2ogr --version 2>&1 | Select-Object -First 1
    Write-Host "✅ GDAL/OGR found: $gdalVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: GDAL/OGR not found. Please install it first:" -ForegroundColor Red
    Write-Host "   Download from: https://gdal.org/download.html" -ForegroundColor Yellow
    Write-Host "   or use conda: conda install -c conda-forge gdal" -ForegroundColor Yellow
    Write-Host "   or use chocolatey: choco install gdal" -ForegroundColor Yellow
    exit 1
}

# Create backup directory
Write-Host "📁 Creating backup directory..." -ForegroundColor Cyan
$backupDir = "backup\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup existing files
Write-Host "💾 Backing up existing files..." -ForegroundColor Cyan
Copy-Item "*.geojson" $backupDir -ErrorAction SilentlyContinue
Copy-Item "*.gpkg" $backupDir -ErrorAction SilentlyContinue
Copy-Item "*.db" $backupDir -ErrorAction SilentlyContinue

Write-Host "✅ Backup created in: $backupDir" -ForegroundColor Green

# Step 1: Convert large files to GeoPackage
Write-Host ""
Write-Host "🔄 Step 1: Converting large files to GeoPackage..." -ForegroundColor Cyan

# Create core GeoPackage with large datasets
Write-Host "   Creating trek-iq-core.gpkg..." -ForegroundColor Yellow

$largeFiles = @(
    "CivicAddresses_-5590432719903009914.geojson",
    "Street_Lights_-8646609400635809433.geojson",
    "Active_Travelways.geojson",
    "Bus_Stops_2_9086297843420881686.geojson",
    "Transit_Bus_Snow_Routes_2846831489590635221.geojson",
    "Bike_Infrastructure_and_Suggested_Routes_-8768028288468156838.geojson"
)

$firstFile = $true
foreach ($file in $largeFiles) {
    if (Test-Path $file) {
        $displayName = $file -replace '\.geojson$', ''
        Write-Host "   - Adding $displayName..." -ForegroundColor White
        
        if ($firstFile) {
            ogr2ogr -f GPKG trek-iq-core.gpkg $file
            $firstFile = $false
        } else {
            ogr2ogr -f GPKG -append trek-iq-core.gpkg $file
        }
    } else {
        Write-Host "   ⚠️  $file not found, skipping..." -ForegroundColor Yellow
    }
}

# Create amenities GeoPackage
Write-Host ""
Write-Host "   Creating trek-iq-amenities.gpkg..." -ForegroundColor Yellow

$amenityFiles = @(
    "Accessible_Parking.geojson",
    "Accessible_Parking_Spots_-8108737058942968370.geojson",
    "Active_Travelways_-4200371894220343912.geojson",
    "HRM_Public_Washrooms_8937353538278970153.geojson"
)

$firstFile = $true
foreach ($file in $amenityFiles) {
    if (Test-Path $file) {
        $displayName = $file -replace '\.geojson$', ''
        Write-Host "   - Adding $displayName..." -ForegroundColor White
        
        if ($firstFile) {
            ogr2ogr -f GPKG trek-iq-amenities.gpkg $file
            $firstFile = $false
        } else {
            ogr2ogr -f GPKG -append trek-iq-amenities.gpkg $file
        }
    } else {
        Write-Host "   ⚠️  $file not found, skipping..." -ForegroundColor Yellow
    }
}

# Create transit GeoPackage
Write-Host ""
Write-Host "   Creating trek-iq-transit.gpkg..." -ForegroundColor Yellow

$transitFiles = @(
    "Transit_Bus_Routes.geojson",
    "Traffic_Control.geojson"
)

$firstFile = $true
foreach ($file in $transitFiles) {
    if (Test-Path $file) {
        $displayName = $file -replace '\.geojson$', ''
        Write-Host "   - Adding $displayName..." -ForegroundColor White
        
        if ($firstFile) {
            ogr2ogr -f GPKG trek-iq-transit.gpkg $file
            $firstFile = $false
        } else {
            ogr2ogr -f GPKG -append trek-iq-transit.gpkg $file
        }
    } else {
        Write-Host "   ⚠️  $file not found, skipping..." -ForegroundColor Yellow
    }
}

# Step 2: Create spatial database
Write-Host ""
Write-Host "🔄 Step 2: Creating spatial database..." -ForegroundColor Cyan

# Check if sqlite3 is available
try {
    $sqliteVersion = sqlite3 --version 2>&1
    Write-Host "✅ SQLite3 found: $sqliteVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: sqlite3 not found. Please install it first." -ForegroundColor Red
    Write-Host "   Download from: https://www.sqlite.org/download.html" -ForegroundColor Yellow
    exit 1
}

# Create spatial database with indexes
$sqlScript = @"
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
"@

$sqlScript | sqlite3 trek-iq-spatial.db

Write-Host "✅ Spatial database created: trek-iq-spatial.db" -ForegroundColor Green

# Step 3: Create directory structure
Write-Host ""
Write-Host "🔄 Step 3: Creating directory structure..." -ForegroundColor Cyan

New-Item -ItemType Directory -Path "dynamic" -Force | Out-Null
New-Item -ItemType Directory -Path "static" -Force | Out-Null

# Move frequently updated files to dynamic directory
Write-Host "   Moving dynamic files..." -ForegroundColor Yellow
$dynamicFiles = @(
    "Steps_577353981712784942.geojson",
    "Sidewalk Closures.geojson",
    "Street_Closures.geojson",
    "Transit_Shelters_1139561051208148127.geojson"
)

foreach ($file in $dynamicFiles) {
    if (Test-Path $file) {
        Move-Item $file "dynamic\" -ErrorAction SilentlyContinue
        Write-Host "   - Moved $file to dynamic/" -ForegroundColor White
    } else {
        Write-Host "   ⚠️  $file not found" -ForegroundColor Yellow
    }
}

# Move static files to static directory
Write-Host "   Moving static files..." -ForegroundColor Yellow
$staticFiles = @(
    "Street_Junctions.geojson"
)

foreach ($file in $staticFiles) {
    if (Test-Path $file) {
        Move-Item $file "static\" -ErrorAction SilentlyContinue
        Write-Host "   - Moved $file to static/" -ForegroundColor White
    } else {
        Write-Host "   ⚠️  $file not found" -ForegroundColor Yellow
    }
}

# Step 4: Generate migration report
Write-Host ""
Write-Host "🔄 Step 4: Generating migration report..." -ForegroundColor Cyan

$report = @"
📊 Migration Report
==================
Generated: $(Get-Date)

Original GeoJSON files:
----------------------
"@

# Add original file sizes
if (Test-Path $backupDir) {
    $geojsonFiles = Get-ChildItem "$backupDir\*.geojson" -ErrorAction SilentlyContinue
    foreach ($file in $geojsonFiles) {
        $size = [math]::Round($file.Length / 1MB, 2)
        $report += "`n  $($file.Name): ${size}MB"
    }
}

$report += @"

New GeoPackage files:
-------------------
"@

# Add new file sizes
$gpkgFiles = Get-ChildItem "*.gpkg" -ErrorAction SilentlyContinue
foreach ($file in $gpkgFiles) {
    $size = [math]::Round($file.Length / 1MB, 2)
    $report += "`n  $($file.Name): ${size}MB"
}

$report += @"

Database files:
--------------
"@

# Add database file sizes
$dbFiles = Get-ChildItem "*.db" -ErrorAction SilentlyContinue
foreach ($file in $dbFiles) {
    $size = [math]::Round($file.Length / 1KB, 2)
    $report += "`n  $($file.Name): ${size}KB"
}

$report += @"

Directory structure:
-------------------
  dynamic/: Frequently updated data
  static/: Rarely changed data
  backup/: Original files backup
"@

$report | Out-File -FilePath "migration_report.txt" -Encoding UTF8
Write-Host $report -ForegroundColor White

Write-Host ""
Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 New file structure:" -ForegroundColor Cyan
Write-Host "   trek-iq-core.gpkg          # Large datasets" -ForegroundColor White
Write-Host "   trek-iq-amenities.gpkg     # Amenity datasets" -ForegroundColor White
Write-Host "   trek-iq-transit.gpkg       # Transit datasets" -ForegroundColor White
Write-Host "   trek-iq-spatial.db         # Spatial database" -ForegroundColor White
Write-Host "   dynamic/                   # Frequently updated data" -ForegroundColor White
Write-Host "   static/                    # Rarely changed data" -ForegroundColor White
Write-Host "   backup/                    # Original files backup" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Update your routing service to use the new GeoPackage files" -ForegroundColor White
Write-Host "   2. Test the spatial database queries" -ForegroundColor White
Write-Host "   3. Update client-side data loading" -ForegroundColor White
Write-Host "   4. Remove old GeoJSON files after testing" -ForegroundColor White
Write-Host ""
Write-Host "📄 Full report saved to: migration_report.txt" -ForegroundColor Green
