import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';

const DependencyPicker = ({ tasks, projects, currentTask, type, onAdd, onCancel }) => {
  const [selectedProject, setSelectedProject] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [showProjectDrop, setShowProjectDrop] = useState(false);
  const [showTaskDrop, setShowTaskDrop] = useState(false);
  const [projectDropPos, setProjectDropPos] = useState({ top: 0, left: 0, width: 0 });
  const [taskDropPos, setTaskDropPos] = useState({ top: 0, left: 0, width: 0 });
  const projectWrapRef = useRef(null);
  const taskWrapRef = useRef(null);
  const projectInputRef = useRef(null);
  const taskInputRef = useRef(null);

  // Resolve recurring instance IDs to the root task ID
  const currentRealId = (() => {
    const idStr = String(currentTask.id);
    const dash = idStr.indexOf('-');
    if (dash !== -1 && currentTask._isRecurringInstance) {
      return parseInt(idStr.substring(0, dash));
    }
    return currentTask.id;
  })();

  // Available tasks: exclude self and already-linked tasks
  const availableTasks = tasks.filter(t => {
    if (t.id === currentRealId) return false;
    const preds = currentTask.predecessors || [];
    const succs = currentTask.successors || [];
    if (preds.includes(t.id) || succs.includes(t.id)) return false;
    return true;
  });

  // Filter by selected project, then by task search text
  const projectFiltered = selectedProject
    ? availableTasks.filter(t => t.project === selectedProject)
    : availableTasks;

  const taskFiltered = taskSearch
    ? projectFiltered.filter(t => t.name.toLowerCase().includes(taskSearch.toLowerCase()))
    : projectFiltered;

  // Project options with search filtering
  const projectOptions = ['(All Projects)', ...projects];
  const filteredProjects = projectSearch
    ? projectOptions.filter(p => p.toLowerCase().includes(projectSearch.toLowerCase()))
    : projectOptions;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (projectWrapRef.current && !projectWrapRef.current.contains(e.target)) {
        setShowProjectDrop(false);
      }
      if (taskWrapRef.current && !taskWrapRef.current.contains(e.target)) {
        setShowTaskDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateProjectDropPos = () => {
    if (projectWrapRef.current) {
      const rect = projectWrapRef.current.getBoundingClientRect();
      setProjectDropPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  };

  const updateTaskDropPos = () => {
    if (taskWrapRef.current) {
      const rect = taskWrapRef.current.getBoundingClientRect();
      setTaskDropPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  };

  const selectProject = (project) => {
    if (project === '(All Projects)') {
      setSelectedProject('');
      setProjectSearch('');
    } else {
      setSelectedProject(project);
      setProjectSearch(project);
    }
    setShowProjectDrop(false);
    setTaskSearch('');
    setTimeout(() => taskInputRef.current?.focus(), 50);
  };

  const selectTask = (task) => {
    onAdd(currentTask.id, task.id, type);
    setTaskSearch('');
    setShowTaskDrop(false);
  };

  const handleProjectBlur = () => {
    setTimeout(() => {
      if (!projectSearch) {
        setSelectedProject('');
      } else {
        const match = projects.find(p => p.toLowerCase() === projectSearch.toLowerCase());
        if (match) {
          setSelectedProject(match);
          setProjectSearch(match);
        } else if (!projects.find(p => p.toLowerCase().includes(projectSearch.toLowerCase()))) {
          setSelectedProject('');
          setProjectSearch('');
        }
      }
    }, 200);
  };

  return (
    <div className="mb-2 space-y-1">
      <div className="flex gap-1 items-center">
        {/* Project filter dropdown */}
        <div ref={projectWrapRef} className="relative flex w-2/5">
          <input
            ref={projectInputRef}
            type="text"
            value={projectSearch}
            onChange={(e) => {
              setProjectSearch(e.target.value);
              setShowProjectDrop(true);
              updateProjectDropPos();
            }}
            onFocus={() => { updateProjectDropPos(); setShowProjectDrop(true); }}
            onBlur={handleProjectBlur}
            className="flex-1 border border-gray-600 bg-gray-900 text-white px-2 py-1 font-mono text-xs min-w-0"
            placeholder="project..."
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); updateProjectDropPos(); setShowProjectDrop(!showProjectDrop); }}
            className="border border-l-0 border-gray-600 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 px-1 flex items-center justify-center"
            type="button"
          >
            <ChevronDown size={10} />
          </button>
          {showProjectDrop && filteredProjects.length > 0 && (
            <div
              className="border border-gray-600 bg-gray-900 max-h-40 overflow-y-auto shadow-lg"
              style={{ position: 'fixed', top: projectDropPos.top, left: projectDropPos.left, width: projectDropPos.width, zIndex: 9999 }}
            >
              {filteredProjects.map(p => (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); selectProject(p); }}
                  className={`w-full text-left px-2 py-1 font-mono text-xs hover:bg-gray-700 ${p === selectedProject || (p === '(All Projects)' && !selectedProject) ? 'text-blue-400 bg-gray-800' : 'text-gray-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task search dropdown */}
        <div ref={taskWrapRef} className="relative flex flex-1">
          <input
            ref={taskInputRef}
            type="text"
            value={taskSearch}
            onChange={(e) => {
              setTaskSearch(e.target.value);
              setShowTaskDrop(true);
              updateTaskDropPos();
            }}
            onFocus={() => { updateTaskDropPos(); setShowTaskDrop(true); }}
            onBlur={() => setTimeout(() => setShowTaskDrop(false), 200)}
            className="flex-1 border border-gray-600 bg-gray-900 text-white px-2 py-1 font-mono text-xs min-w-0"
            placeholder="search tasks..."
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); updateTaskDropPos(); setShowTaskDrop(!showTaskDrop); setTaskSearch(''); }}
            className="border border-l-0 border-gray-600 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 px-1 flex items-center justify-center"
            type="button"
          >
            <ChevronDown size={10} />
          </button>
          {showTaskDrop && (
            <div
              className="border border-gray-600 bg-gray-900 max-h-40 overflow-y-auto shadow-lg"
              style={{ position: 'fixed', top: taskDropPos.top, left: taskDropPos.left, width: taskDropPos.width, zIndex: 9999 }}
            >
              {taskFiltered.length === 0 ? (
                <div className="px-2 py-1 font-mono text-xs text-gray-500">// no matching tasks</div>
              ) : (
                taskFiltered.map(t => (
                  <button
                    key={t.id}
                    onMouseDown={(e) => { e.preventDefault(); selectTask(t); }}
                    className="w-full text-left px-2 py-1 font-mono text-xs hover:bg-gray-700 text-gray-300 flex items-center gap-2"
                  >
                    <span className="truncate flex-1">{t.name}</span>
                    <span className="text-blue-400 text-[10px] flex-shrink-0">[{t.project}]</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-red-400 px-1 flex-shrink-0"
          title="Cancel"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

const TaskItem = ({ 
  task, 
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
  showDate = true,
  index = 0
}) => {
  const [showDependencies, setShowDependencies] = useState(false);
  const [showAddDep, setShowAddDep] = useState({ predecessor: false, successor: false });
  const [expanded, setExpanded] = useState(false);

  const isEditing = editingTask && editingTask.id === task.id;

  const getPredecessorTasks = () => tasks.filter(t => (task.predecessors || []).includes(t.id));
  const getSuccessorTasks = () => tasks.filter(t => (task.successors || []).includes(t.id));

  const getTypeColor = () => {
    if (task.urgent) return 'border-l-red-500';
    if (task.carryOver && task._isCarryRecurring) return 'border-l-yellow-500';
    if (task.carryOver) return 'border-l-yellow-500';
    if (task.recurring || task.recurringRootId || task._isRecurringInstance) return 'border-l-purple-500';
    return 'border-l-gray-600';
  };

  const altBgStyle = index % 2 === 0 ? {} : { backgroundColor: '#1a2332' };

  const descNeedsTruncate = task.description && task.description.length > 50;

  if (isEditing) {
    return (
      <div className={`border border-gray-700 bg-gray-900 p-3 border-l-2 ${getTypeColor()}`}>
        <div className="space-y-2">
          <input
            type="text"
            value={editingTask.name}
            onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
            className="w-full border border-gray-600 bg-gray-800 text-white px-2 py-1 font-mono text-sm"
            placeholder="task name"
          />
          <textarea
            value={editingTask.description}
            onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
            className="w-full border border-gray-600 bg-gray-800 text-white px-2 py-1 font-mono text-sm"
            rows="2"
            placeholder="description"
          />
          <input
            type="date"
            value={editingTask.date}
            onChange={(e) => setEditingTask({ ...editingTask, date: e.target.value })}
            className="w-full border border-gray-600 bg-gray-800 text-white px-2 py-1 font-mono text-sm"
          />
          <div className="flex gap-2">
            <button onClick={saveEditTask} className="flex-1 bg-green-700 border border-green-600 text-white px-3 py-1 font-mono text-sm hover:bg-green-600">SAVE</button>
            <button onClick={() => setEditingTask(null)} className="flex-1 bg-gray-700 border border-gray-600 text-gray-300 px-3 py-1 font-mono text-sm hover:bg-gray-600">CANCEL</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-700 border-l-2 ${getTypeColor()}`} style={altBgStyle}>
      {/* Main compact row */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
          {task.completed ? (
            <div className="w-4 h-4 bg-green-600 border border-green-500 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          ) : (
            <div className="w-4 h-4 border border-gray-600 bg-gray-800" />
          )}
        </button>

        <span className={`font-mono text-xs md:text-sm min-w-0 truncate ${task.completed ? 'line-through text-gray-600' : 'text-white'}`}>
          {task.name}
        </span>

        {task.urgent && <span className="text-red-500 text-xs font-mono flex-shrink-0">[!]</span>}
        {task.carryOver && <span className="text-yellow-500 text-xs font-mono flex-shrink-0">[C]</span>}
        {(task.recurring || task.recurringRootId || task._isRecurringInstance) && <span className="text-purple-500 text-xs font-mono flex-shrink-0">[R]</span>}

        {showDate && task.date && (
          <span className="text-xs font-mono text-gray-500 flex-shrink-0">
            {new Date(task.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.time && <span className="text-xs font-mono text-gray-500 flex-shrink-0">{task.time}</span>}

        {task.description && !expanded && (
          <span className="hidden md:inline text-xs font-mono text-gray-500 min-w-0 truncate">
            — {task.description}
          </span>
        )}

        <div className="flex-1" />

        {descNeedsTruncate && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 text-gray-500 hover:text-gray-300 p-0.5"
            title={expanded ? 'Collapse' : 'Expand description'}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}

        <span className="flex-shrink-0 bg-blue-900 border border-blue-700 text-blue-300 px-1 md:px-1.5 py-0.5 text-xs font-mono max-w-[60px] md:max-w-none truncate">
          {task.project}
        </span>

        <button
          onClick={() => setShowDependencies(!showDependencies)}
          className="hidden md:inline-block flex-shrink-0 text-xs text-blue-400 hover:text-blue-300 font-mono border border-blue-700 bg-blue-950 px-1.5 py-0.5"
        >
          DEP({(task.predecessors || []).length + (task.successors || []).length})
        </button>

        <button
          onClick={() => startEditTask(task)}
          className="flex-shrink-0 text-xs bg-gray-800 border border-gray-700 text-gray-300 px-1 md:px-1.5 py-0.5 font-mono hover:bg-gray-700"
        >
          <span className="hidden md:inline">EDIT</span>
          <span className="md:hidden">✎</span>
        </button>

        <button
          onClick={() => deleteTask(task.id)}
          className="flex-shrink-0 text-red-500 hover:text-red-400 p-0.5"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && task.description && (
        <div className="px-8 pb-2">
          <p className="text-xs text-gray-400 font-mono">{task.description}</p>
        </div>
      )}

      {/* Dependencies panel */}
      {showDependencies && (
        <div className="mx-2 mb-2 ml-8 space-y-2 text-sm border-t border-gray-700 pt-2">
          {/* Predecessors */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-gray-400 text-xs flex items-center gap-1">&lt; PREDECESSORS</span>
              <button onClick={() => setShowAddDep({ predecessor: !showAddDep.predecessor, successor: false })} className="text-xs bg-gray-800 border border-gray-700 px-2 py-0.5 font-mono text-gray-300 hover:bg-gray-700">
                {showAddDep.predecessor ? 'CANCEL' : 'ADD'}
              </button>
            </div>
            {showAddDep.predecessor && (
              <DependencyPicker
                tasks={tasks}
                projects={projects}
                currentTask={task}
                type="predecessor"
                onAdd={(taskId, depId, depType) => {
                  addDependency(taskId, depId, depType);
                  setShowAddDep({ predecessor: false, successor: false });
                }}
                onCancel={() => setShowAddDep({ ...showAddDep, predecessor: false })}
              />
            )}
            {getPredecessorTasks().map(pred => (
              <div key={pred.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 px-2 py-0.5 mb-1 font-mono text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`truncate ${pred.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>{pred.name}</span>
                  <span className="text-blue-400 text-[10px] flex-shrink-0">[{pred.project}]</span>
                </div>
                <button onClick={() => removeDependency(task.id, pred.id, 'predecessor')} className="text-red-500 hover:text-red-400 flex-shrink-0 ml-2"><X size={12} /></button>
              </div>
            ))}
            {getPredecessorTasks().length === 0 && !showAddDep.predecessor && <p className="text-gray-600 font-mono text-xs">// none</p>}
          </div>

          {/* Successors */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-gray-400 text-xs flex items-center gap-1">&gt; SUCCESSORS</span>
              <button onClick={() => setShowAddDep({ predecessor: false, successor: !showAddDep.successor })} className="text-xs bg-gray-800 border border-gray-700 px-2 py-0.5 font-mono text-gray-300 hover:bg-gray-700">
                {showAddDep.successor ? 'CANCEL' : 'ADD'}
              </button>
            </div>
            {showAddDep.successor && (
              <DependencyPicker
                tasks={tasks}
                projects={projects}
                currentTask={task}
                type="successor"
                onAdd={(taskId, depId, depType) => {
                  addDependency(taskId, depId, depType);
                  setShowAddDep({ predecessor: false, successor: false });
                }}
                onCancel={() => setShowAddDep({ ...showAddDep, successor: false })}
              />
            )}
            {getSuccessorTasks().map(succ => (
              <div key={succ.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 px-2 py-0.5 mb-1 font-mono text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`truncate ${succ.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>{succ.name}</span>
                  <span className="text-blue-400 text-[10px] flex-shrink-0">[{succ.project}]</span>
                </div>
                <button onClick={() => removeDependency(task.id, succ.id, 'successor')} className="text-red-500 hover:text-red-400 flex-shrink-0 ml-2"><X size={12} /></button>
              </div>
            ))}
            {getSuccessorTasks().length === 0 && !showAddDep.successor && <p className="text-gray-600 font-mono text-xs">// none</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
