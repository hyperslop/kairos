import React from 'react';
import { Check } from 'lucide-react';
import TaskItem from './TaskItem';

const DashboardView = ({
  currentMonth,
  calendarDates,
  selectedDate,
  setSelectedDate,
  prevMonth,
  nextMonth,
  getCompletionStats,
  isToday,
  isSameDate,
  getTasksForDate,
  getTodayUrgentTasks,
  tasks,
  projects,
  toggleTask,
  deleteTask,
  addDependency,
  removeDependency,
  updateTask,
  editingTask,
  startEditTask,
  saveEditTask,
  setEditingTask,
  advancedEditTask
}) => {
  return (
    <div className="border border-gray-700 bg-gray-800 p-2 md:p-4">
      {getTodayUrgentTasks().length > 0 && (
        <div className="mb-4 border border-red-800 bg-red-950 p-2 md:p-3">
          <h3 className="text-sm font-mono font-bold text-red-400 mb-2">URGENT TODAY</h3>
          <div className="space-y-2">
            {getTodayUrgentTasks().map(task => (
              <div key={task.id} className="flex items-center justify-between bg-red-900 border border-red-800 p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                    {task.completed ? (
                      <div className="w-4 h-4 bg-green-600 border border-green-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 border border-gray-600 bg-gray-800" />
                    )}
                  </button>
                  <span className={`font-mono text-xs md:text-sm flex-1 truncate ${task.completed ? 'line-through text-gray-600' : 'text-white'}`}>
                    {task.name}
                  </span>
                </div>
                <span className="bg-blue-900 border border-blue-700 text-blue-300 px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-mono flex-shrink-0 ml-2">
                  {task.project}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="text-gray-400 hover:text-white font-mono text-sm md:text-base">&lt; PREV</button>
        <h2 className="text-base md:text-xl font-mono font-bold">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
        </h2>
        <button onClick={nextMonth} className="text-gray-400 hover:text-white font-mono text-sm md:text-base">NEXT &gt;</button>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className="text-center font-mono text-xs text-gray-500 py-1 md:py-2 border-b border-gray-700">
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.charAt(0)}</span>
          </div>
        ))}
        {calendarDates.map((date, idx) => {
          if (!date) return <div key={idx} className="aspect-square" />;
          const stats = getCompletionStats(date);
          const isCurrentDay = isToday(date);
          const isSelectedDay = selectedDate && isSameDate(date, selectedDate);
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={`aspect-square border p-0.5 md:p-2 cursor-pointer hover:bg-gray-700 ${
                isCurrentDay
                  ? (isSelectedDay ? 'border-4 border-red-500' : 'border-2 border-red-500')
                  : isSelectedDay ? 'border-4 border-blue-500' : 'border border-gray-700'
              } ${stats.backgroundColor}`}
            >
              <div className="text-xs md:text-sm font-mono mb-0.5 md:mb-1">{date.getDate()}</div>
              {stats.urgentTotal > 0 && (
                <div className="mb-0.5 md:mb-1 hidden md:block">
                  <div className="text-xs font-mono text-red-400">{stats.urgentCompleted}/{stats.urgentTotal}</div>
                  <div className="w-full bg-gray-700 h-1"><div className="bg-red-500 h-1" style={{ width: `${stats.urgentPercentage}%` }} /></div>
                </div>
              )}
              {stats.total > 0 && (
                <div>
                  <div className="text-xs font-mono text-gray-400 hidden md:block">{stats.completed}/{stats.total}</div>
                  <div className="w-full bg-gray-700 h-1"><div className={`${stats.color} h-1`} style={{ width: `${stats.percentage}%` }} /></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="border-t-2 border-gray-700 pt-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm md:text-lg font-mono font-bold truncate mr-2">
              <span className="hidden md:inline">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</span>
              <span className="md:hidden">{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</span>
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-white font-mono text-sm flex-shrink-0">[X] CLOSE</button>
          </div>
          <div className="space-y-0">
            {getTasksForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 font-mono text-sm">// no tasks scheduled</p>
            ) : (
              getTasksForDate(selectedDate).map((task, idx) => (
                <TaskItem key={task.id} task={task} tasks={tasks} projects={projects} toggleTask={toggleTask} deleteTask={deleteTask} addDependency={addDependency} removeDependency={removeDependency} updateTask={updateTask} editingTask={editingTask} startEditTask={startEditTask} saveEditTask={saveEditTask} setEditingTask={setEditingTask} advancedEditTask={advancedEditTask} showDate={false} index={idx} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
