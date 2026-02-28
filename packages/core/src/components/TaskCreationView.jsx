import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Copy, Infinity, Lock, Unlock, RotateCcw, ChevronDown } from 'lucide-react';
import ClockFace from './ClockFace';

const TaskCreationView = ({
  taskSubView,
  setTaskSubView,
  newTask,
  setNewTask,
  dateInput,
  setDateInput,
  timeInput,
  setTimeInput,
  parseDateInput,
  parseTimeInput,
  projects,
  taskCreationMonth,
  taskCreationDates,
  prevTaskCreationMonth,
  nextTaskCreationMonth,
  selectTaskDate,
  isToday,
  getLocalDateString,
  getDisplayMinute,
  clockMode,
  setClockMode,
  overclock,
  toggleOverclock,
  overclockLocked,
  setOverclockLocked,
  selectHour,
  onClockHourComplete,
  selectMinute,
  setMinuteOffset,
  selectAMPM,
  toggleUrgent,
  toggleCarryOver,
  toggleRecurring,
  updateRecurrenceInterval,
  updateRecurrenceCount,
  getIntervalLabel,
  batchRows,
  addBatchRow,
  removeBatchRow,
  duplicateBatchRow,
  updateBatchRow,
  addTask,
  addBatchTasks,
  goBackFromNewTask,
  renderRecentTasksList,
  renderActionButtons,
  getRecurringDatesForMonth,
  getLastRecurringDate,
  resetDate,
  resetTime,
}) => {
  const recurringDates = getRecurringDatesForMonth(taskCreationMonth);
  const lastRecurringDateStr = getLastRecurringDate();

  const ProjectAutocomplete = ({ value, onChange, compact = false }) => {
    const [inputText, setInputText] = useState(value || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => { setInputText(value || ''); }, [value]);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
          setShowDropdown(false);
          setShowAll(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateDropdownPos = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });
      }
    };

    const filtered = inputText
      ? projects.filter(p => p.toLowerCase().includes(inputText.toLowerCase()))
      : projects;

    const handleInput = (text) => {
      setInputText(text);
      setShowAll(false);
      updateDropdownPos();
      setShowDropdown(true);
    };

    const selectProject = (project) => {
      setInputText(project);
      onChange(project);
      setShowDropdown(false);
      setShowAll(false);
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!projects.includes(inputText) && inputText) {
          const match = projects.find(p => p.toLowerCase() === inputText.toLowerCase());
          if (match) {
            setInputText(match);
            onChange(match);
          } else {
            setInputText(value);
          }
        } else if (inputText) {
          onChange(inputText);
        }
      }, 200);
    };

    const openDropdown = (all) => {
      if (all) setShowAll(true);
      updateDropdownPos();
      setShowDropdown(true);
    };

    const dropdownItems = showAll ? projects : filtered;
    const py = compact ? 'py-1' : 'py-2';
    const textSize = compact ? 'text-xs' : 'text-sm';

    return (
      <div ref={wrapperRef} className="relative flex-1 flex">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { openDropdown(false); }}
          onBlur={handleBlur}
          className={`flex-1 border border-gray-600 bg-gray-900 text-white px-2 ${py} font-mono ${textSize} min-w-0`}
          placeholder="project"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); if (showDropdown && showAll) { setShowDropdown(false); setShowAll(false); } else { openDropdown(true); } }}
          className={`border border-l-0 border-gray-600 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 px-1.5 flex items-center justify-center`}
          type="button"
        >
          <ChevronDown size={compact ? 10 : 12} />
        </button>
        {showDropdown && dropdownItems.length > 0 && (
          <div
            className="border border-gray-600 bg-gray-900 max-h-40 overflow-y-auto shadow-lg"
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          >
            {dropdownItems.map(project => (
              <button
                key={project}
                onMouseDown={(e) => { e.preventDefault(); selectProject(project); }}
                className={`w-full text-left px-2 py-1 font-mono ${textSize} hover:bg-gray-700 ${project === value ? 'text-blue-400 bg-gray-800' : 'text-gray-300'}`}
              >
                {project}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getCalendarDayStyle = (date) => {
    const dateStr = getLocalDateString(date);
    const isStart = newTask.date === dateStr;
    const isEnd = newTask.endDate === dateStr;
    const isCurrentDay = isToday(date);
    const isRecurringDate = recurringDates.has(dateStr);

    // Carry-over range (pure carry-over, no recurring): every day between start and end
    let isInCarryOverRange = false;
    if (newTask.carryOver && !newTask.recurring && newTask.date && !isStart) {
      const startD = new Date(newTask.date + 'T00:00:00');
      const thisD = new Date(dateStr + 'T00:00:00');
      if (newTask.endDate) {
        const endD = new Date(newTask.endDate + 'T00:00:00');
        isInCarryOverRange = thisD > startD && thisD <= endD;
      } else {
        isInCarryOverRange = thisD > startD;
      }
    }

    // Carry-over + recurring: only matching recurring dates are highlighted (yellow)
    const isCarryRecurDate = newTask.carryOver && newTask.recurring && isRecurringDate && !isStart;

    // Determine "last date" for urgent red highlight
    let isUrgentLast = false;
    if (newTask.urgent && newTask.endDate) {
      if (newTask.carryOver && !newTask.recurring) {
        // Pure carry-over + urgent: the end date becomes urgent (red)
        isUrgentLast = isEnd;
      } else if (newTask.carryOver && newTask.recurring) {
        // Carry-over + recurring + urgent: last recurring date in range is urgent
        isUrgentLast = lastRecurringDateStr && dateStr === lastRecurringDateStr;
      } else if (newTask.recurring && !newTask.carryOver) {
        // Pure recurring + urgent: last recurring date is red
        isUrgentLast = lastRecurringDateStr && dateStr === lastRecurringDateStr;
      }
    }

    let bgClass = 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700';
    let outlineClass = '';

    // Priority order for styling
    if (isUrgentLast) {
      // Urgent last date always wins (red) — even over isEnd
      bgClass = 'bg-red-600 border-red-500 text-white';
    } else if (isStart) {
      // Start date: blue always. Never red (urgent is deferred to end for carry-over)
      if (newTask.urgent && !newTask.carryOver && !newTask.recurring) {
        // Plain urgent task (no carry, no recur): start IS the urgent date
        bgClass = 'bg-red-600 border-red-500 text-white';
      } else if (newTask.urgent && !newTask.carryOver && newTask.recurring && !newTask.endDate) {
        // Recurring + urgent + infinite: start is red (they're all urgent... no, only last is)
        // Actually with infinite recurring + urgent, there's no "last", so don't make any red
        bgClass = 'bg-blue-600 border-blue-500 text-white';
      } else {
        bgClass = 'bg-blue-600 border-blue-500 text-white';
      }
    } else if (isCarryRecurDate) {
      bgClass = 'bg-yellow-600 border-yellow-500 text-white';
    } else if (isRecurringDate && newTask.recurring && !newTask.carryOver) {
      // Pure recurring (no carry-over): purple normally
      bgClass = 'bg-purple-600 border-purple-500 text-white';
    } else if (isInCarryOverRange) {
      bgClass = 'bg-yellow-600 border-yellow-500 text-white';
    } else if (isEnd) {
      // End boundary (not otherwise styled): subtle marker
      bgClass = 'bg-gray-600 border-gray-400 text-white';
    }

    if (isCurrentDay) {
      outlineClass = 'ring-2 ring-blue-500 ring-inset';
    }

    return `${bgClass} ${outlineClass}`;
  };

  // Date label text
  const dateLabelText = (() => {
    if (newTask.date && newTask.endDate) {
      const s = new Date(newTask.date + 'T00:00:00').toLocaleDateString();
      const e = new Date(newTask.endDate + 'T00:00:00').toLocaleDateString();
      return `${s} → ${e}`;
    }
    if (newTask.date) {
      return new Date(newTask.date + 'T00:00:00').toLocaleDateString();
    }
    return '(undated)';
  })();

  return (
    <div>
      {taskSubView === 'single' && (
        <div>
          <div className="border border-gray-700 bg-gray-800 p-2 md:p-4 space-y-3">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <button
              onClick={() => setTaskSubView('single')}
              className={`text-base md:text-xl font-mono font-bold ${taskSubView === 'single' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              NEW_TASK
            </button>
            <button
              onClick={() => setTaskSubView('batch')}
              className={`text-base md:text-xl font-mono font-bold ${taskSubView === 'batch' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              BATCH_TASK
            </button>
          </div>
          <div>
            <label className="block text-sm font-mono mb-1 text-gray-400">NAME:</label>
            <input
              type="text"
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              className="w-full border border-gray-600 bg-gray-900 text-white px-3 py-2 font-mono"
              placeholder="task name"
            />
          </div>

          <div>
            <label className="block text-sm font-mono mb-1 text-gray-400">DESCRIPTION:</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full border border-gray-600 bg-gray-900 text-white px-3 py-2 font-mono"
              rows="2"
              placeholder="task description"
            />
          </div>

          <div>
            <label className="block text-sm font-mono mb-1 text-gray-400">PROJECT:</label>
            <ProjectAutocomplete
              value={newTask.project}
              onChange={(project) => setNewTask({ ...newTask, project })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date column */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-mono text-gray-400 truncate mr-2">
                  DATE: {dateLabelText}
                </label>
                <button
                  onClick={resetDate}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center border border-gray-600 bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 rounded-sm"
                  title="Clear date"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
              <input
                type="text"
                value={dateInput}
                onChange={(e) => { setDateInput(e.target.value); parseDateInput(e.target.value); }}
                placeholder="20260206 or 2026-02-06"
                className="w-full border border-gray-600 bg-gray-900 text-white px-2 py-1 font-mono text-sm mb-2"
              />
              <div className="border border-gray-600 bg-gray-900 p-2">
                <div className="flex justify-between items-center mb-2">
                  <button onClick={prevTaskCreationMonth} className="text-gray-400 hover:text-white"><ChevronLeft size={16} /></button>
                  <span className="font-mono text-xs">{taskCreationMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  <button onClick={nextTaskCreationMonth} className="text-gray-400 hover:text-white"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center text-xs font-mono text-gray-500 py-1">{day}</div>
                  ))}
                  {taskCreationDates.map((date, idx) => {
                    if (!date) return <div key={idx} className="aspect-square" />;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectTaskDate(date)}
                        className={`aspect-square border text-xs font-mono flex items-center justify-center ${getCalendarDayStyle(date)}`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time column */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-mono text-gray-400 truncate mr-2">
                  TIME: {newTask.hour !== null ? `${String(newTask.hour).padStart(2, '0')}:${String(getDisplayMinute()).padStart(2, '0')}${newTask.ampm ? ' ' + newTask.ampm : ''}` : '(no time)'}
                </label>
                <button
                  onClick={resetTime}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center border border-gray-600 bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 rounded-sm"
                  title="Clear time"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
              <input
                type="text"
                value={timeInput}
                onChange={(e) => { setTimeInput(e.target.value); parseTimeInput(e.target.value); }}
                placeholder="1301 or 09:01pm"
                className="w-full border border-gray-600 bg-gray-900 text-white px-2 py-1 font-mono text-sm mb-2"
              />

              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-1" style={{ maxWidth: 220 }}>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setClockMode('hour')}
                      className={`px-2 py-0.5 text-xs font-mono border ${clockMode === 'hour' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                    >
                      HR
                    </button>
                    <button
                      onClick={() => setClockMode('minute')}
                      className={`px-2 py-0.5 text-xs font-mono border ${clockMode === 'minute' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                    >
                      MIN
                    </button>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={toggleOverclock}
                      className={`flex items-center gap-1 px-2 py-0.5 text-xs font-mono border ${overclock ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                    >
                      <div className={`w-6 h-3 rounded-full relative ${overclock ? 'bg-purple-400' : 'bg-gray-600'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0 transition-all ${overclock ? 'left-3' : 'left-0'}`} />
                      </div>
                      24H
                    </button>
                    <button
                      onClick={() => setOverclockLocked(!overclockLocked)}
                      className={`px-1.5 py-0.5 text-xs font-mono border flex items-center justify-center ${overclockLocked ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                      title={overclockLocked ? '24H preference locked (saved)' : 'Lock 24H preference'}
                    >
                      {overclockLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>

                <div className="text-center font-mono text-lg text-blue-300 mb-1">
                  <span className={clockMode === 'hour' ? 'text-blue-400 font-bold' : 'text-gray-500'}>
                    {newTask.hour !== null ? String(newTask.hour).padStart(2, '0') : '--'}
                  </span>
                  <span className="text-gray-500">:</span>
                  <span className={clockMode === 'minute' ? 'text-blue-400 font-bold' : 'text-gray-500'}>
                    {String(getDisplayMinute()).padStart(2, '0')}
                  </span>
                </div>

                <div className="flex gap-3 items-start justify-center">
                  <div className="flex flex-col items-center">
                    {clockMode === 'hour' ? (
                      <ClockFace
                        value={newTask.hour}
                        max={overclock ? 24 : 12}
                        overclock={overclock}
                        onChange={(h) => selectHour(h)}
                        onComplete={onClockHourComplete}
                        size={160}
                        label="HOUR"
                      />
                    ) : (
                      <ClockFace
                        value={getDisplayMinute()}
                        max={60}
                        onChange={(m) => {
                          const roundTo5 = Math.round(m / 5) * 5;
                          const base = roundTo5 === 0 ? 60 : roundTo5;
                          setNewTask(prev => ({ ...prev, baseMinute: base, minuteOffset: 0 }));
                        }}
                        size={160}
                        label="MINUTE"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-6">
                    <div className="text-xs font-mono text-gray-500 mb-0.5">FINE +MIN</div>
                    <div className="grid grid-cols-2 gap-1">
                      {[1, 2, 3, 4].map(offset => (
                        <button
                          key={offset}
                          onClick={() => setMinuteOffset(offset)}
                          className={`w-9 h-7 border text-xs font-mono ${
                            newTask.minuteOffset === offset
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          +{offset}
                        </button>
                      ))}
                    </div>

                    {!overclock && (
                      <div className="flex flex-col gap-1 mt-1">
                        <button
                          onClick={() => selectAMPM('AM')}
                          className={`w-full h-7 border text-xs font-mono ${
                            newTask.ampm === 'AM' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          AM
                        </button>
                        <button
                          onClick={() => selectAMPM('PM')}
                          className={`w-full h-7 border text-xs font-mono ${
                            newTask.ampm === 'PM' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          PM
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Urgent / Carry / Recurring buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={toggleUrgent}
              className={`border px-4 py-3 font-mono text-sm ${
                newTask.urgent ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              URGENT
            </button>
            <button
              onClick={toggleCarryOver}
              className={`border px-4 py-3 font-mono text-sm ${
                newTask.carryOver ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              CARRY OVER
            </button>
            <button
              onClick={toggleRecurring}
              className={`border px-4 py-3 font-mono text-sm ${
                newTask.recurring ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              RECURRING
            </button>
          </div>

          {/* Recurrence pattern */}
          {newTask.recurring && newTask.recurrencePattern && (
            <div className="border border-purple-600 bg-purple-950 p-4 space-y-3">
              <h3 className="font-mono text-sm text-purple-300 mb-2">RECURRENCE PATTERN</h3>

              <div className="grid grid-cols-4 gap-2">
                {['daily', 'weekly', 'monthly', 'yearly'].map(freq => (
                  <button
                    key={freq}
                    onClick={() => {
                      const taskDate = newTask.date ? new Date(newTask.date + 'T00:00:00') : new Date();
                      const dayOfWeek = taskDate.getDay();
                      setNewTask({
                        ...newTask,
                        recurrencePattern: { ...newTask.recurrencePattern, frequency: freq, daysOfWeek: freq === 'weekly' ? [dayOfWeek] : [] }
                      });
                    }}
                    className={`border px-3 py-2 font-mono text-xs ${
                      newTask.recurrencePattern.frequency === freq ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {freq.toUpperCase()}
                  </button>
                ))}
              </div>

              {newTask.recurrencePattern.frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-mono mb-1 text-gray-400">DAYS OF WEEK:</label>
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                      const isSelected = newTask.recurrencePattern.daysOfWeek.includes(idx);
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            const days = newTask.recurrencePattern.daysOfWeek;
                            const newDays = isSelected ? days.filter(d => d !== idx) : [...days, idx].sort();
                            setNewTask({ ...newTask, recurrencePattern: { ...newTask.recurrencePattern, daysOfWeek: newDays } });
                          }}
                          className={`border px-2 py-1 text-xs font-mono ${isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono mb-1 text-gray-400">
                    EVERY: {getIntervalLabel()}
                  </label>
                  <div className="flex gap-1 items-center flex-wrap">
                    <div className="grid grid-cols-9 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          onClick={() => updateRecurrenceInterval(num, false)}
                          className={`w-7 h-7 border text-xs font-mono ${
                            newTask.recurrencePattern.interval === num ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={newTask.recurrencePattern.interval}
                      onChange={(e) => updateRecurrenceInterval(parseInt(e.target.value) || 1, false)}
                      className="w-16 border border-gray-600 bg-gray-900 text-white px-2 py-1 font-mono text-xs h-7"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono mb-1 text-gray-400">
                    OCCURRENCES: {newTask.recurrencePattern.count === 'infinite' ? 'INFINITE' : newTask.recurrencePattern.count}
                  </label>
                  <div className="flex gap-1 items-center flex-wrap">
                    <div className="grid grid-cols-9 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          onClick={() => updateRecurrenceCount(num, false)}
                          className={`w-7 h-7 border text-xs font-mono ${
                            newTask.recurrencePattern.count === num ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => updateRecurrenceCount('infinite', false)}
                      className={`w-7 h-7 border text-xs font-mono flex items-center justify-center ${
                        newTask.recurrencePattern.count === 'infinite' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Infinity size={12} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={newTask.recurrencePattern.count === 'infinite' ? '' : newTask.recurrencePattern.count}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > 0) updateRecurrenceCount(val, false);
                      }}
                      placeholder="∞"
                      className="w-16 border border-gray-600 bg-gray-900 text-white px-2 py-1 font-mono text-xs h-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {renderActionButtons(addTask)}
          </div>
          {renderRecentTasksList()}
        </div>
      )}

      {taskSubView === 'batch' && (
        <div>
          <div className="border border-gray-700 bg-gray-800 p-2 md:p-4 space-y-3">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <button
              onClick={() => setTaskSubView('single')}
              className={`text-base md:text-xl font-mono font-bold ${taskSubView === 'single' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              NEW_TASK
            </button>
            <button
              onClick={() => setTaskSubView('batch')}
              className={`text-base md:text-xl font-mono font-bold ${taskSubView === 'batch' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              BATCH_TASK
            </button>
          </div>
          <div className="border border-gray-700 bg-gray-900 overflow-x-auto">
            <table className="w-full font-mono text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-center w-10">#</th>
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-left">NAME</th>
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-left w-28">PROJECT</th>
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-left">DESCRIPTION</th>
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-left w-28">DATE</th>
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-left w-20">TIME</th>
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-center w-20"></th>
                  <th className="px-2 py-1.5 text-xs text-gray-400 text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="px-2 py-1 text-xs text-gray-500 text-center">{idx + 1}</td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateBatchRow(row.id, 'name', e.target.value)}
                        className="w-full border border-gray-700 bg-gray-900 text-white px-2 py-1 font-mono text-sm focus:border-blue-500 outline-none"
                        placeholder="task name"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <ProjectAutocomplete
                        value={row.project || 'Personal'}
                        onChange={(project) => updateBatchRow(row.id, 'project', project)}
                        compact
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateBatchRow(row.id, 'description', e.target.value)}
                        className="w-full border border-gray-700 bg-gray-900 text-white px-2 py-1 font-mono text-xs focus:border-blue-500 outline-none"
                        placeholder="description"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.date}
                        onChange={(e) => updateBatchRow(row.id, 'date', e.target.value)}
                        className="w-full border border-gray-700 bg-gray-900 text-white px-2 py-1 font-mono text-xs focus:border-blue-500 outline-none"
                        placeholder="YYYYMMDD"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.time}
                        onChange={(e) => updateBatchRow(row.id, 'time', e.target.value)}
                        className="w-full border border-gray-700 bg-gray-900 text-white px-2 py-1 font-mono text-xs focus:border-blue-500 outline-none"
                        placeholder="HHMM"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex gap-0.5 justify-center">
                        <button
                          onClick={() => {
                            const newUrgent = !row.urgent;
                            const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; })();
                            updateBatchRow(row.id, 'urgent', newUrgent);
                            if (newUrgent) {
                              updateBatchRow(row.id, 'carryOver', false);
                              updateBatchRow(row.id, 'recurring', false);
                              updateBatchRow(row.id, 'date', todayStr);
                            }
                          }}
                          className={`w-6 h-6 border text-xs font-mono font-bold ${
                            row.urgent ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                          }`}
                          title="Urgent"
                        >
                          U
                        </button>
                        <button
                          onClick={() => {
                            const newCarry = !row.carryOver;
                            const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; })();
                            updateBatchRow(row.id, 'carryOver', newCarry);
                            if (newCarry) {
                              updateBatchRow(row.id, 'recurring', true);
                              updateBatchRow(row.id, 'urgent', false);
                              updateBatchRow(row.id, 'date', todayStr);
                            } else {
                              updateBatchRow(row.id, 'recurring', false);
                            }
                          }}
                          className={`w-6 h-6 border text-xs font-mono font-bold ${
                            row.carryOver ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                          }`}
                          title="Carry Over"
                        >
                          C
                        </button>
                        <button
                          onClick={() => {
                            const newRecurring = !row.recurring;
                            const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; })();
                            updateBatchRow(row.id, 'recurring', newRecurring);
                            if (newRecurring) {
                              updateBatchRow(row.id, 'urgent', false);
                              updateBatchRow(row.id, 'date', todayStr);
                            } else {
                              updateBatchRow(row.id, 'carryOver', false);
                            }
                          }}
                          className={`w-6 h-6 border text-xs font-mono font-bold ${
                            row.recurring ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                          }`}
                          title="Recurring"
                        >
                          R
                        </button>
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => duplicateBatchRow(row)}
                          className="w-7 h-7 border border-gray-600 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center"
                          title="Duplicate"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={() => removeBatchRow(row.id)}
                          className="w-7 h-7 border border-gray-600 bg-gray-800 text-red-400 hover:text-red-300 hover:bg-gray-700 flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addBatchRow}
            className="flex items-center gap-1 text-green-400 hover:text-green-300 font-mono text-sm border border-green-700 bg-green-950 px-3 py-1.5 hover:bg-green-900"
          >
            <Plus size={14} /> ADD ROW
          </button>

          <div className="mt-6" />
          {renderActionButtons(addBatchTasks)}
          </div>
          {renderRecentTasksList()}
        </div>
      )}
    </div>
  );
};

export default TaskCreationView;
