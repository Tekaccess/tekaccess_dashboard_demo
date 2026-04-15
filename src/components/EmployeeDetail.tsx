import React from 'react';
import { ArrowLeft, Mail, Phone, Briefcase, User, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { Employee } from '../data/employees';

interface EmployeeDetailProps {
  employee: Employee;
  onBack: () => void;
}

const kpiStatusIcons = {
  'on-track': <CheckCircle className="w-5 h-5 text-green-500" />,
  'at-risk': <AlertCircle className="w-5 h-5 text-yellow-500" />,
  'behind': <AlertCircle className="w-5 h-5 text-red-500" />,
};

const kpiStatusColors = {
  'on-track': 'text-green-700 bg-green-50 border-green-200',
  'at-risk': 'text-yellow-700 bg-yellow-50 border-yellow-200',
  'behind': 'text-red-700 bg-red-50 border-red-200',
};

export default function EmployeeDetail({ employee, onBack }: EmployeeDetailProps) {
  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Employees
        </button>
      </div>

      {/* Employee Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="h-20 w-20 rounded-full bg-[#1e1b4b] flex items-center justify-center text-white font-bold text-2xl">
            {employee.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">{employee.fullName}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600">{employee.role} • {employee.department}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-1.5 text-gray-400" />
                {employee.email}
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-1.5 text-gray-400" />
                {employee.phone}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info & Contract */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-600" />
            Personal Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Employee ID</span>
              <span className="text-sm font-medium text-gray-900">{employee.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Date of Birth</span>
              <span className="text-sm font-medium text-gray-900">{new Date(employee.personalInfo.dateOfBirth).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Address</span>
              <span className="text-sm font-medium text-gray-900">{employee.personalInfo.address}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Emergency Contact</span>
              <span className="text-sm font-medium text-gray-900">{employee.personalInfo.emergencyContact}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Emergency Phone</span>
              <span className="text-sm font-medium text-gray-900">{employee.personalInfo.emergencyPhone}</span>
            </div>
          </div>
        </div>

        {/* Contract Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-gray-600" />
            Contract Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Contract Type</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{employee.contract.type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Start Date</span>
              <span className="text-sm font-medium text-gray-900">{new Date(employee.contract.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">End Date</span>
              <span className="text-sm font-medium text-gray-900">{employee.contract.endDate ? new Date(employee.contract.endDate).toLocaleDateString() : 'Ongoing'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Department</span>
              <span className="text-sm font-medium text-gray-900">{employee.department}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Salary</span>
              <span className="text-sm font-medium text-gray-900">{employee.contract.salary}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-gray-600" />
          Key Performance Indicators
        </h3>
        <div className="space-y-4">
          {employee.kpis.map((kpi, idx) => (
            <div key={idx} className={`border rounded-lg p-4 ${kpiStatusColors[kpi.status]}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {kpiStatusIcons[kpi.status]}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{kpi.metric}</h4>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs opacity-75">Target</p>
                        <p className="text-sm font-semibold">{kpi.target}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">Actual</p>
                        <p className="text-sm font-semibold">{kpi.actual}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">Status</p>
                        <p className="text-sm font-semibold capitalize">{kpi.status.replace('-', ' ')}</p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          kpi.status === 'on-track' ? 'bg-green-500' :
                          kpi.status === 'at-risk' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((parseFloat(kpi.actual) / parseFloat(kpi.target)) * 100, 100)}%` }}
                      ></div>
                    </div>
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
