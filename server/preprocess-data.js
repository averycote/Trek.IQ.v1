#!/usr/bin/env node

// Data Preprocessing Script for Trek.IQ
// Optimizes large GeoJSON files and creates spatial indexes

const DataPreprocessor = require('./utils/dataPreprocessor');

async function main() {
  console.log('🚀 Starting Trek.IQ Data Preprocessing...\n');
  
  try {
    const preprocessor = new DataPreprocessor();
    
    // Initialize the preprocessor
    await preprocessor.initialize();
    
    // Process all datasets
    await preprocessor.processAllDatasets();
    
    // Generate optimization report
    const report = await preprocessor.generateOptimizationReport();
    
    console.log('\n✅ Data preprocessing completed successfully!');
    console.log('\n📊 Optimization Summary:');
    console.log(`   Original Size: ${(report.summary.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Optimized Size: ${(report.summary.totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Compression: ${report.summary.compressionRatio.toFixed(1)}%`);
    console.log(`   Datasets Processed: ${report.datasets.length}`);
    
    console.log('\n📁 Optimized files saved to: server/data/optimized/');
    console.log('\n🔧 Next steps:');
    console.log('   1. Update routing services to use optimized data');
    console.log('   2. Test performance improvements');
    console.log('   3. Deploy optimized datasets to production');
    
  } catch (error) {
    console.error('\n❌ Data preprocessing failed:', error);
    process.exit(1);
  }
}

// Run the preprocessing
if (require.main === module) {
  main();
}

module.exports = main;
