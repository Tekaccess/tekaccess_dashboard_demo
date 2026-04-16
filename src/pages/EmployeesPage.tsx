import React, { useState } from "react";
import { X, Plus, Search, Users, Building } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { employeesData, departmentsOverview } from "../data/employees";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeDetail from "../components/EmployeeDetail";
import DepartmentCard from "../components/DepartmentCard";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Employees");

  const displayTabs = ["All Employees", "Departments"];

  const handleAddEmployeeClick = () => {
    setShowAddEmployeeModal(true);
  };

  if (selectedEmployee) {
    const employee = employeesData.find((e) => e.id === selectedEmployee);
    if (employee) {
      return (
        <EmployeeDetail
          employee={employee}
          onBack={() => setSelectedEmployee(null)}
        />
      );
    }
  }

  const filteredEmployees = employeesData.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredDepartments = departmentsOverview.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.manager.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
        <button
          onClick={handleAddEmployeeClick}
          className="flex items-center px-4 py-2 bg-[#4A4B4D] text-white rounded-md text-sm font-medium hover:bg-[#3a3b3d]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {displayTabs.map((subItem: string) => (
            <button
              key={subItem}
              onClick={() => setActiveTab(subItem)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === subItem
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {subItem}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-4">
        {activeTab === "All Employees" && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search employees by name, email, department, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {activeTab === "All Employees" && (
          <>
            {filteredEmployees.length > 0 ? (
              <div className="space-y-3">
                {filteredEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    onClick={() => setSelectedEmployee(employee.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[300px]">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No employees found
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Get started by adding your first employee"}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "Departments" && (
          <>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search departments by name, manager, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {filteredDepartments.length > 0 ? (
              <div className="space-y-3">
                {filteredDepartments.map((dept) => (
                  <DepartmentCard
                    key={dept.id}
                    department={dept}
                    onClick={() => navigate({ to: `/${dept.id}` })}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[300px]">
                <Building className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No departments found
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "No departments available"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {showAddEmployeeModal && (
        <div
          className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddEmployeeModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Employee
              </h3>
              <button
                 onClick={() => setShowAddEmployeeModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>Select department</option>
                  <option>Executive</option>
                  <option>Finance</option>
                  <option>Transport</option>
                  <option>Operations</option>
                  <option>Inventory</option>
                  <option>Procurement</option>
                  <option>Data Team</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  placeholder="Enter role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2 bg-[#4A4B4D] text-white rounded-md text-sm font-medium hover:bg-[#3a3b3d]"
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
