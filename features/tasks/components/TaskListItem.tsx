import { CheckSquare, Clock, FileText, Upload } from 'lucide-react';
import React from 'react';
import type { DocumentRecord, Task } from '../../../types';

interface TaskListItemProps {
  task: Task;
  userDocuments: DocumentRecord[];
  onComplete: () => void;
  onUpload: (file: File) => void;
  onViewDocument: (doc: DocumentRecord) => void;
}

/**
 * TaskListItem - Single task display in list
 *
 * Pure UI component - receives all data via props
 * No direct API calls or state management
 */
const TaskListItem: React.FC<TaskListItemProps> = ({
  task,
  userDocuments,
  onComplete,
  onUpload,
  onViewDocument
}) => {
  const isDocumentTask = task.task_type === 'document_upload';

  // Find matching document if this is a document upload task
  const matchingDoc = isDocumentTask && task.requiredDocType
    ? userDocuments.find(doc =>
        doc.type === task.requiredDocType &&
        doc.project_id === task.project_id
      )
    : null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div className="p-6 hover:bg-slate-50/50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          isDocumentTask
            ? 'bg-amber-50 text-amber-600'
            : 'bg-blue-50 text-blue-600'
        }`}>
          {isDocumentTask ? <FileText size={20} /> : <CheckSquare size={20} />}
        </div>

        <div>
          <h3 className="font-bold text-slate-900">{task.title}</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {task.description || 'No description provided.'}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {task.project_id === 'personal' ? 'Personal' : 'Project Task'}
            </span>

            {task.dueDate && (
              <span className={`text-[10px] font-bold flex items-center gap-1 ${
                isOverdue ? 'text-red-500' : 'text-slate-400'
              }`}>
                <Clock size={10} />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-auto">
        {matchingDoc ? (
          <button
            onClick={() => onViewDocument(matchingDoc)}
            className="flex items-center gap-2 bg-slate-100 text-slate-800 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
          >
            <FileText size={14} /> View Document
          </button>
        ) : isDocumentTask ? (
          <label className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-700 transition-all shadow-sm cursor-pointer">
            <Upload size={14} /> Upload Document
            <input
              type="file"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </label>
        ) : (
          <button
            onClick={onComplete}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-sm"
          >
            <CheckSquare size={14} /> Complete
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskListItem;
