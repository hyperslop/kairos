// useSync.js — Sync hook for Task Manager
//
// Handles bidirectional sync with the local sync server.
// Strategy: per-task merge using lastModified timestamps + tombstones.
//
// How it works:
//   1. On connect, merges local and server data (neither side loses tasks)
//   2. When local data changes, pushes to server
//   3. Polls server periodically for changes from other devices
//
// Sync config is stored in localStorage so it persists across sessions.

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'taskManagerSyncConfig';
const POLL_INTERVAL = 10000; // 10 seconds

function loadSyncConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    enabled: false,
    serverUrl: 'http://192.168.1.100:3001',
    password: '',
  };
}

function saveSyncConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useSync({ tasks, projects, settings, deletedTaskIds, onMerge }) {
  const [syncConfig, setSyncConfig] = useState(loadSyncConfig);
  const [syncStatus, setSyncStatus] = useState('disconnected'); // disconnected | connected | syncing | error
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSynced, setLastSynced] = useState(null);

  // Track the server's last updatedAt so we know when to pull
  const serverTimestamp = useRef(null);
  // Track our own last push time so we don't re-pull what we just pushed
  const lastPushTime = useRef(null);
  // Prevent push loops during pull
  const isPulling = useRef(false);
  // Track if this is the first sync after enabling
  const isInitialSync = useRef(true);

  // Persist config changes
  const updateSyncConfig = useCallback((updates) => {
    setSyncConfig(prev => {
      const next = { ...prev, ...updates };
      saveSyncConfig(next);
      return next;
    });
  }, []);

  // ─── API helpers ────────────────────────────────────────────

  const apiCall = useCallback(async (method, endpoint, body = null) => {
    const url = syncConfig.serverUrl.replace(/\/+$/, '') + endpoint;
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${syncConfig.password}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [syncConfig.serverUrl, syncConfig.password]);

  // ─── Push local data to server ──────────────────────────────

  const push = useCallback(async (dataOverride) => {
    if (!syncConfig.enabled || isPulling.current) return;
    try {
      setSyncStatus('syncing');
      const payload = dataOverride || {
        tasks,
        projects,
        settings,
        deletedTaskIds: deletedTaskIds || [],
      };
      const result = await apiCall('PUT', '/api/data', payload);
      serverTimestamp.current = result.updatedAt;
      lastPushTime.current = result.updatedAt;
      setSyncStatus('connected');
      setLastSynced(new Date());
      setSyncMessage('Pushed');
    } catch (err) {
      console.error('Sync push failed:', err);
      setSyncStatus('error');
      setSyncMessage(err.message);
    }
  }, [syncConfig.enabled, tasks, projects, settings, deletedTaskIds, apiCall]);

  // ─── Pull remote data and merge ─────────────────────────────

  const pull = useCallback(async () => {
    if (!syncConfig.enabled) return;
    try {
      // First, cheap timestamp check
      const { updatedAt } = await apiCall('GET', '/api/data/updated-at');

      // Skip if we already have this version (or we just pushed it)
      if (updatedAt === serverTimestamp.current) {
        return false;
      }
      if (updatedAt === lastPushTime.current) {
        serverTimestamp.current = updatedAt;
        return false;
      }

      // Server has newer data — merge
      setSyncStatus('syncing');
      const data = await apiCall('GET', '/api/data');

      isPulling.current = true;
      serverTimestamp.current = data.updatedAt;
      const mergedData = onMerge(data);
      setSyncStatus('connected');
      setLastSynced(new Date());
      setSyncMessage('Merged');

      // Push merged result back to server after a delay to avoid push-loops
      setTimeout(() => {
        isPulling.current = false;
        if (mergedData) push(mergedData);
      }, 600);
      return true;
    } catch (err) {
      console.error('Sync pull failed:', err);
      setSyncStatus('error');
      setSyncMessage(err.message);
      return false;
    }
  }, [syncConfig.enabled, apiCall, onMerge, push]);

  // ─── Test connection ────────────────────────────────────────

  const testConnection = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      setSyncMessage('Testing...');
      await apiCall('GET', '/api/auth-check');
      setSyncStatus('connected');
      setSyncMessage('Connection successful!');
      return true;
    } catch (err) {
      setSyncStatus('error');
      setSyncMessage(err.message);
      return false;
    }
  }, [apiCall]);

  // ─── Initial sync on enable ─────────────────────────────────

  useEffect(() => {
    if (syncConfig.enabled && isInitialSync.current) {
      isInitialSync.current = false;
      // On first connect, always merge with server
      pull().then(pulled => {
        // If server had no newer data (or was empty), push our current data
        if (!pulled) push();
      });
    }
    if (!syncConfig.enabled) {
      isInitialSync.current = true;
      setSyncStatus('disconnected');
      setSyncMessage('');
    }
  }, [syncConfig.enabled, pull, push]);

  // ─── Push on local data changes ─────────────────────────────

  const prevData = useRef(null);
  useEffect(() => {
    if (!syncConfig.enabled || isPulling.current) return;

    const dataKey = JSON.stringify({ tasks, projects, settings, deletedTaskIds });
    if (prevData.current && prevData.current !== dataKey) {
      // Debounce pushes — wait 1 second after last change
      const timer = setTimeout(push, 1000);
      prevData.current = dataKey;
      return () => clearTimeout(timer);
    }
    prevData.current = dataKey;
  }, [syncConfig.enabled, tasks, projects, settings, deletedTaskIds, push]);

  // ─── Poll for remote changes ────────────────────────────────

  useEffect(() => {
    if (!syncConfig.enabled) return;
    const interval = setInterval(pull, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [syncConfig.enabled, pull]);

  return {
    syncConfig,
    updateSyncConfig,
    syncStatus,
    syncMessage,
    lastSynced,
    push,
    pull,
    testConnection,
  };
}
