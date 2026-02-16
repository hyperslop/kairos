import { getLocalDateString } from './dateUtils';

export const generateRecurringInstances = (rootTask, startDate, endDate) => {
  if (!rootTask.isRecurringRoot || !rootTask.recurrencePattern || !rootTask.date) return [];
  const instances = [];
  const pattern = rootTask.recurrencePattern;
  const taskStartDate = new Date(rootTask.date + 'T00:00:00');
  let currentDate = new Date(taskStartDate);
  let occurrenceCount = 0;
  const maxOccurrences = pattern.count === 'infinite' ? Infinity : pattern.count;
  if (startDate > currentDate) currentDate = new Date(startDate);
  while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
    const shouldInclude = shouldIncludeDate(taskStartDate, currentDate, pattern);
    if (shouldInclude && currentDate >= taskStartDate) {
      const instanceDate = getLocalDateString(currentDate);
      if (instanceDate !== rootTask.date || occurrenceCount > 0) {
        instances.push({
          ...rootTask,
          id: `${rootTask.id}-${instanceDate}`,
          date: instanceDate,
          isRecurringRoot: false,
          recurringRootId: rootTask.id,
          instanceDate: instanceDate
        });
      }
      occurrenceCount++;
    }
    currentDate = getNextDate(currentDate, pattern);
  }
  return instances;
};

export const shouldIncludeDate = (startDate, checkDate, pattern) => {
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

export const getNextDate = (currentDate) => {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + 1);
  return next;
};

export const getIntervalLabel = (recurrencePattern) => {
  if (!recurrencePattern) return '';
  const interval = recurrencePattern.interval;
  switch (recurrencePattern.frequency) {
    case 'daily': return `${interval} DAY${interval !== 1 ? 'S' : ''}`;
    case 'weekly': return `${interval} WEEK${interval !== 1 ? 'S' : ''}`;
    case 'monthly': return `${interval} MONTH${interval !== 1 ? 'S' : ''}`;
    case 'yearly': return `${interval} YEAR${interval !== 1 ? 'S' : ''}`;
    default: return '';
  }
};
