import React, { useState } from 'react';
import {
  Plus,
  MagnifyingGlass,
  Funnel,
  DotsThree,
  Clock,
  Flag,
  Users,
  CheckCircle,
  Circle,
  Warning,
  X
} from '@phosphor-icons/react';
import DocumentSidePanel from '../components/DocumentSidePanel';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  tags: string[];
  progress: number;
}

const priorityColors = {
  low: 'bg-surface text-t2',
  medium: 'bg-blue-100 text-accent',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600'
};

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

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Update financial reports',
    description: 'Generate Q1 financial reports and update dashboard',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Thierry',
    dueDate: '2026-04-18',
    tags: ['Finance', 'Reports'],
    progress: 65
  },
  {
    id: '2',
    title: 'Review transport routes',
    description: 'Optimize delivery routes for better efficiency',
    status: 'todo',
    priority: 'medium',
    assignee: 'Marie',
    dueDate: '2026-04-20',
    tags: ['Transport', 'Optimization'],
    progress: 0
  },
  {
    id: '3',
    title: 'Inventory audit preparation',
    description: 'Prepare documentation for quarterly inventory audit',
    status: 'review',
    priority: 'urgent',
    assignee: 'Jean',
    dueDate: '2026-04-16',
    tags: ['Inventory', 'Audit'],
    progress: 90
  },
  {
    id: '4',
    title: 'Employee onboarding system',
    description: 'Set up new employee onboarding workflow',
    status: 'completed',
    priority: 'low',
    assignee: 'Sarah',
    dueDate: '2026-04-15',
    tags: ['HR', 'System'],
    progress: 100
  },
  {
    id: '5',
    title: 'Procurement process review',
    description: 'Analyze and improve procurement approval process',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Thierry',
    dueDate: '2026-04-22',
    tags: ['Procurement', 'Process'],
    progress: 40
  },
  {
    id: '6',
    title: 'Client satisfaction survey',
    description: 'Design and distribute client satisfaction questionnaire',
    status: 'todo',
    priority: 'medium',
    assignee: 'Marie',
    dueDate: '2026-04-25',
    tags: ['Operations', 'Client'],
    progress: 0
  }
];

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFunnel, setStatusFunnel] = useState<string>('all');
  const [priorityFunnel, setPriorityFunnel] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');

  const filteredTasks = tasks.filter((task) => {
    const matchesMagnifyingGlass = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFunnel === 'all' || task.status === statusFunnel;
    const matchesPriority = priorityFunnel === 'all' || task.priority === priorityFunnel;
    return matchesMagnifyingGlass && matchesStatus && matchesPriority;
  });

  const getStatusCounts = () => {
    const counts = { todo: 0, 'in-progress': 0, review: 0, completed: 0 };
    tasks.forEach(task => counts[task.status]++);
    return counts;
  };

  const counts = getStatusCounts();

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(counts).map(([status, count]) => {
          const Icon = statusIcons[status as keyof typeof statusIcons];
          return (
            <div key={status} className="bg-card rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-t2" />
                <span className="text-2xl font-bold text-t1">{count}</span>
              </div>
              <p className="text-sm text-t2">{statusLabels[status as keyof typeof statusLabels]}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-[var(--border)] p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* MagnifyingGlass */}
          <div className="flex-1 relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t3" />
            <input
              type="text"
              placeholder="MagnifyingGlass tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-accent focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>

          {/* Status Funnel */}
          <select
            value={statusFunnel}
            onChange={(e) => setStatusFunnel(e.target.value)}
            className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm text-t2 outline-none cursor-pointer hover:bg-surface"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Funnel */}
          <select
            value={priorityFunnel}
            onChange={(e) => setPriorityFunnel(e.target.value)}
            className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm text-t2 outline-none cursor-pointer hover:bg-surface"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* View Toggle */}
          <div className="flex border border-[var(--border)] rounded-xl overflow-hidden">
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
        </div>
      </div>

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="bg-card rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-[var(--border)]">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Task</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Assignee</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Due Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider">Progress</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-t2 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-[var(--border-s)] hover:bg-surface transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm font-medium text-t1">{task.title}</p>
                        <div className="flex gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-surface text-t2 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-t2">
                        {React.createElement(statusIcons[task.status], { className: 'w-3 h-3' })}
                        {statusLabels[task.status]}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                        <Flag className="w-3 h-3 mr-1" />
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
                          {task.assignee.charAt(0)}
                        </div>
                        <span className="text-sm text-t2">{task.assignee}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-t2">{task.dueDate}</td>
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
                    <td className="py-4 px-4">
                      <button className="p-1 hover:bg-surface rounded">
                        <DotsThree className="w-4 h-4 text-t2" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Board View (Kanban) */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(['todo', 'in-progress', 'review', 'completed'] as const).map((status) => (
            <div key={status} className="bg-surface rounded-xl p-4">
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
                    <div key={task.id} className="bg-card rounded-xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-t1">{task.title}</h4>
                        <button className="p-1 hover:bg-surface rounded">
                          <DotsThree className="w-4 h-4 text-t2" />
                        </button>
                      </div>

                      <p className="text-xs text-t2 mb-3 line-clamp-2">{task.description}</p>

                      <div className="flex gap-1 mb-3">
                        {task.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-surface text-t2 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
                            {task.assignee.charAt(0)}
                          </div>
                          <span className="text-xs text-t2">{task.dueDate}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
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

      {/* ── Standardized Side Panel for Task Creation/Detail ─────────────────────────── */}
      <DocumentSidePanel
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Task Lifecycle Management"
        footerInfo={`Task system synchronized on ${new Date().toLocaleTimeString()}`}
        formContent={
          <div className="space-y-6 text-t1">
             <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Core Objectives</label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-t2 mb-1">Task Nomenclature</label>
                    <input type="text" placeholder="Specify project task name" className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-xl text-sm outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-t2 mb-1">Operational Description</label>
                    <textarea rows={3} placeholder="Define scope and deliverables" className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-xl text-sm outline-none focus:border-accent" />
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Workflow State</label>
                    <select className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-xl text-xs appearance-none outline-none focus:ring-2 focus:ring-[#1e3a8a]/10">
                      <option>To Do</option>
                      <option>In Progress</option>
                      <option>In Review</option>
                      <option>Completed</option>
                    </select>
                  </div>
                   <div>
                    <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Strategic Priority</label>
                    <select className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-xl text-xs appearance-none outline-none focus:ring-2 focus:ring-[#1e3a8a]/10">
                      <option>Low Impact</option>
                      <option>Medium Priority</option>
                      <option>High Urgency</option>
                      <option>Critical / Blocker</option>
                    </select>
                  </div>
               </div>

              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Accountability</label>
                <div className="flex items-center gap-3 p-3 bg-[var(--accent-glow)]/50 rounded-xl border border-blue-100/50">
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
        }
        previewContent={
          <div className="relative font-sans text-t1 p-2">
               {/* Document Label */}
               <div className="flex items-center gap-2 mb-12">
                  <div className="w-8 h-1 bg-accent" />
                  <span className="text-[10px] font-black uppercase text-t3 tracking-[0.3em]">Project Manifest Ref. TM-A29</span>
               </div>

               {/* Title Section */}
               <div className="mb-16">
                  <h1 className="text-5xl font-black text-t1 leading-[0.9] tracking-tighter mb-6 uppercase">Work<br/>Assignment<br/>Protocol</h1>
                  <p className="text-t3 text-sm font-medium pr-12">Authorized tasking request for the Tekaccess Engineering and Operations department.</p>
               </div>

               {/* Task ID Block */}
               <div className="mb-16 flex items-start justify-between border-y border-[var(--border-s)] py-12">
                  <div>
                    <p className="text-[10px] font-black uppercase text-t3 mb-2">Subject Matter</p>
                    <p className="text-xl font-bold italic text-accent">Waiting for definition...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-t3 mb-2">Deadline Date</p>
                    <p className="text-xl font-bold text-t1 underline underline-offset-8 decoration-2 decoration-gray-100">Set Date</p>
                  </div>
               </div>

               {/* Checklist / Requirements */}
               <div className="mb-16">
                  <p className="text-[10px] font-black uppercase text-t3 mb-6">Procedural Requirements:</p>
                  <div className="space-y-4">
                     {[1,2,3].map(i => (
                       <div key={i} className="flex items-center gap-4 opacity-10">
                          <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          <div className="h-2 w-full bg-surface rounded-full" />
                       </div>
                     ))}
                  </div>
               </div>

               {/* Authorization Seal */}
               <div className="mt-20 flex justify-between items-end border-t-2 border-gray-900 pt-12">
                  <div>
                    <p className="text-[10px] font-black uppercase text-t3 mb-2">Manifest Authority</p>
                    <p className="text-sm font-black">TEK SYSTEMS OPS.</p>
                  </div>
                  <div className="w-32 h-32 opacity-[0.05] grayscale brightness-0">
                    <CheckCircle className="w-full h-full" />
                  </div>
               </div>
          </div>
        }
      />
    </div>
  );
}
