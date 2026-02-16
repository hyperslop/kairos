import React from 'react';
import { Trash2 } from 'lucide-react';
import TaskItem from './TaskItem';

const UndatedView = ({
  projects,
  undatedByProject,
  expandedProjects,
  toggleProjectExpansion,
  expandAll,
  collapseAll,
  showAddProject,
  setShowAddProject,
  newProject,
  setNewProject,
  addProject,
  setShowDeleteProjectConfirm,
  tasks,
  toggleTask,
  deleteTask,
  addDependency,
  removeDependency,
  updateTask,
  editingTask,
  startEditTask,
  saveEditTask,
  setEditingTask
}) => {
  return (
    <div className="border border-gray-700 bg-gray-800 p-2 md:p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h2 className="text-base md:text-xl font-mono font-bold">UNDATED_TASKS</h2>
        <div className="flex gap-1 md:gap-2 flex-wrap">
          <button onClick={expandAll} className="text-xs md:text-sm bg-gray-700 border border-gray-600 text-gray-300 px-2 md:px-3 py-1 font-mono hover:bg-gray-600">[+] EXPAND</button>
          <button onClick={collapseAll} className="text-xs md:text-sm bg-gray-700 border border-gray-600 text-gray-300 px-2 md:px-3 py-1 font-mono hover:bg-gray-600">[-] COLLAPSE</button>
          <button onClick={() => setShowAddProject(!showAddProject)} className="text-xs md:text-sm bg-gray-700 border border-gray-600 text-gray-300 px-2 md:px-3 py-1 font-mono hover:bg-gray-600">
            {showAddProject ? '[-] CANCEL' : '[+] PROJECT'}
          </button>
        </div>
      </div>

      {showAddProject && (
        <div className="mb-4 flex gap-2">
          <input type="text" value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="project_name" className="flex-1 border border-gray-600 bg-gray-900 text-white px-3 py-2 font-mono" />
          <button onClick={addProject} className="bg-green-700 border border-green-600 text-white px-4 py-2 font-mono hover:bg-green-600">ADD</button>
        </div>
      )}

      <div className="space-y-3">
        {projects.map(project => {
          const projectTasks = undatedByProject[project];
          const canDelete = project !== 'Personal';
          return (
            <div key={project} className="border border-gray-700 bg-gray-900">
              <div className="flex items-center justify-between p-3 hover:bg-gray-800">
                <button onClick={() => toggleProjectExpansion(project)} className="flex items-center gap-2 font-mono flex-1">
                  {expandedProjects[project] ? '[-]' : '[+]'}
                  <span className="font-bold">{project}</span>
                  <span className="text-sm text-gray-500">({projectTasks.length})</span>
                </button>
                {canDelete && (
                  <button onClick={() => setShowDeleteProjectConfirm(project)} className="text-red-500 hover:text-red-400 ml-2" title="Delete project">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              {expandedProjects[project] && (
                <div className="p-3 pt-0 space-y-0 border-t border-gray-700">
                  {projectTasks.length === 0 ? (
                    <p className="text-gray-500 font-mono text-sm">// no undated tasks</p>
                  ) : (
                    projectTasks.map((task, idx) => (
                      <TaskItem key={task.id} task={task} tasks={tasks} projects={projects} toggleTask={toggleTask} deleteTask={deleteTask} addDependency={addDependency} removeDependency={removeDependency} updateTask={updateTask} editingTask={editingTask} startEditTask={startEditTask} saveEditTask={saveEditTask} setEditingTask={setEditingTask} showDate={true} index={idx} />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UndatedView;
