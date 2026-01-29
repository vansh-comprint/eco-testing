// Mock data disabled - using real-time database data only
let bootstrapped = false;

const MIGRATION_VERSION = '1.0.0'; // Increment this to force clear localStorage

export function bootstrapMockData() {
  if (bootstrapped) return;

  console.log('🔄 Mock data disabled - Using real-time database data only');

  // One-time migration: Clear old mock data from localStorage
  const currentVersion = localStorage.getItem('ecotribe-migration-version');
  if (currentVersion !== MIGRATION_VERSION) {
    console.log('🔄 Migrating to database-only mode - clearing old localStorage data...');

    // Clear all Ecotribe-related localStorage keys
    const keysToRemove = [
      'ecotribe-asset-store',
      'ecotribe-batch-store',
      'ecotribe-submission-store',
      'ecotribe-review-store',
      'ecotribe-pickup-store',
      'ecotribe-logistics-store',
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  ✅ Cleared ${key}`);
    });

    localStorage.setItem('ecotribe-migration-version', MIGRATION_VERSION);
    console.log('✅ Migration complete - all data will now come from database');
  }

  bootstrapped = true;
}
