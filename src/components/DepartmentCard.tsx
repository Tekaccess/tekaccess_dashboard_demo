import React from 'react';
import { Users, DollarSign, User } from 'lucide-react';
import { DepartmentOverview } from '../data/employees';

interface DepartmentCardProps {
  key?: React.Key;
  department: DepartmentOverview;
  onClick: () => void;
}

export default function DepartmentCard({ department, onClick }: DepartmentCardProps) {
  const statusColors = {
    'active': 'bg-green-100 text-green-700',
    'restructuring': 'bg-yellow-100 text-yellow-700',
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-bold text-lg text-gray-900">{department.name}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[department.status]}`}>
              {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{department.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center text-sm">
              <User className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Manager</p>
                <p className="font-medium text-gray-900">{department.manager}</p>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <Users className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Employees</p>
                <p className="font-medium text-gray-900">{department.employeeCount}</p>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <DollarSign className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="font-medium text-gray-900">{department.budget}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
