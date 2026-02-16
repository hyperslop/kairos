import React from 'react';

const DeleteProjectModal = ({ projectName, onDelete, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-gray-800 border-2 border-red-600 p-6 max-w-md">
      <h3 className="text-lg font-mono font-bold text-red-400 mb-4">DELETE PROJECT?</h3>
      <p className="text-gray-300 font-mono text-sm mb-4">Delete project "{projectName}"? All tasks will be moved to "Personal".</p>
      <div className="flex gap-2">
        <button onClick={() => onDelete(projectName)} className="flex-1 bg-red-700 border border-red-600 text-white px-4 py-2 font-mono hover:bg-red-600">DELETE</button>
        <button onClick={onCancel} className="flex-1 bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 font-mono hover:bg-gray-600">CANCEL</button>
      </div>
    </div>
  </div>
);

const DeleteRecurringModal = ({ onDeleteInstance, onDeleteAll, onCancel, taskId }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-gray-800 border-2 border-red-600 p-6 max-w-md">
      <h3 className="text-lg font-mono font-bold text-red-400 mb-4">DELETE RECURRING TASK?</h3>
      <p className="text-gray-300 font-mono text-sm mb-4">This is a recurring task. What would you like to delete?</p>
      <div className="space-y-2">
        <button onClick={() => onDeleteInstance(taskId)} className="w-full bg-orange-700 border border-orange-600 text-white px-4 py-2 font-mono hover:bg-orange-600">DELETE THIS INSTANCE ONLY</button>
        <button onClick={() => onDeleteAll(taskId)} className="w-full bg-red-700 border border-red-600 text-white px-4 py-2 font-mono hover:bg-red-600">DELETE ALL FUTURE INSTANCES</button>
        <button onClick={onCancel} className="w-full bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 font-mono hover:bg-gray-600">CANCEL</button>
      </div>
    </div>
  </div>
);

export { DeleteProjectModal, DeleteRecurringModal };
