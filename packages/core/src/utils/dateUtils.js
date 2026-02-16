// Calendar generation
export const generateCalendarDates = (month) => {
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

// Date formatting
export const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTimeShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// Background color helper
export const getBackgroundColorForDay = (percentage) => {
  if (percentage >= 80) return 'bg-green-900';
  if (percentage >= 50) return 'bg-yellow-900';
  if (percentage > 0) return 'bg-red-900';
  return 'bg-gray-800';
};

// Date parsing utilities
export const parseDateInput = (input, setNewTask, applyTimeFromParsed) => {
  const cleaned = input.replace(/[\-\_\.\/\:]/g, '');
  // Try combined format: YYYYMMDDHHMM(am/pm)
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
  // Date only: YYYYMMDD
  if (cleaned.length === 8 && /^\d{8}$/.test(cleaned)) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      setNewTask(prev => ({ ...prev, date: `${year}-${month}-${day}`, dateWasManuallySet: true }));
    }
  }
};

export const applyTimeFromParsed = (timeDigits, ampmStr, setNewTask) => {
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
    // 24-hour format assumed
    if (hour === 0) hour = 24;
    const baseMin = minute === 0 ? 60 : Math.round(minute / 5) * 5 || 60;
    const offset = minute - (baseMin === 60 ? 0 : baseMin);
    setNewTask(prev => ({ ...prev, hour, baseMinute: baseMin, minuteOffset: Math.abs(offset) <= 4 ? offset : 0, ampm: null }));
  }
};

export const parseTimeInput = (input, setNewTask, applyTimeFromParsed) => {
  const cleaned = input.replace(/[\-\_\.\/\:]/g, '').replace(/\s/g, '');
  // Try combined format first: YYYYMMDDHHMM(am/pm) in the time field
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
  // Time with am/pm: e.g. 0901pm, 130pm
  const ampmMatch = cleaned.match(/^(\d{1,4})(am|pm)$/i);
  if (ampmMatch) {
    applyTimeFromParsed(ampmMatch[1], ampmMatch[2]);
    return;
  }
  // Time only (24h assumed): e.g. 1301, 0900
  if (/^\d{1,4}$/.test(cleaned)) {
    applyTimeFromParsed(cleaned, null);
  }
};

export const parseBatchDate = (input) => {
  const cleaned = input.replace(/[\-\_\.\/\:]/g, '');
  // Combined: YYYYMMDDHHMM(am/pm)
  const combinedMatch = cleaned.match(/^(\d{8})(\d{2,4})(am|pm)?$/i);
  if (combinedMatch) {
    const dateStr = combinedMatch[1];
    const timeStr = combinedMatch[2];
    const ampm = combinedMatch[3];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const padded = timeStr.padStart(4, '0');
    let hour = parseInt(padded.substring(0, 2));
    let minute = parseInt(padded.substring(2, 4));
    if (ampm) {
      const ap = ampm.toUpperCase();
      if (ap === 'PM' && hour < 12) hour += 12;
      if (ap === 'AM' && hour === 12) hour = 0;
    }
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { date: `${year}-${month}-${day}`, time: timeFormatted };
  }
  // Date only: YYYYMMDD
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

export const parseBatchTime = (input) => {
  const cleaned = input.replace(/[\-\_\.\/\:]/g, '').replace(/\s/g, '');
  // Combined: YYYYMMDDHHMM(am/pm)
  const combinedMatch = cleaned.match(/^(\d{8})(\d{2,4})(am|pm)?$/i);
  if (combinedMatch) {
    const dateStr = combinedMatch[1];
    const timeStr = combinedMatch[2];
    const ampm = combinedMatch[3];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const padded = timeStr.padStart(4, '0');
    let hour = parseInt(padded.substring(0, 2));
    let minute = parseInt(padded.substring(2, 4));
    if (ampm) {
      const ap = ampm.toUpperCase();
      if (ap === 'PM' && hour < 12) hour += 12;
      if (ap === 'AM' && hour === 12) hour = 0;
    }
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { date: `${year}-${month}-${day}`, time: timeFormatted };
  }
  // Time with am/pm: e.g. 0901pm, 130pm
  const ampmMatch = cleaned.match(/^(\d{1,4})(am|pm)$/i);
  if (ampmMatch) {
    const timeStr = ampmMatch[1];
    const ampm = ampmMatch[2];
    const padded = timeStr.padStart(4, '0');
    let hour = parseInt(padded.substring(0, 2));
    let minute = parseInt(padded.substring(2, 4));
    const ap = ampm.toUpperCase();
    if (ap === 'PM' && hour < 12) hour += 12;
    if (ap === 'AM' && hour === 12) hour = 0;
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { date: null, time: timeFormatted };
  }
  // Time only (24h): e.g. 1301, 0900
  if (/^\d{1,4}$/.test(cleaned)) {
    const padded = cleaned.padStart(4, '0');
    const hour = parseInt(padded.substring(0, 2));
    const minute = parseInt(padded.substring(2, 4));
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { date: null, time: timeFormatted };
  }
  return { date: null, time: null };
};
