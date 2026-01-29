/**
 * Database Status Component
 *
 * Shows which database is currently active and connection status.
 * Useful for debugging and verifying configuration.
 */

import { useEffect, useState } from 'react';
import { databaseProvider } from '@/lib/database';

export function DatabaseStatus() {
  const [status, setStatus] = useState<{
    provider: string;
    isConnected: boolean;
    adapterName: string;
  } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const adapter = databaseProvider.getAdapter();
      const config = databaseProvider.getConfig();
      const isConnected = await adapter.isConnected();

      setStatus({
        provider: config?.provider || 'unknown',
        isConnected,
        adapterName: adapter.name,
      });

      // Log to console
      console.log('📊 [Database Status]');
      console.log('   Provider:', config?.provider);
      console.log('   Adapter:', adapter.name);
      console.log('   Connected:', isConnected ? '✅' : '❌');
    };

    checkStatus();
  }, []);

  if (!status) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-sm max-w-xs z-50">
      <div className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        Database Status
      </div>

      <div className="space-y-1 text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Provider:</span>
          <span className="font-medium text-gray-900 dark:text-white">{status.provider}</span>
        </div>

        <div className="flex justify-between">
          <span>Adapter:</span>
          <span className="font-medium text-gray-900 dark:text-white">{status.adapterName}</span>
        </div>

        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-medium ${status.isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {status.isConnected ? 'Connected ✅' : 'Disconnected ❌'}
          </span>
        </div>
      </div>

      {status.provider === 'supabase' && status.isConnected && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-green-600 dark:text-green-400">
          ✨ Multi-user sync enabled
        </div>
      )}

      {!status.isConnected && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-red-600 dark:text-red-400">
          ⚠️ Check console for errors
        </div>
      )}
    </div>
  );
}
