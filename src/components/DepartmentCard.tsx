import React from 'react';
import { Users, CurrencyDollar, User } from '@phosphor-icons/react';
import { DepartmentOverview } from '../data/employees';

interface DepartmentCardProps {
  key?: React.Key;
  department: DepartmentOverview;
  onClick: () => void;
}

export default function DepartmentCard({ department, onClick }: DepartmentCardProps) {
  const statusColors = {
    'active': 'bg-emerald-500/10 text-emerald-500',
    'restructuring': 'bg-amber-500/10 text-amber-500',
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent-border)] hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-bold text-lg text-t1">{department.name}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[department.status]}`}>
              {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-t2 mb-3">{department.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { Icon: User, label: 'Manager', value: department.manager },
              { Icon: Users, label: 'Employees', value: String(department.employeeCount) },
              { Icon: CurrencyDollar, label: 'Budget', value: department.budget },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center text-sm">
                <Icon size={14} weight="duotone" className="mr-2 text-t3 flex-shrink-0" />
                <div>
                  <p className="text-xs text-t3">{label}</p>
                  <p className="font-medium text-t1">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
