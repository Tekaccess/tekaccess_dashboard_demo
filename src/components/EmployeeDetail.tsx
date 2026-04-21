import React from 'react';
import { ArrowLeft, Envelope, Phone, Briefcase, User, Warning, CheckCircle, Target } from '@phosphor-icons/react';
import { Employee } from '../data/employees';

interface EmployeeDetailProps {
  employee: Employee;
  onBack: () => void;
}

const kpiStatusIcons = {
  'on-track': <CheckCircle size={20} weight="duotone" className="text-emerald-500" />,
  'at-risk': <Warning size={20} weight="duotone" className="text-amber-500" />,
  'behind': <Warning size={20} weight="duotone" className="text-red-500" />,
};

const kpiStatusColors = {
  'on-track': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  'at-risk': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  'behind': 'text-red-500 bg-red-500/10 border-red-500/20',
};

export default function EmployeeDetail({ employee, onBack }: EmployeeDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="flex items-center text-t2 hover:text-t1 transition-colors">
          <ArrowLeft size={18} weight="bold" className="mr-2" />
          Back to Employees
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="h-20 w-20 rounded-2xl bg-accent-glow border border-accent-border flex items-center justify-center text-accent font-bold text-2xl">
            {employee.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-t1">{employee.fullName}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                employee.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface text-t3'
              }`}>
                {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
              </span>
            </div>
            <p className="text-t2">{employee.role} • {employee.department}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-t2">
              <div className="flex items-center">
                <Envelope size={14} weight="duotone" className="mr-1.5 text-t3" />
                {employee.email}
              </div>
              <div className="flex items-center">
                <Phone size={14} weight="duotone" className="mr-1.5 text-t3" />
                {employee.phone}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-t1 mb-4 flex items-center">
            <User size={18} weight="duotone" className="mr-2 text-t3" />
            Personal Information
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Employee ID', value: employee.id },
              { label: 'Date of Birth', value: new Date(employee.personalInfo.dateOfBirth).toLocaleDateString() },
              { label: 'Address', value: employee.personalInfo.address },
              { label: 'Emergency Contact', value: employee.personalInfo.emergencyContact },
              { label: 'Emergency Phone', value: employee.personalInfo.emergencyPhone },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className={`flex justify-between py-2 ${i < arr.length - 1 ? 'border-b border-border-s' : ''}`}>
                <span className="text-sm text-t2">{label}</span>
                <span className="text-sm font-medium text-t1">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-t1 mb-4 flex items-center">
            <Briefcase size={18} weight="duotone" className="mr-2 text-t3" />
            Contract Details
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Contract Type', value: employee.contract.type },
              { label: 'Start Date', value: new Date(employee.contract.startDate).toLocaleDateString() },
              { label: 'End Date', value: employee.contract.endDate ? new Date(employee.contract.endDate).toLocaleDateString() : 'Ongoing' },
              { label: 'Department', value: employee.department },
              { label: 'Salary', value: employee.contract.salary },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className={`flex justify-between py-2 ${i < arr.length - 1 ? 'border-b border-border-s' : ''}`}>
                <span className="text-sm text-t2">{label}</span>
                <span className="text-sm font-medium text-t1 capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-t1 mb-4 flex items-center">
          <Target size={18} weight="duotone" className="mr-2 text-t3" />
          Key Performance Indicators
        </h3>
        <div className="space-y-4">
          {employee.kpis.map((kpi, idx) => (
            <div key={idx} className={`border rounded-xl p-4 ${kpiStatusColors[kpi.status]}`}>
              <div className="flex items-start space-x-3 flex-1">
                {kpiStatusIcons[kpi.status]}
                <div className="flex-1">
                  <h4 className="font-semibold text-t1">{kpi.metric}</h4>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Target', value: kpi.target },
                      { label: 'Actual', value: kpi.actual },
                      { label: 'Status', value: kpi.status.replace('-', ' ') },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs opacity-75">{label}</p>
                        <p className="text-sm font-semibold capitalize">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 w-full bg-border rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        kpi.status === 'on-track' ? 'bg-emerald-500' :
                        kpi.status === 'at-risk' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((parseFloat(kpi.actual) / parseFloat(kpi.target)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
