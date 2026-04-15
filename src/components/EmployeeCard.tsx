import React from "react";
import { Mail, Phone, Building, Briefcase } from "lucide-react";
import { Employee } from "../data/employees";

interface EmployeeCardProps {
  employee: Employee;
  onClick: () => void;
  key?: string;
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const statusColors = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    "on-leave": "bg-yellow-100 text-yellow-700",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="h-12 w-12 rounded-full bg-[#1e1b4b] flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {employee.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {employee.fullName}
            </h3>
            <p className="text-sm text-gray-500">{employee.role}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span>{employee.phone}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Building className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span>{employee.department}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2 ml-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[employee.status]}`}
          >
            {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Briefcase className="w-3 h-3 mr-1" />
            {employee.contract.type}
          </span>
        </div>
      </div>
    </button>
  );
}
