import React, { useState } from 'react';

const SyncPanel = ({ syncConfig, updateSyncConfig, syncStatus, syncMessage, lastSynced, push, pull, testConnection }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [localUrl, setLocalUrl] = useState(syncConfig.serverUrl);
  const [localPassword, setLocalPassword] = useState(syncConfig.password);

  const statusColors = {
    disconnected: 'text-gray-500',
    connected: 'text-green-400',
    syncing: 'text-yellow-400',
    error: 'text-red-400',
  };

  const statusDot = {
    disconnected: 'bg-gray-500',
    connected: 'bg-green-400',
    syncing: 'bg-yellow-400 animate-pulse',
    error: 'bg-red-400',
  };

  const handleSave = () => {
    updateSyncConfig({ serverUrl: localUrl, password: localPassword });
  };

  const handleToggle = () => {
    if (!syncConfig.enabled) {
      // Save current URL/password before enabling
      updateSyncConfig({ serverUrl: localUrl, password: localPassword, enabled: true });
    } else {
      updateSyncConfig({ enabled: false });
    }
  };

  return (
    <>
      {/* Sync status indicator button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="px-3 py-2 font-mono text-xs border bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 flex items-center gap-2"
        title="Sync settings"
      >
        <span className={`inline-block w-2 h-2 rounded-full ${statusDot[syncStatus]}`} />
        SYNC
      </button>

      {/* Sync settings panel */}
      {showPanel && (
        <div className="fixed inset-x-2 top-16 md:absolute md:inset-x-auto md:right-4 md:top-16 z-50 w-auto md:w-80 bg-gray-800 border border-gray-600 shadow-lg font-mono text-sm">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="font-bold text-gray-200">SYNC_CONFIG</span>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-200">✕</button>
          </div>

          <div className="p-3 space-y-3">
            {/* Status */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status:</span>
              <span className={statusColors[syncStatus]}>
                {syncStatus.toUpperCase()}
              </span>
            </div>

            {syncMessage && (
              <div className={`text-xs px-2 py-1 border ${syncStatus === 'error' ? 'border-red-700 bg-red-900/30 text-red-400' : 'border-gray-700 bg-gray-900 text-gray-400'}`}>
                {syncMessage}
              </div>
            )}

            {lastSynced && (
              <div className="text-xs text-gray-500">
                Last synced: {lastSynced.toLocaleTimeString()}
              </div>
            )}

            {/* Server URL */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Server URL</label>
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="http://192.168.1.100:3001"
                className="w-full bg-gray-900 border border-gray-600 text-gray-200 px-2 py-1 text-xs font-mono focus:border-blue-500 focus:outline-none"
                disabled={syncConfig.enabled}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={localPassword}
                onChange={(e) => setLocalPassword(e.target.value)}
                placeholder="your-sync-password"
                className="w-full bg-gray-900 border border-gray-600 text-gray-200 px-2 py-1 text-xs font-mono focus:border-blue-500 focus:outline-none"
                disabled={syncConfig.enabled}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {!syncConfig.enabled && (
                <button
                  onClick={async () => {
                    handleSave();
                    await testConnection();
                  }}
                  className="flex-1 px-2 py-1 text-xs border bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                >
                  TEST
                </button>
              )}
              <button
                onClick={handleToggle}
                className={`flex-1 px-2 py-1 text-xs border font-bold ${
                  syncConfig.enabled
                    ? 'bg-red-700 border-red-600 text-white hover:bg-red-600'
                    : 'bg-green-700 border-green-600 text-white hover:bg-green-600'
                }`}
              >
                {syncConfig.enabled ? 'DISCONNECT' : 'CONNECT'}
              </button>
            </div>

            {/* Manual sync buttons when connected */}
            {syncConfig.enabled && (
              <div className="flex gap-2 pt-1 border-t border-gray-700">
                <button
                  onClick={pull}
                  className="flex-1 px-2 py-1 text-xs border bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                >
                  ↓ PULL
                </button>
                <button
                  onClick={push}
                  className="flex-1 px-2 py-1 text-xs border bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                >
                  ↑ PUSH
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SyncPanel;
