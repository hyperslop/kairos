import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import DashboardView from './DashboardView';
import UndatedView from './UndatedView';
import TaskCreationView from './TaskCreationView';
import SyncPanel from './SyncPanel';
import { DeleteProjectModal, DeleteRecurringModal } from './Modals';
import {
  requestNotificationPermission,
  scheduleNotification,
  cancelNotification,
  rescheduleAllNotifications
} from '../utils/notificationService';
import { useSync } from '../hooks/useSync';

const TaskManager = () => {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('taskManagerTasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('taskManagerProjects');
    return saved ? JSON.parse(saved) : ['Personal', 'Work', 'Health'];
  });
  const [selectedView, setSelectedView] = useState('dashboard');
  const [previousView, setPreviousView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [taskCreationMonth, setTaskCreationMonth] = useState(new Date());
  const [editingTask, setEditingTask] = useState(null);
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(null);
  const [deleteRecurringModal, setDeleteRecurringModal] = useState(null);
  const [sessionCreatedIds, setSessionCreatedIds] = useState([]);
  const [taskSubView, setTaskSubView] = useState('single');
  const [editingRecentTaskId, setEditingRecentTaskId] = useState(null);
  const [overclock, setOverclock] = useState(() => {
    const saved = localStorage.getItem('taskManagerOverclock');
    return saved === 'true';
  });
  const [overclockLocked, setOverclockLocked] = useState(() => {
    const saved = localStorage.getItem('taskManagerOverclockLocked');
    return saved === 'true';
  });
  const [clockMode, setClockMode] = useState('hour');

  const [batchRows, setBatchRows] = useState([{ id: Date.now(), name: '', description: '', date: '', time: '', project: 'Personal' }]);

  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    project: 'Personal',
    date: '',
    endDate: '',
    time: '',
    hour: 12,
    baseMinute: null,
    minuteOffset: 0,
    ampm: null,
    completed: false,
    predecessors: [],
    successors: [],
    carryOver: false,
    urgent: false,
    recurring: false,
    isRecurringRoot: false,
    recurringRootId: null,
    recurrencePattern: null,
    dateWasManuallySet: false
  });

  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');

  const [newProject, setNewProject] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);

  useEffect(() => {
    localStorage.setItem('taskManagerTasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('taskManagerProjects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (overclockLocked) {
      localStorage.setItem('taskManagerOverclock', String(overclock));
    }
  }, [overclock, overclockLocked]);

  useEffect(() => {
    localStorage.setItem('taskManagerOverclockLocked', String(overclockLocked));
  }, [overclockLocked]);

  // ========== NOTIFICATION SCHEDULING ==========
  useEffect(() => {
    requestNotificationPermission().then(granted => {
      if (granted) {
        rescheduleAllNotifications(tasks);
      }
    });
  }, []); // Run once on mount

  // Re-schedule whenever tasks change
  useEffect(() => {
    rescheduleAllNotifications(tasks);
  }, [tasks]);

  // ========== EXPORT / IMPORT ==========
  const exportTasksJSON = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      projects,
      settings: { overclock, overclockLocked }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTasksJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (data.tasks && Array.isArray(data.tasks)) {
            // Ensure all tasks have predecessors/successors arrays
            const sanitized = data.tasks.map(t => ({
              ...t,
              predecessors: t.predecessors || [],
              successors: t.successors || [],
              completedDates: t.completedDates || [],
              excludedDates: t.excludedDates || []
            }));
            setTasks(sanitized);
          }
          if (data.projects && Array.isArray(data.projects)) {
            setProjects(data.projects);
          }
          if (data.settings) {
            if (typeof data.settings.overclock === 'boolean') setOverclock(data.settings.overclock);
            if (typeof data.settings.overclockLocked === 'boolean') setOverclockLocked(data.settings.overclockLocked);
          }
          setImportExportMsg('Import successful!');
          setTimeout(() => setImportExportMsg(''), 3000);
        } catch (err) {
          setImportExportMsg('Import failed: invalid JSON');
          setTimeout(() => setImportExportMsg(''), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const [importExportMsg, setImportExportMsg] = useState('');

  // ========== SYNC ==========
  const handleSyncPull = useCallback((data) => {
    if (data.tasks && Array.isArray(data.tasks)) {
      const sanitized = data.tasks.map(t => ({
        ...t,
        predecessors: t.predecessors || [],
        successors: t.successors || [],
        completedDates: t.completedDates || [],
        excludedDates: t.excludedDates || []
      }));
      setTasks(sanitized);
    }
    if (data.projects && Array.isArray(data.projects)) {
      setProjects(data.projects);
    }
    if (data.settings) {
      if (typeof data.settings.overclock === 'boolean') setOverclock(data.settings.overclock);
      if (typeof data.settings.overclockLocked === 'boolean') setOverclockLocked(data.settings.overclockLocked);
    }
  }, []);

  const {
    syncConfig, updateSyncConfig, syncStatus, syncMessage,
    lastSynced, push: syncPush, pull: syncPull, testConnection
  } = useSync({
    tasks,
    projects,
    settings: { overclock, overclockLocked },
    onPull: handleSyncPull,
  });

  // Auto-calculate recurrence count from date range
  useEffect(() => {
    if (!newTask.recurring || !newTask.recurrencePattern || !newTask.date) return;
    if (!newTask.endDate) {
      // No end date = infinite
      if (newTask.recurrencePattern.count !== 'infinite') {
        setNewTask(prev => ({
          ...prev,
          recurrencePattern: { ...prev.recurrencePattern, count: 'infinite' }
        }));
      }
      return;
    }
    // Count matching dates between start and end
    const start = new Date(newTask.date + 'T00:00:00');
    const end = new Date(newTask.endDate + 'T00:00:00');
    let count = 0;
    let current = new Date(start);
    while (current <= end && count < 10000) {
      if (shouldIncludeDate(start, current, newTask.recurrencePattern)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    const target = count || 1;
    if (newTask.recurrencePattern.count !== target) {
      setNewTask(prev => ({
        ...prev,
        recurrencePattern: { ...prev.recurrencePattern, count: target }
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTask.recurring, newTask.date, newTask.endDate,
      newTask.recurrencePattern?.frequency,
      newTask.recurrencePattern?.interval,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(newTask.recurrencePattern?.daysOfWeek)]);

  const generateCalendarDates = (month) => {
    const dates = [];
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startingDayOfWeek; i++) dates.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) dates.push(new Date(year, monthIndex, day));
    return dates;
  };

  const calendarDates = generateCalendarDates(currentMonth);
  const taskCreationDates = generateCalendarDates(taskCreationMonth);

  // Compute recurring dates for calendar highlights, respecting endDate
  const getRecurringDatesForMonth = (monthDate) => {
    if (!newTask.recurring || !newTask.recurrencePattern || !newTask.date) return new Set();
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const taskStartDate = new Date(newTask.date + 'T00:00:00');
    // If endDate exists, limit recurring to that range
    const effectiveEnd = newTask.endDate
      ? new Date(Math.min(new Date(newTask.endDate + 'T00:00:00').getTime(), monthEnd.getTime()))
      : monthEnd;
    const dates = new Set();
    // Walk day by day through the month
    let currentDate = new Date(Math.max(taskStartDate.getTime(), monthStart.getTime()));
    let safety = 0;
    while (currentDate <= effectiveEnd && safety < 400) {
      if (shouldIncludeDate(taskStartDate, currentDate, newTask.recurrencePattern) && currentDate >= taskStartDate) {
        dates.add(getLocalDateString(currentDate));
      }
      currentDate = getNextDate(currentDate);
      safety++;
    }
    return dates;
  };

  // Get the last recurring date within the endDate range (for urgent highlighting)
  const getLastRecurringDate = () => {
    if (!newTask.recurring || !newTask.recurrencePattern || !newTask.date || !newTask.endDate) return null;
    const taskStartDate = new Date(newTask.date + 'T00:00:00');
    const endD = new Date(newTask.endDate + 'T00:00:00');
    const pattern = newTask.recurrencePattern;
    let currentDate = new Date(taskStartDate);
    let lastDate = null;
    // Walk day by day up to endDate (bounded at 10000 to avoid infinite)
    let safety = 0;
    while (currentDate <= endD && safety < 10000) {
      if (shouldIncludeDate(taskStartDate, currentDate, pattern) && currentDate >= taskStartDate) {
        lastDate = getLocalDateString(currentDate);
      }
      currentDate = getNextDate(currentDate);
      safety++;
    }
    return lastDate;
  };

  const resetDate = () => {
    setNewTask(prev => ({ ...prev, date: '', endDate: '', dateWasManuallySet: false }));
    setDateInput('');
  };

  const resetTime = () => {
    setNewTask(prev => ({ ...prev, hour: overclock ? 24 : 12, baseMinute: null, minuteOffset: 0, ampm: null }));
    setTimeInput('');
    setClockMode('hour');
  };

  const generateRecurringInstances = (rootTask, viewStart, viewEnd) => {
    if (!rootTask.isRecurringRoot || !rootTask.recurrencePattern || !rootTask.date) return [];
    
    const instances = [];
    const pattern = rootTask.recurrencePattern;
    const taskStartDate = new Date(rootTask.date + 'T00:00:00');
    const taskEndDate = rootTask.endDate ? new Date(rootTask.endDate + 'T00:00:00') : null;
    const maxOccurrences = pattern.count === 'infinite' ? Infinity : pattern.count;
    const completedDates = rootTask.completedDates || [];
    const excludedDates = rootTask.excludedDates || [];
    
    // Effective end: earliest of task end date and view end
    const effectiveEnd = taskEndDate && taskEndDate < viewEnd ? taskEndDate : viewEnd;
    
    // First, find ALL matching dates up to effectiveEnd to determine which is the last
    const allMatchingDates = [];
    let scanDate = new Date(taskStartDate);
    let scanCount = 0;
    const scanEnd = taskEndDate || new Date(viewEnd.getFullYear() + 1, 0, 1);
    while (scanDate <= scanEnd && scanCount < maxOccurrences) {
      if (shouldIncludeDate(taskStartDate, scanDate, pattern) && scanDate >= taskStartDate) {
        allMatchingDates.push(getLocalDateString(scanDate));
        scanCount++;
      }
      scanDate = getNextDate(scanDate);
    }
    const lastMatchingDate = taskEndDate && allMatchingDates.length > 0
      ? allMatchingDates[allMatchingDates.length - 1]
      : null;
    
    // Now generate instances within the view window
    let currentDate = new Date(taskStartDate);
    let occurrenceCount = 0;
    
    while (currentDate <= effectiveEnd && occurrenceCount < maxOccurrences) {
      if (shouldIncludeDate(taskStartDate, currentDate, pattern) && currentDate >= taskStartDate) {
        occurrenceCount++;
        const instanceDate = getLocalDateString(currentDate);
        if (currentDate >= viewStart) {
          const isExcluded = excludedDates.includes(instanceDate);
          if (!isExcluded) {
            const isCompleted = completedDates.includes(instanceDate);
            const isLastInstance = rootTask.urgent && lastMatchingDate && instanceDate === lastMatchingDate;
            
            instances.push({
              ...rootTask,
              id: `${rootTask.id}-${instanceDate}`,
              date: instanceDate,
              isRecurringRoot: false,
              recurringRootId: rootTask.id,
              instanceDate: instanceDate,
              completed: isCompleted,
              // For pure recurring + urgent: only last instance is urgent
              // For carry-over + recurring + urgent: only last instance is urgent
              urgent: isLastInstance,
              _isRecurringInstance: true
            });
          }
        }
      }
      currentDate = getNextDate(currentDate);
    }
    return instances;
  };

  const shouldIncludeDate = (startDate, checkDate, pattern) => {
    const diffTime = checkDate - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    switch (pattern.frequency) {
      case 'daily':
        return diffDays >= 0 && diffDays % pattern.interval === 0;
      case 'weekly':
        if (diffDays < 0) return false;
        const dayOfWeek = checkDate.getDay();
        const weeksSinceStart = Math.floor(diffDays / 7);
        return weeksSinceStart % pattern.interval === 0 && pattern.daysOfWeek.includes(dayOfWeek);
      case 'monthly':
        if (diffDays < 0) return false;
        const monthsDiff = (checkDate.getFullYear() - startDate.getFullYear()) * 12 + (checkDate.getMonth() - startDate.getMonth());
        return monthsDiff >= 0 && monthsDiff % pattern.interval === 0 && checkDate.getDate() === startDate.getDate();
      case 'yearly':
        if (diffDays < 0) return false;
        const yearsDiff = checkDate.getFullYear() - startDate.getFullYear();
        return yearsDiff >= 0 && yearsDiff % pattern.interval === 0 && checkDate.getMonth() === startDate.getMonth() && checkDate.getDate() === startDate.getDate();
      default:
        return false;
    }
  };

  const getNextDate = (currentDate) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    return next;
  };

  const addTask = (goBack = false) => {
    if (newTask.name.trim()) {
      let timeStr = '';
      if (newTask.hour !== null) {
        let hour = newTask.hour;
        let minute = (newTask.baseMinute !== null ? newTask.baseMinute : 0) + newTask.minuteOffset;
        if (newTask.ampm && hour <= 12) {
          if (newTask.ampm === 'PM' && hour < 12) hour += 12;
          if (newTask.ampm === 'AM' && hour === 12) hour = 0;
        }
        if (hour === 24) hour = 0;
        if (minute >= 60) {
          hour = (hour + Math.floor(minute / 60)) % 24;
          minute = minute % 60;
        }
        timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }

      const now = new Date().toISOString();
      const taskToAdd = {
        ...newTask,
        time: timeStr,
        id: Date.now(),
        isRecurringRoot: newTask.recurring,
        completedDates: [],
        baseMinute: undefined,
        minuteOffset: undefined,
        dateWasManuallySet: undefined,
        timeCreated: now,
        timeScheduled: newTask.date ? newTask.date : null,
        timeCompleted: null
      };

      setTasks(prev => [...prev, taskToAdd]);
      setSessionCreatedIds(prev => [...prev, taskToAdd.id]);

      setNewTask({
        name: '',
        description: '',
        project: newTask.project,
        date: '',
        endDate: '',
        time: '',
        hour: 12,
        baseMinute: null,
        minuteOffset: 0,
        ampm: null,
        completed: false,
        predecessors: [],
        successors: [],
        carryOver: false,
        urgent: false,
        recurring: false,
        isRecurringRoot: false,
        recurringRootId: null,
        recurrencePattern: null,
        dateWasManuallySet: false
      });
      setDateInput('');
      setTimeInput('');
      setClockMode('hour');

      if (goBack) {
        setSelectedView(previousView);
      }
    }
  };

  const saveRecentTask = () => {
    if (!editingRecentTaskId || !newTask.name.trim()) return;
    let timeStr = '';
    if (newTask.hour !== null) {
      let hour = newTask.hour;
      let minute = (newTask.baseMinute !== null ? newTask.baseMinute : 0) + newTask.minuteOffset;
      if (newTask.ampm && hour <= 12) {
        if (newTask.ampm === 'PM' && hour < 12) hour += 12;
        if (newTask.ampm === 'AM' && hour === 12) hour = 0;
      }
      if (hour === 24) hour = 0;
      if (minute >= 60) {
        hour = (hour + Math.floor(minute / 60)) % 24;
        minute = minute % 60;
      }
      timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    updateTask(editingRecentTaskId, {
      ...newTask,
      time: timeStr,
      isRecurringRoot: newTask.recurring,
      baseMinute: undefined,
      minuteOffset: undefined,
      dateWasManuallySet: undefined,
      timeScheduled: newTask.date ? newTask.date : null,
    });
    resetTaskForm();
  };

  const loadRecentTaskForEditing = (task) => {
    // Parse the stored time string (HH:MM) back into hour/minute/ampm form
    let hour = 12;
    let baseMinute = null;
    let minuteOffset = 0;
    let ampm = null;
    if (task.time) {
      const parts = task.time.split(':');
      hour = parseInt(parts[0]);
      const totalMinute = parseInt(parts[1]);
      baseMinute = Math.floor(totalMinute / 5) * 5;
      if (baseMinute === 0) baseMinute = 60;
      minuteOffset = totalMinute - (baseMinute === 60 ? 0 : baseMinute);
      if (!overclock) {
        if (hour === 0) {
          hour = 12;
          ampm = 'AM';
        } else if (hour >= 12) {
          ampm = 'PM';
          if (hour > 12) hour -= 12;
        } else {
          ampm = 'AM';
        }
      }
    }
    setNewTask({
      name: task.name || '',
      description: task.description || '',
      project: task.project || 'Personal',
      date: task.date || '',
      endDate: task.endDate || '',
      time: task.time || '',
      hour,
      baseMinute,
      minuteOffset,
      ampm,
      completed: task.completed || false,
      predecessors: task.predecessors || [],
      successors: task.successors || [],
      carryOver: task.carryOver || false,
      urgent: task.urgent || false,
      recurring: task.recurring || false,
      isRecurringRoot: task.isRecurringRoot || false,
      recurringRootId: task.recurringRootId || null,
      recurrencePattern: task.recurrencePattern || null,
      dateWasManuallySet: !!task.date
    });
    setDateInput(task.date ? task.date.replace(/-/g, '') : '');
    setTimeInput(task.time || '');
    setClockMode('hour');
    setEditingRecentTaskId(task.id);
    setTaskSubView('single');
  };

  const advancedEditTask = (task) => {
    const { _timeInput, ...cleanTask } = task;
    loadRecentTaskForEditing(cleanTask);
    setPreviousView(selectedView);
    setSelectedView('newTask');
  };

  const addBatchTasks = (goBack = false) => {
    const now = new Date().toISOString();
    const newTasks = batchRows
      .filter(row => row.name.trim())
      .map((row, idx) => {
        const dateResult = row.date ? parseBatchDate(row.date) : { date: null, time: null };
        const timeResult = row.time ? parseBatchTime(row.time) : { date: null, time: null };
        const finalDate = timeResult.date || dateResult.date || '';
        const finalTime = timeResult.time || dateResult.time || '';
        return {
          name: row.name,
          description: row.description || '',
          project: row.project || 'Personal',
          date: finalDate,
          time: finalTime,
          hour: 12,
          completed: false,
          predecessors: [],
          successors: [],
          carryOver: false,
          urgent: false,
          recurring: false,
          isRecurringRoot: false,
          recurringRootId: null,
          recurrencePattern: null,
          id: Date.now() + idx,
          timeCreated: now,
          timeScheduled: finalDate || null,
          timeCompleted: null
        };
      });

    if (newTasks.length > 0) {
      setTasks(prev => [...prev, ...newTasks]);
      setSessionCreatedIds(prev => [...prev, ...newTasks.map(t => t.id)]);
      setBatchRows([{ id: Date.now() + 999, name: '', description: '', date: '', time: '', project: 'Personal' }]);
    }

    if (goBack) {
      setSelectedView(previousView);
    }
  };

  const getDisplayMinute = () => {
    if (newTask.baseMinute === null) return 0;
    const total = newTask.baseMinute + newTask.minuteOffset;
    return total >= 60 ? total - 60 : total;
  };

  const resetTaskForm = () => {
    setNewTask({
      name: '',
      description: '',
      project: 'Personal',
      date: '',
      endDate: '',
      time: '',
      hour: 12,
      baseMinute: null,
      minuteOffset: 0,
      ampm: null,
      completed: false,
      predecessors: [],
      successors: [],
      carryOver: false,
      urgent: false,
      recurring: false,
      isRecurringRoot: false,
      recurringRootId: null,
      recurrencePattern: null,
      dateWasManuallySet: false
    });
    setDateInput('');
    setTimeInput('');
    setTaskCreationMonth(new Date());
    setClockMode('hour');
    setEditingRecentTaskId(null);
  };

  const navigateToNewTask = () => {
    setPreviousView(selectedView);
    setSelectedView('newTask');
    setTaskSubView('single');
    setSessionCreatedIds([]);
  };

  const goBackFromNewTask = () => {
    resetTaskForm();
    setSelectedView(previousView);
  };

  const updateTask = (taskId, updates) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const startEditTask = (task) => setEditingTask({ ...task });

  const saveEditTask = () => {
    if (editingTask) {
      const { _timeInput, ...taskData } = editingTask;
      updateTask(editingTask.id, taskData);
      setEditingTask(null);
    }
  };

  const parseDateInput = (input) => {
    const cleaned = input.replace(/[\-\_\.\/\:]/g, '');
    const combinedMatch = cleaned.match(/^(\d{8})(\d{2,4})(am|pm)?$/i);
    if (combinedMatch) {
      const dateStr = combinedMatch[1];
      const timeStr = combinedMatch[2];
      const ampm = combinedMatch[3];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      setNewTask(prev => ({ ...prev, date: `${year}-${month}-${day}`, dateWasManuallySet: true }));
      applyTimeFromParsed(timeStr, ampm);
      return;
    }
    if (cleaned.length === 8 && /^\d{8}$/.test(cleaned)) {
      const year = cleaned.substring(0, 4);
      const month = cleaned.substring(4, 6);
      const day = cleaned.substring(6, 8);
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        setNewTask(prev => ({ ...prev, date: `${year}-${month}-${day}`, dateWasManuallySet: true }));
      }
    }
  };

  const applyTimeFromParsed = (timeDigits, ampmStr) => {
    const padded = timeDigits.padStart(4, '0');
    let hour = parseInt(padded.substring(0, 2));
    let minute = parseInt(padded.substring(2, 4));
    if (ampmStr) {
      const ampm = ampmStr.toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      if (hour === 0) hour = 24;
      const baseMin = minute === 0 ? 60 : Math.round(minute / 5) * 5 || 60;
      const offset = minute - (baseMin === 60 ? 0 : baseMin);
      setNewTask(prev => ({ ...prev, hour, baseMinute: baseMin, minuteOffset: Math.abs(offset) <= 4 ? offset : 0, ampm }));
    } else {
      if (hour === 0) hour = 24;
      const baseMin = minute === 0 ? 60 : Math.round(minute / 5) * 5 || 60;
      const offset = minute - (baseMin === 60 ? 0 : baseMin);
      setNewTask(prev => ({ ...prev, hour, baseMinute: baseMin, minuteOffset: Math.abs(offset) <= 4 ? offset : 0, ampm: null }));
    }
  };

  const parseTimeInput = (input) => {
    const cleaned = input.replace(/[\-\_\.\/\:]/g, '').replace(/\s/g, '');
    const combinedMatch = cleaned.match(/^(\d{8})(\d{2,4})(am|pm)?$/i);
    if (combinedMatch) {
      const dateStr = combinedMatch[1];
      const timeStr = combinedMatch[2];
      const ampm = combinedMatch[3];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      setNewTask(prev => ({ ...prev, date: `${year}-${month}-${day}`, dateWasManuallySet: true }));
      applyTimeFromParsed(timeStr, ampm);
      return;
    }
    const ampmMatch = cleaned.match(/^(\d{1,4})(am|pm)$/i);
    if (ampmMatch) {
      applyTimeFromParsed(ampmMatch[1], ampmMatch[2]);
      return;
    }
    if (/^\d{1,4}$/.test(cleaned)) {
      applyTimeFromParsed(cleaned, null);
    }
  };

  const parseBatchDate = (input) => {
    const cleaned = input.replace(/[\-\_\.\/\:]/g, '');
    const combinedMatch = cleaned.match(/^(\d{8})(\d{2,4})(am|pm)?$/i);
    if (combinedMatch) {
      const year = combinedMatch[1].substring(0, 4);
      const month = combinedMatch[1].substring(4, 6);
      const day = combinedMatch[1].substring(6, 8);
      const date = `${year}-${month}-${day}`;
      const time = parseBatchTimeToString(combinedMatch[2], combinedMatch[3]);
      return { date, time };
    }
    if (cleaned.length === 8 && /^\d{8}$/.test(cleaned)) {
      const year = cleaned.substring(0, 4);
      const month = cleaned.substring(4, 6);
      const day = cleaned.substring(6, 8);
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        return { date: `${year}-${month}-${day}`, time: null };
      }
    }
    return { date: null, time: null };
  };

  const parseBatchTime = (input) => {
    const cleaned = input.replace(/[\-\_\.\/\:]/g, '').replace(/\s/g, '');
    const combinedMatch = cleaned.match(/^(\d{8})(\d{2,4})(am|pm)?$/i);
    if (combinedMatch) {
      const year = combinedMatch[1].substring(0, 4);
      const month = combinedMatch[1].substring(4, 6);
      const day = combinedMatch[1].substring(6, 8);
      const date = `${year}-${month}-${day}`;
      const time = parseBatchTimeToString(combinedMatch[2], combinedMatch[3]);
      return { date, time };
    }
    const ampmMatch = cleaned.match(/^(\d{1,4})(am|pm)$/i);
    if (ampmMatch) {
      return { date: null, time: parseBatchTimeToString(ampmMatch[1], ampmMatch[2]) };
    }
    if (/^\d{1,4}$/.test(cleaned)) {
      return { date: null, time: parseBatchTimeToString(cleaned, null) };
    }
    return { date: null, time: null };
  };

  const parseBatchTimeToString = (digits, ampmStr) => {
    const padded = digits.padStart(4, '0');
    let hour = parseInt(padded.substring(0, 2));
    let minute = parseInt(padded.substring(2, 4));
    if (ampmStr) {
      const ampm = ampmStr.toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
    }
    if (hour === 24) hour = 0;
    if (minute > 59) minute = 59;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const selectHour = (hour) => {
    setNewTask(prev => ({ ...prev, hour, ampm: hour > 12 ? null : prev.ampm }));
  };

  const toggleOverclock = () => {
    const newOverclock = !overclock;
    setOverclock(newOverclock);
    setClockMode('hour');
    setNewTask(prev => ({ ...prev, hour: newOverclock ? 24 : 12, ampm: newOverclock ? null : prev.ampm }));
  };

  const onClockHourComplete = () => {
    setClockMode('minute');
  };

  const selectMinute = (minute) => {
    if (newTask.baseMinute === minute) {
      setNewTask(prev => ({ ...prev, baseMinute: null, minuteOffset: 0 }));
    } else {
      setNewTask(prev => ({ ...prev, baseMinute: minute, minuteOffset: 0 }));
    }
  };

  const setMinuteOffset = (offset) => {
    if (newTask.minuteOffset === offset) {
      setNewTask(prev => ({ ...prev, minuteOffset: 0 }));
    } else {
      setNewTask(prev => ({ ...prev, minuteOffset: offset }));
    }
  };

  const selectAMPM = (ampm) => {
    if (newTask.ampm === ampm) {
      setNewTask(prev => ({ ...prev, ampm: null }));
    } else {
      setNewTask(prev => ({ ...prev, ampm }));
    }
  };

  const addProject = () => {
    if (newProject.trim() && !projects.includes(newProject.trim())) {
      setProjects([...projects, newProject.trim()]);
      setNewProject('');
      setShowAddProject(false);
    }
  };

  const deleteProject = (projectName) => {
    setTasks(tasks.map(task => task.project === projectName ? { ...task, project: 'Personal' } : task));
    setProjects(projects.filter(p => p !== projectName));
    setShowDeleteProjectConfirm(null);
  };

  const expandAll = () => {
    const expanded = {};
    projects.forEach(project => { expanded[project] = true; });
    setExpandedProjects(expanded);
  };

  const collapseAll = () => setExpandedProjects({});

  const toggleTask = (taskId) => {
    // Check if this is a recurring instance (generated, not stored)
    const taskIdStr = String(taskId);
    const dashIdx = taskIdStr.indexOf('-');
    if (dashIdx !== -1) {
      // This is a recurring instance like "rootId-2026-02-16"
      const rootIdStr = taskIdStr.substring(0, dashIdx);
      const instanceDate = taskIdStr.substring(dashIdx + 1);
      const rootId = parseInt(rootIdStr);
      setTasks(tasks.map(task => {
        if (task.id === rootId && task.isRecurringRoot) {
          const completedDates = task.completedDates || [];
          const isCompleted = completedDates.includes(instanceDate);
          return {
            ...task,
            completedDates: isCompleted
              ? completedDates.filter(d => d !== instanceDate)
              : [...completedDates, instanceDate]
          };
        }
        return task;
      }));
      return;
    }

    // Normal task toggle
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const nowCompleted = !task.completed;
        return {
          ...task,
          completed: nowCompleted,
          timeCompleted: nowCompleted ? new Date().toISOString() : null
        };
      }
      return task;
    }));
  };

  const deleteTask = (taskId) => {
    const taskIdStr = String(taskId);
    // Check if this is a recurring instance (generated ID like "rootId-date")
    const dashIdx = taskIdStr.indexOf('-');
    if (dashIdx !== -1) {
      const rootIdStr = taskIdStr.substring(0, dashIdx);
      const rootId = parseInt(rootIdStr);
      const rootTask = tasks.find(t => t.id === rootId);
      if (rootTask && rootTask.isRecurringRoot) {
        const instanceDate = taskIdStr.substring(dashIdx + 1);
        setDeleteRecurringModal({ taskId: rootId, task: rootTask, instanceDate });
        return;
      }
    }
    const task = tasks.find(t => t.id === taskId);
    if (task && (task.isRecurringRoot || task.recurringRootId)) {
      setDeleteRecurringModal({ taskId, task, instanceDate: null });
      return;
    }
    performTaskDeletion(taskId, false, null);
  };

  const performTaskDeletion = (taskId, deleteAllFuture, instanceDate) => {
    const task = tasks.find(t => t.id === taskId);
    if (deleteAllFuture && task) {
      const rootId = task.isRecurringRoot ? task.id : task.recurringRootId;
      setTasks(tasks.filter(t => t.id !== rootId && t.recurringRootId !== rootId));
    } else if (instanceDate && task && task.isRecurringRoot) {
      // Delete single instance by adding to excludedDates
      const excludedDates = task.excludedDates || [];
      setTasks(tasks.map(t =>
        t.id === taskId
          ? { ...t, excludedDates: [...excludedDates, instanceDate] }
          : t
      ));
    } else {
      setTasks(tasks
        .filter(t => t.id !== taskId)
        .map(t => ({
          ...t,
          predecessors: t.predecessors.filter(id => id !== taskId),
          successors: t.successors.filter(id => id !== taskId)
        }))
      );
    }
    setDeleteRecurringModal(null);
  };

  // Resolve recurring instance IDs (e.g. "123456-2026-02-10") to their root task ID
  const resolveTaskId = (id) => {
    const idStr = String(id);
    const dash = idStr.indexOf('-');
    if (dash !== -1) {
      const rootId = parseInt(idStr.substring(0, dash));
      if (!isNaN(rootId)) return rootId;
    }
    return typeof id === 'number' ? id : parseInt(id);
  };

  const addDependency = (taskId, dependencyId, type) => {
    const realTaskId = resolveTaskId(taskId);
    const realDepId = resolveTaskId(dependencyId);
    if (isNaN(realTaskId) || isNaN(realDepId) || realTaskId === realDepId) return;

    setTasks(prev => prev.map(task => {
      if (task.id === realTaskId) {
        const preds = task.predecessors || [];
        const succs = task.successors || [];
        if (type === 'predecessor') {
          if (preds.includes(realDepId)) return task;
          return { ...task, predecessors: [...preds, realDepId] };
        } else {
          if (succs.includes(realDepId)) return task;
          return { ...task, successors: [...succs, realDepId] };
        }
      }
      if (task.id === realDepId) {
        const preds = task.predecessors || [];
        const succs = task.successors || [];
        if (type === 'predecessor') {
          if (succs.includes(realTaskId)) return task;
          return { ...task, successors: [...succs, realTaskId] };
        } else {
          if (preds.includes(realTaskId)) return task;
          return { ...task, predecessors: [...preds, realTaskId] };
        }
      }
      return task;
    }));
  };

  const removeDependency = (taskId, dependencyId, type) => {
    const realTaskId = resolveTaskId(taskId);
    const realDepId = resolveTaskId(dependencyId);

    setTasks(prev => prev.map(task => {
      if (task.id === realTaskId) {
        if (type === 'predecessor') return { ...task, predecessors: (task.predecessors || []).filter(id => id !== realDepId) };
        else return { ...task, successors: (task.successors || []).filter(id => id !== realDepId) };
      }
      if (task.id === realDepId) {
        if (type === 'predecessor') return { ...task, successors: (task.successors || []).filter(id => id !== realTaskId) };
        else return { ...task, predecessors: (task.predecessors || []).filter(id => id !== realTaskId) };
      }
      return task;
    }));
  };

  const getTasksForDate = (date) => {
    const dateStr = getLocalDateString(date);
    const checkDate = new Date(dateStr + 'T00:00:00');
    const result = [];

    tasks.forEach(task => {
      // --- RECURRING ROOT TASKS ---
      if (task.isRecurringRoot) {
        if (!task.recurrencePattern || !task.date) return;
        const taskStartDate = new Date(task.date + 'T00:00:00');
        const taskEndDate = task.endDate ? new Date(task.endDate + 'T00:00:00') : null;
        const maxOcc = task.recurrencePattern.count === 'infinite' ? Infinity : task.recurrencePattern.count;
        const completedDates = task.completedDates || [];
        const excludedDates = task.excludedDates || [];

        // --- CARRY-OVER + RECURRING ---
        // This is ONE task that "moves" through recurring dates.
        // It sits on the first upcoming uncompleted recurring date.
        // Completing it once finishes it entirely.
        if (task.carryOver) {
          if (checkDate < taskStartDate) return;
          if (taskEndDate && checkDate > taskEndDate) return;

          // Build list of all recurring dates within range
          let scanD = new Date(taskStartDate);
          let occCount = 0;
          const allRecurDates = [];
          const scanLimit = taskEndDate || new Date(checkDate.getFullYear() + 2, 0, 1);
          while (scanD <= scanLimit && occCount < maxOcc && occCount < 10000) {
            if (shouldIncludeDate(taskStartDate, scanD, task.recurrencePattern) && scanD >= taskStartDate) {
              allRecurDates.push(getLocalDateString(scanD));
              occCount++;
            }
            scanD = getNextDate(scanD);
          }

          // If completed on ANY recurring date, the task is done
          const filteredRecurDates = allRecurDates.filter(d => !excludedDates.includes(d));
          const completedOn = filteredRecurDates.find(d => completedDates.includes(d));
          if (completedOn) {
            // Show completed on the date it was completed
            if (completedOn === dateStr) {
              const isLast = filteredRecurDates.length > 0 && dateStr === filteredRecurDates[filteredRecurDates.length - 1];
              result.push({
                ...task,
                id: `${task.id}-${dateStr}`,
                date: dateStr,
                isRecurringRoot: false,
                recurringRootId: task.id,
                instanceDate: dateStr,
                completed: true,
                urgent: task.urgent && taskEndDate && isLast,
                _isRecurringInstance: true,
                _isCarryRecurring: true
              });
            }
            return;
          }

          // Not completed — find the current resting date:
          // The first recurring date that is >= today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let restingDate = null;
          for (const rd of filteredRecurDates) {
            const rdDate = new Date(rd + 'T00:00:00');
            if (rdDate >= today) {
              restingDate = rd;
              break;
            }
          }
          // If all recurring dates are past, rest on the last one
          if (!restingDate && filteredRecurDates.length > 0) {
            restingDate = filteredRecurDates[filteredRecurDates.length - 1];
          }

          // Only show on the resting date
          if (restingDate !== dateStr) return;

          const isLast = filteredRecurDates.length > 0 && dateStr === filteredRecurDates[filteredRecurDates.length - 1];
          result.push({
            ...task,
            id: `${task.id}-${dateStr}`,
            date: dateStr,
            isRecurringRoot: false,
            recurringRootId: task.id,
            instanceDate: dateStr,
            completed: false,
            urgent: task.urgent && taskEndDate && isLast,
            _isRecurringInstance: true,
            _isCarryRecurring: true
          });
          return;
        }

        // --- PURE RECURRING (no carry-over) ---
        // Each matching date is a separate instance, independently completable
        if (checkDate < taskStartDate) return;
        if (taskEndDate && checkDate > taskEndDate) return;
        if (!shouldIncludeDate(taskStartDate, checkDate, task.recurrencePattern)) return;
        if (excludedDates.includes(dateStr)) return;

        // Count occurrences to enforce limit
        let occCount = 0;
        let scanD = new Date(taskStartDate);
        while (scanD <= checkDate) {
          if (shouldIncludeDate(taskStartDate, scanD, task.recurrencePattern) && scanD >= taskStartDate) {
            occCount++;
            if (occCount > maxOcc) return;
          }
          scanD = getNextDate(scanD);
        }
        if (occCount > maxOcc) return;

        const isCompleted = completedDates.includes(dateStr);

        // Urgent: only on the last instance
        let isLastInstance = false;
        if (task.urgent && taskEndDate) {
          let nextCheck = new Date(checkDate);
          nextCheck.setDate(nextCheck.getDate() + 1);
          let futureOcc = occCount;
          let foundFuture = false;
          while (nextCheck <= taskEndDate && futureOcc < maxOcc) {
            if (shouldIncludeDate(taskStartDate, nextCheck, task.recurrencePattern)) {
              futureOcc++;
              if (futureOcc <= maxOcc) {
                foundFuture = true;
                break;
              }
            }
            nextCheck.setDate(nextCheck.getDate() + 1);
          }
          isLastInstance = !foundFuture;
        }

        result.push({
          ...task,
          id: `${task.id}-${dateStr}`,
          date: dateStr,
          isRecurringRoot: false,
          recurringRootId: task.id,
          instanceDate: dateStr,
          completed: isCompleted,
          urgent: isLastInstance,
          _isRecurringInstance: true,
          _isCarryRecurring: false
        });
        return;
      }

      // --- PURE CARRY-OVER TASKS (not recurring) ---
      if (task.carryOver && !task.recurring) {
        if (!task.date) return;
        const startD = new Date(task.date + 'T00:00:00');
        if (checkDate < startD) return;
        if (task.endDate) {
          const endD = new Date(task.endDate + 'T00:00:00');
          if (checkDate > endD) return;
        }
        // If already completed, only show on the original date
        if (task.completed && task.date !== dateStr) return;
        // Determine if this is the last day (for urgent)
        const isLastDay = task.urgent && task.endDate && dateStr === task.endDate;
        result.push({
          ...task,
          _displayDate: dateStr,
          urgent: isLastDay // Only urgent on the final carry-over day
        });
        return;
      }

      // --- NORMAL TASKS ---
      if (task.date === dateStr) {
        result.push(task);
      }
    });

    return result;
  };

  const getBackgroundColorForDay = (percentage) => {
    if (percentage >= 80) return 'bg-green-900';
    if (percentage >= 50) return 'bg-yellow-900';
    if (percentage > 0) return 'bg-red-900';
    return 'bg-gray-800';
  };

  const getCompletionStats = (date) => {
    const dateTasks = getTasksForDate(date);
    const total = dateTasks.length;
    const completed = dateTasks.filter(t => t.completed).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const urgentTasks = dateTasks.filter(t => t.urgent);
    const urgentTotal = urgentTasks.length;
    const urgentCompleted = urgentTasks.filter(t => t.completed).length;
    const urgentPercentage = urgentTotal > 0 ? (urgentCompleted / urgentTotal) * 100 : 0;
    let color = 'bg-gray-700';
    if (percentage >= 80) color = 'bg-green-500';
    else if (percentage >= 50) color = 'bg-yellow-500';
    else if (total > 0) color = 'bg-red-500';
    return { total, completed, percentage, color, urgentTotal, urgentCompleted, urgentPercentage, backgroundColor: getBackgroundColorForDay(percentage) };
  };

  const undatedTasks = tasks.filter(task => !task.date && !task.isRecurringRoot);
  const undatedByProject = projects.reduce((acc, project) => {
    acc[project] = undatedTasks.filter(task => task.project === project);
    return acc;
  }, {});

  const toggleProjectExpansion = (project) => {
    setExpandedProjects(prev => ({ ...prev, [project]: !prev[project] }));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return getLocalDateString(date1) === getLocalDateString(date2);
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextTaskCreationMonth = () => setTaskCreationMonth(new Date(taskCreationMonth.getFullYear(), taskCreationMonth.getMonth() + 1, 1));
  const prevTaskCreationMonth = () => setTaskCreationMonth(new Date(taskCreationMonth.getFullYear(), taskCreationMonth.getMonth() - 1, 1));

  const selectTaskDate = (date) => {
    const dateStr = getLocalDateString(date);
    const allowTwoDates = newTask.carryOver || newTask.recurring;

    if (!allowTwoDates) {
      // Single date mode - clicking same date deselects, otherwise replaces
      if (newTask.date === dateStr) {
        setNewTask(prev => ({ ...prev, date: '', endDate: '', dateWasManuallySet: false }));
      } else {
        setNewTask(prev => ({ ...prev, date: dateStr, endDate: '', dateWasManuallySet: true }));
      }
      return;
    }

    // Two-date mode (carry-over or recurring active)
    // Clicking the current start date → deselect it (promote endDate if exists)
    if (newTask.date === dateStr) {
      if (newTask.endDate) {
        setNewTask(prev => ({ ...prev, date: prev.endDate, endDate: '', dateWasManuallySet: true }));
      } else {
        setNewTask(prev => ({ ...prev, date: '', endDate: '', dateWasManuallySet: false }));
      }
      return;
    }

    // If no first date yet, set it
    if (!newTask.date) {
      const updates = { date: dateStr, endDate: '', dateWasManuallySet: true };
      if (newTask.recurring && newTask.recurrencePattern && newTask.recurrencePattern.frequency === 'weekly') {
        updates.recurrencePattern = { ...newTask.recurrencePattern, daysOfWeek: [date.getDay()] };
      }
      setNewTask(prev => ({ ...prev, ...updates }));
      return;
    }

    // First date exists → always set/move endDate, auto-sort so date < endDate
    // But if clicking the current endDate, deselect it (back to "forever")
    if (newTask.endDate === dateStr) {
      setNewTask(prev => ({ ...prev, endDate: '' }));
      return;
    }
    const existingDate = new Date(newTask.date + 'T00:00:00');
    const clickedDate = new Date(dateStr + 'T00:00:00');
    if (clickedDate < existingDate) {
      // Clicked earlier than current start → swap: clicked becomes start, old start becomes end
      const updates = { date: dateStr, endDate: newTask.date, dateWasManuallySet: true };
      if (newTask.recurring && newTask.recurrencePattern && newTask.recurrencePattern.frequency === 'weekly') {
        updates.recurrencePattern = { ...newTask.recurrencePattern, daysOfWeek: [date.getDay()] };
      }
      setNewTask(prev => ({ ...prev, ...updates }));
    } else {
      // Clicked later or same → set as endDate
      setNewTask(prev => ({ ...prev, endDate: dateStr }));
    }
  };

  const toggleCarryOver = () => {
    const newVal = !newTask.carryOver;
    const updates = { carryOver: newVal };
    if (newVal) {
      // Turning on: auto-set date if none
      if (!newTask.date) {
        updates.date = getLocalDateString(new Date());
        updates.dateWasManuallySet = false;
      }
      // Also enable recurring with default pattern
      updates.recurring = true;
      const taskDate = newTask.date ? new Date(newTask.date + 'T00:00:00') : new Date();
      updates.recurrencePattern = { frequency: 'daily', interval: 1, daysOfWeek: [taskDate.getDay()], count: 'infinite' };
    } else {
      // Also turn off recurring
      updates.recurring = false;
      updates.recurrencePattern = null;
      if (!newTask.dateWasManuallySet && !newTask.urgent) {
        updates.date = '';
        updates.endDate = '';
      } else {
        updates.endDate = '';
      }
    }
    setNewTask(prev => ({ ...prev, ...updates }));
  };

  const toggleUrgent = () => {
    if (!newTask.urgent) {
      const updates = { urgent: true };
      if (!newTask.date) {
        updates.date = getLocalDateString(new Date());
        updates.dateWasManuallySet = false;
      }
      setNewTask(prev => ({ ...prev, ...updates }));
    } else {
      const updates = { urgent: false };
      if (!newTask.dateWasManuallySet && !newTask.carryOver && !newTask.recurring) {
        updates.date = '';
        updates.endDate = '';
      }
      setNewTask(prev => ({ ...prev, ...updates }));
    }
  };

  const toggleRecurring = () => {
    const newVal = !newTask.recurring;
    const updates = { recurring: newVal };
    if (newVal) {
      if (!newTask.date) {
        updates.date = getLocalDateString(new Date());
        updates.dateWasManuallySet = false;
      }
      const taskDate = newTask.date ? new Date(newTask.date + 'T00:00:00') : new Date();
      updates.recurrencePattern = { frequency: 'daily', interval: 1, daysOfWeek: [taskDate.getDay()], count: 'infinite' };
    } else {
      updates.recurrencePattern = null;
      if (!newTask.carryOver) {
        updates.endDate = '';
      }
      if (!newTask.dateWasManuallySet && !newTask.carryOver && !newTask.urgent) {
        updates.date = '';
        updates.endDate = '';
      }
    }
    setNewTask(prev => ({ ...prev, ...updates }));
  };

  const updateRecurrenceInterval = (value, isAdditive = false) => {
    if (!newTask.recurrencePattern) return;
    let newInterval = isAdditive ? newTask.recurrencePattern.interval + value : value;
    newInterval = Math.max(1, newInterval);
    setNewTask({ ...newTask, recurrencePattern: { ...newTask.recurrencePattern, interval: newInterval } });
  };

  const computeEndDateFromCount = (startDateStr, pattern, count) => {
    if (!startDateStr || !pattern || count === 'infinite' || !count) return '';
    const start = new Date(startDateStr + 'T00:00:00');
    let current = new Date(start);
    let found = 0;
    let lastMatch = null;
    let safety = 0;
    while (found < count && safety < 100000) {
      if (shouldIncludeDate(start, current, pattern) && current >= start) {
        found++;
        lastMatch = new Date(current);
      }
      if (found < count) {
        current.setDate(current.getDate() + 1);
      }
      safety++;
    }
    if (lastMatch) {
      return getLocalDateString(lastMatch);
    }
    return '';
  };

  const updateRecurrenceCount = (value, isAdditive = false) => {
    if (!newTask.recurrencePattern) return;
    let newCount = newTask.recurrencePattern.count;
    if (value === 'infinite') {
      newCount = 'infinite';
    } else {
      if (newCount === 'infinite') newCount = value;
      else newCount = isAdditive ? newCount + value : value;
      if (newCount <= 0) newCount = 'infinite';
    }
    const updates = { recurrencePattern: { ...newTask.recurrencePattern, count: newCount } };
    // Auto-adjust endDate when count is manually set and we have a start date
    if (newTask.date && newCount !== 'infinite') {
      const newEndDate = computeEndDateFromCount(newTask.date, { ...newTask.recurrencePattern, count: newCount }, newCount);
      if (newEndDate) {
        updates.endDate = newEndDate;
      }
    } else if (newCount === 'infinite') {
      updates.endDate = '';
    }
    setNewTask({ ...newTask, ...updates });
  };

  const getIntervalLabel = () => {
    if (!newTask.recurrencePattern) return '';
    const interval = newTask.recurrencePattern.interval;
    switch (newTask.recurrencePattern.frequency) {
      case 'daily': return `${interval} DAY${interval !== 1 ? 'S' : ''}`;
      case 'weekly': return `${interval} WEEK${interval !== 1 ? 'S' : ''}`;
      case 'monthly': return `${interval} MONTH${interval !== 1 ? 'S' : ''}`;
      case 'yearly': return `${interval} YEAR${interval !== 1 ? 'S' : ''}`;
      default: return '';
    }
  };

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayUrgentTasks = () => {
    const today = new Date();
    const todayTasks = getTasksForDate(today);
    return todayTasks.filter(t => t.urgent && !t.completed);
  };

  const recentTasks = [...tasks].sort((a, b) => {
    const ta = a.timeCreated || '1970';
    const tb = b.timeCreated || '1970';
    return tb.localeCompare(ta);
  });

  // Batch row helpers
  const addBatchRow = () => setBatchRows(prev => [...prev, { id: Date.now(), name: '', description: '', date: '', time: '', project: 'Personal' }]);
  const removeBatchRow = (id) => setBatchRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const duplicateBatchRow = (row) => setBatchRows(prev => {
    const idx = prev.findIndex(r => r.id === row.id);
    const dup = { ...row, id: Date.now() };
    const next = [...prev];
    next.splice(idx + 1, 0, dup);
    return next;
  });
  const updateBatchRow = (id, field, value) => setBatchRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const formatTimeShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Render recent tasks list
  const renderRecentTasksList = () => (
    <div className="border-t border-gray-700 mt-4 pt-3">
      <h3 className="text-xs font-mono text-gray-500 mb-2">RECENT TASKS</h3>
      <div className="space-y-1">
        {recentTasks.length === 0 ? (
          <p className="text-gray-600 font-mono text-xs">// no tasks yet</p>
        ) : (
          recentTasks.map(task => {
            const isSessionTask = sessionCreatedIds.includes(task.id);
            const isBeingEdited = editingRecentTaskId === task.id;
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between px-2 py-1.5 text-xs font-mono border cursor-pointer ${
                  isBeingEdited
                    ? 'bg-blue-950 border-blue-600 text-blue-200'
                    : isSessionTask
                      ? 'bg-green-950 border-green-800 text-green-200 hover:bg-green-900'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
                onClick={() => loadRecentTaskForEditing(task)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`truncate ${task.completed ? 'line-through text-gray-600' : ''}`}>
                    {task.name}
                  </span>
                  {task.urgent && <span className="text-red-500 flex-shrink-0">[!]</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-gray-500">{task.date || 'undated'}</span>
                  {task.time && <span className="text-gray-500">{task.time}</span>}
                  {task.timeCreated && <span className="text-gray-600">{formatTimeShort(task.timeCreated)}</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    className="text-red-500 hover:text-red-400 p-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Render action buttons
  const renderActionButtons = (createFn) => (
    <div className="flex gap-2 pt-2">
      {editingRecentTaskId ? (
        <button
          onClick={saveRecentTask}
          className="flex-1 bg-green-700 border border-green-600 text-white px-4 py-2 font-mono hover:bg-green-600 text-sm"
        >
          SAVE
        </button>
      ) : (
        <button
          onClick={() => createFn(false)}
          className="flex-1 bg-green-700 border border-green-600 text-white px-4 py-2 font-mono hover:bg-green-600 text-sm"
        >
          CREATE
        </button>
      )}
      <button
        onClick={editingRecentTaskId ? () => resetTaskForm() : goBackFromNewTask}
        className="flex-1 bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 font-mono hover:bg-gray-600 text-sm"
      >
        CANCEL
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border border-gray-700 bg-gray-800 p-3 md:p-4 mb-4">
          <div className="flex justify-between items-center mb-2 md:mb-0">
            <h1 className="text-lg md:text-2xl font-mono font-bold">TASK_MANAGER</h1>
            <div className="flex gap-2 items-center">
              <button
                onClick={exportTasksJSON}
                className="hidden md:inline-block px-3 py-2 font-mono text-xs border bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                title="Export tasks to JSON file"
              >
                EXPORT
              </button>
              <button
                onClick={importTasksJSON}
                className="hidden md:inline-block px-3 py-2 font-mono text-xs border bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                title="Import tasks from JSON file"
              >
                IMPORT
              </button>
              {importExportMsg && (
                <span className={`font-mono text-xs ${importExportMsg.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                  {importExportMsg}
                </span>
              )}
              <SyncPanel
                syncConfig={syncConfig}
                updateSyncConfig={updateSyncConfig}
                syncStatus={syncStatus}
                syncMessage={syncMessage}
                lastSynced={lastSynced}
                push={syncPush}
                pull={syncPull}
                testConnection={testConnection}
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setSelectedView('dashboard')}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2 font-mono text-xs md:text-sm border ${
                selectedView === 'dashboard' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              DASHBOARD
            </button>
            <button
              onClick={() => setSelectedView('undated')}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2 font-mono text-xs md:text-sm border ${
                selectedView === 'undated' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              UNDATED
            </button>
            <button
              onClick={navigateToNewTask}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2 font-mono text-xs md:text-sm border ${
                selectedView === 'newTask' ? 'bg-green-600 border-green-500 text-white' : 'bg-green-700 border-green-600 text-white hover:bg-green-600'
              }`}
            >
              [+] ADD
            </button>
            {/* Mobile-only export/import buttons */}
            <button
              onClick={exportTasksJSON}
              className="md:hidden px-3 py-2 font-mono text-xs border bg-gray-700 border-gray-600 text-gray-300"
              title="Export"
            >
              EXP
            </button>
            <button
              onClick={importTasksJSON}
              className="md:hidden px-3 py-2 font-mono text-xs border bg-gray-700 border-gray-600 text-gray-300"
              title="Import"
            >
              IMP
            </button>
          </div>
        </div>

        {/* ========== NEW TASK VIEW ========== */}
        {selectedView === 'newTask' && (
          <TaskCreationView
            taskSubView={taskSubView}
            setTaskSubView={setTaskSubView}
            newTask={newTask}
            setNewTask={setNewTask}
            dateInput={dateInput}
            setDateInput={setDateInput}
            timeInput={timeInput}
            setTimeInput={setTimeInput}
            parseDateInput={parseDateInput}
            parseTimeInput={parseTimeInput}
            projects={projects}
            taskCreationMonth={taskCreationMonth}
            taskCreationDates={taskCreationDates}
            prevTaskCreationMonth={prevTaskCreationMonth}
            nextTaskCreationMonth={nextTaskCreationMonth}
            selectTaskDate={selectTaskDate}
            isToday={isToday}
            getLocalDateString={getLocalDateString}
            getDisplayMinute={getDisplayMinute}
            clockMode={clockMode}
            setClockMode={setClockMode}
            overclock={overclock}
            toggleOverclock={toggleOverclock}
            overclockLocked={overclockLocked}
            setOverclockLocked={setOverclockLocked}
            selectHour={selectHour}
            onClockHourComplete={onClockHourComplete}
            selectMinute={selectMinute}
            setMinuteOffset={setMinuteOffset}
            selectAMPM={selectAMPM}
            toggleUrgent={toggleUrgent}
            toggleCarryOver={toggleCarryOver}
            toggleRecurring={toggleRecurring}
            updateRecurrenceInterval={updateRecurrenceInterval}
            updateRecurrenceCount={updateRecurrenceCount}
            getIntervalLabel={getIntervalLabel}
            batchRows={batchRows}
            addBatchRow={addBatchRow}
            removeBatchRow={removeBatchRow}
            duplicateBatchRow={duplicateBatchRow}
            updateBatchRow={updateBatchRow}
            addTask={addTask}
            addBatchTasks={addBatchTasks}
            goBackFromNewTask={goBackFromNewTask}
            renderRecentTasksList={renderRecentTasksList}
            renderActionButtons={renderActionButtons}
            getRecurringDatesForMonth={getRecurringDatesForMonth}
            getLastRecurringDate={getLastRecurringDate}
            resetDate={resetDate}
            resetTime={resetTime}
          />
        )}

        {/* ========== DASHBOARD VIEW ========== */}
        {selectedView === 'dashboard' && (
          <DashboardView
            currentMonth={currentMonth}
            calendarDates={calendarDates}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            getCompletionStats={getCompletionStats}
            isToday={isToday}
            isSameDate={isSameDate}
            getTasksForDate={getTasksForDate}
            getTodayUrgentTasks={getTodayUrgentTasks}
            tasks={tasks}
            projects={projects}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            addDependency={addDependency}
            removeDependency={removeDependency}
            updateTask={updateTask}
            editingTask={editingTask}
            startEditTask={startEditTask}
            saveEditTask={saveEditTask}
            setEditingTask={setEditingTask}
            advancedEditTask={advancedEditTask}
          />
        )}

        {/* ========== UNDATED VIEW ========== */}
        {selectedView === 'undated' && (
          <UndatedView
            projects={projects}
            undatedByProject={undatedByProject}
            expandedProjects={expandedProjects}
            toggleProjectExpansion={toggleProjectExpansion}
            expandAll={expandAll}
            collapseAll={collapseAll}
            showAddProject={showAddProject}
            setShowAddProject={setShowAddProject}
            newProject={newProject}
            setNewProject={setNewProject}
            addProject={addProject}
            setShowDeleteProjectConfirm={setShowDeleteProjectConfirm}
            tasks={tasks}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            addDependency={addDependency}
            removeDependency={removeDependency}
            updateTask={updateTask}
            editingTask={editingTask}
            startEditTask={startEditTask}
            saveEditTask={saveEditTask}
            setEditingTask={setEditingTask}
            advancedEditTask={advancedEditTask}
          />
        )}

        {/* Modals */}
        {showDeleteProjectConfirm && (
          <DeleteProjectModal
            projectName={showDeleteProjectConfirm}
            onDelete={deleteProject}
            onCancel={() => setShowDeleteProjectConfirm(null)}
          />
        )}

        {deleteRecurringModal && (
          <DeleteRecurringModal
            taskId={deleteRecurringModal.taskId}
            onDeleteInstance={(id) => performTaskDeletion(id, false, deleteRecurringModal.instanceDate)}
            onDeleteAll={(id) => performTaskDeletion(id, true, null)}
            onCancel={() => setDeleteRecurringModal(null)}
          />
        )}
      </div>
    </div>
  );
};

export default TaskManager;
