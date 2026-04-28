import React, { useState } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus,
  MagnifyingGlass,
  Funnel,
  DotsThree,
  Clock,
  Users,
  CheckCircle,
  Circle,
  Warning,
  X
} from '@phosphor-icons/react';
import ColumnSelector, { useColumnVisibility, ColDef } from '../components/ui/ColumnSelector';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  assignee: string;
  dueDate: string;
  progress: number;
}

const statusLabels = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'In Review',
  completed: 'Completed'
};

const statusIcons = {
  todo: Circle,
  'in-progress': Clock,
  review: Warning,
  completed: CheckCircle
};

const TASK_COLS: ColDef[] = [
  { key: 'task',     label: 'Task',     defaultVisible: true },
  { key: 'status',   label: 'Status',   defaultVisible: true },
  { key: 'assignee', label: 'Assignee', defaultVisible: true },
  { key: 'due',      label: 'Due Date', defaultVisible: true },
  { key: 'progress', label: 'Progress', defaultVisible: true },
  { key: 'actions',  label: 'Actions',  defaultVisible: true },
];

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Update financial reports',
    description: 'Generate Q1 financial reports and update dashboard',
    status: 'in-progress',
    assignee: 'Thierry',
    dueDate: '2026-04-18',
    progress: 65
  },
  {
    id: '2',
    title: 'Review transport routes',
    description: 'Optimize delivery routes for better efficiency',
    status: 'todo',
    assignee: 'Marie',
    dueDate: '2026-04-20',
    progress: 0
  },
  {
    id: '3',
    title: 'Inventory audit preparation',
    description: 'Prepare documentation for quarterly inventory audit',
    status: 'review',
    assignee: 'Jean',
    dueDate: '2026-04-16',
    progress: 90
  },
  {
    id: '4',
    title: 'Employee onboarding system',
    description: 'Set up new employee onboarding workflow',
    status: 'completed',
    assignee: 'Sarah',
    dueDate: '2026-04-15',
    progress: 100
  },
  {
    id: '5',
    title: 'Procurement process review',
    description: 'Analyze and improve procurement approval process',
    status: 'in-progress',
    assignee: 'Thierry',
    dueDate: '2026-04-22',
    progress: 40
  },
  {
    id: '6',
    title: 'Client satisfaction survey',
    description: 'Design and distribute client satisfaction questionnaire',
    status: 'todo',
    assignee: 'Marie',
    dueDate: '2026-04-25',
    progress: 0
  }
];

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFunnel, setStatusFunnel] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('task-management', TASK_COLS);

  const filteredTasks = tasks.filter((task) => {
    const matchesMagnifyingGlass = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFunnel === 'all' || task.status === statusFunnel;
    return matchesMagnifyingGlass && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-t1">Task Management</h2>
          <p className="text-sm text-t2 mt-1">Track and manage your team's tasks</p>
        </div>
        <button
          onClick={() => setShowTaskModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* MagnifyingGlass */}
          <div className="flex-1 relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t3" />
            <input
              type="text"
              placeholder="MagnifyingGlass tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm outline-none focus:border-accent focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>

          {/* Status Funnel */}
          <select
            value={statusFunnel}
            onChange={(e) => setStatusFunnel(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl text-sm text-t2 outline-none cursor-pointer hover:bg-surface"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
          </select>

          {/* View Toggle */}
          <div className="flex border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-accent text-white' : 'bg-card text-t2'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-2 text-sm ${viewMode === 'board' ? 'bg-accent text-white' : 'bg-card text-t2'}`}
            >
              Board
            </button>
          </div>

          {viewMode === 'list' && <ColumnSelector cols={TASK_COLS} visible={colVis} onToggle={colToggle} />}
        </div>
      </div>

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <OverlayScrollbarsComponent
            options={{ scrollbars: { autoHide: 'never' } }}
            defer
          >
            <table className="w-full">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {colVis.has('task') && <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Task</th>}
                  {colVis.has('status') && <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Status</th>}
                  {colVis.has('assignee') && <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Assignee</th>}
                  {colVis.has('due') && <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Due Date</th>}
                  {colVis.has('progress') && <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Progress</th>}
                  {colVis.has('actions') && <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-border-s hover:bg-surface transition-colors">
                    {colVis.has('task') && (
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-t1">{task.title}</p>
                      </td>
                    )}
                    {colVis.has('status') && (
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-t2">
                          {React.createElement(statusIcons[task.status], { className: 'w-3 h-3' })}
                          {statusLabels[task.status]}
                        </span>
                      </td>
                    )}
                    {colVis.has('assignee') && (
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
                            {task.assignee.charAt(0)}
                          </div>
                          <span className="text-sm text-t2">{task.assignee}</span>
                        </div>
                      </td>
                    )}
                    {colVis.has('due') && <td className="py-4 px-4 text-sm text-t2">{task.dueDate}</td>}
                    {colVis.has('progress') && (
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface-hover rounded-full h-2">
                            <div
                              className="bg-accent h-2 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-t2">{task.progress}%</span>
                        </div>
                      </td>
                    )}
                    {colVis.has('actions') && (
                      <td className="py-4 px-4">
                        <button className="p-1 hover:bg-surface rounded">
                          <DotsThree className="w-4 h-4 text-t2" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </OverlayScrollbarsComponent>
        </div>
      )}

      {/* Task Board View (Kanban) */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(['todo', 'in-progress', 'review', 'completed'] as const).map((status) => (
            <div key={status}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-t1 flex items-center gap-2">
                  {React.createElement(statusIcons[status], { className: 'w-4 h-4' })}
                  {statusLabels[status]}
                </h3>
                <span className="text-xs text-t2 bg-card px-2 py-1 rounded-full">
                  {filteredTasks.filter(t => t.status === status).length}
                </span>
              </div>

              <div className="space-y-3">
                {filteredTasks
                  .filter(task => task.status === status)
                  .map((task) => (
                    <div key={task.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-t1">{task.title}</h4>
                      </div>

                      <p className="text-xs text-t2 mb-3 line-clamp-2">{task.description}</p>

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
                          {task.assignee.charAt(0)}
                        </div>
                        <span className="text-xs text-t2">{task.dueDate}</span>
                      </div>

                      {status !== 'completed' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-t2">Progress</span>
                            <span className="text-xs text-t2">{task.progress}%</span>
                          </div>
                          <div className="bg-surface-hover rounded-full h-1.5">
                            <div
                              className="bg-accent h-1.5 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Task Side Panel ──────────────────────────────────────────────── */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTaskModal(false)}
          />
          <div className="relative w-full max-w-md bg-card h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="text-sm font-medium text-t2">Task Lifecycle Management</div>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-emerald-500 hover:text-emerald-400 text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
            <OverlayScrollbarsComponent
              className="flex-1 p-6"
              options={{ scrollbars: { autoHide: 'never' } }}
              defer
            >
              <div className="space-y-6 text-t1">
                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Core Objectives</label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-t2 mb-1">Task Nomenclature</label>
                      <input type="text" placeholder="Specify project task name" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-t2 mb-1">Operational Description</label>
                      <textarea rows={3} placeholder="Define scope and deliverables" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none focus:border-accent" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Workflow State</label>
                  <select className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs appearance-none outline-none focus:ring-2 focus:ring-[#1e3a8a]/10">
                    <option>To Do</option>
                    <option>In Progress</option>
                    <option>In Review</option>
                    <option>Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Accountability</label>
                  <div className="flex items-center gap-3 p-3 bg-accent-glow/50 rounded-xl border border-blue-100/50">
                    <div className="p-2 bg-card rounded-xl shadow-sm"><Users className="w-4 h-4 text-accent" /></div>
                    <div className="flex-1">
                      <p className="text-[10px] text-t3 uppercase font-black">Assignee</p>
                      <input type="text" placeholder="Select team member" className="w-full bg-transparent border-none p-0 text-sm font-bold text-t1 outline-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-h shadow-lg shadow-[#1e3a8a]/20 transition-all active:scale-[0.98]">
                    Initialize Task Assignment
                  </button>
                </div>
              </div>
            </OverlayScrollbarsComponent>
            <div className="p-4 border-t border-border-s text-[11px] text-t3 italic">
              Task system synchronized on {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
