import React, { useState } from "react";
import { X, Plus, MagnifyingGlass, Users, Buildings } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { employeesData, departmentsOverview } from "../data/employees";
import EmployeeCard from "../components/EmployeeCard";
import DocumentSidePanel from "../components/DocumentSidePanel";
import EmployeeDetail from "../components/EmployeeDetail";
import DepartmentCard from "../components/DepartmentCard";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Employees");

  const displayTabs = ["All Employees", "Departments"];

  const currentEmployee = selectedEmployee ? employeesData.find(e => e.id === selectedEmployee) : null;

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
        <div>
          <h2 className="text-2xl font-bold text-t1">Employees</h2>
          <p className="text-sm text-t3 mt-1">Manage human resources and departmental structures</p>
        </div>
        <button
          onClick={() => setShowAddEmployeeModal(true)}
          className="flex items-center px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h shadow-lg shadow-accent/20 transition-all"
        >
          <Plus size={15} weight="bold" className="mr-2" />
          Add Employee
        </button>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {displayTabs.map((subItem: string) => (
            <button
              key={subItem}
              onClick={() => setActiveTab(subItem)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === subItem
                  ? "border-accent text-accent"
                  : "border-transparent text-t3 hover:text-t2 hover:border-border"
              }`}
            >
              {subItem}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-4">
        {activeTab === "All Employees" && (
          <div className="relative">
            <MagnifyingGlass size={18} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input
              type="text"
              placeholder="Search employees by name, email, department, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
          </div>
        )}

        {activeTab === "All Employees" && (
          <>
            {filteredEmployees.length > 0 ? (
              <div className="space-y-3">
                {filteredEmployees.map((employee) => (
                  <EmployeeCard key={employee.id} employee={employee} onClick={() => setSelectedEmployee(employee.id)} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-12 flex flex-col items-center justify-center min-h-[300px]">
                <Users size={56} weight="duotone" className="text-t3 mb-4" />
                <h3 className="text-lg font-medium text-t1 mb-2">No employees found</h3>
              </div>
            )}
          </>
        )}

        {activeTab === "Departments" && (
          <>
            <div className="relative">
              <MagnifyingGlass size={18} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>

            {filteredDepartments.length > 0 ? (
              <div className="space-y-3">
                {filteredDepartments.map((dept) => (
                  <DepartmentCard key={dept.id} department={dept} onClick={() => navigate({ to: `/${dept.id}` })} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-12 flex flex-col items-center justify-center min-h-[300px]">
                <Buildings size={56} weight="duotone" className="text-t3 mb-4" />
                <h3 className="text-lg font-medium text-t1 mb-2">No departments found</h3>
              </div>
            )}
          </>
        )}
      </div>

      {/* Employee detail panel */}
      <DocumentSidePanel
        isOpen={!!currentEmployee}
        onClose={() => setSelectedEmployee(null)}
        title="Employee File"
        currentIndex={currentEmployee ? filteredEmployees.findIndex(e => e.id === currentEmployee.id) + 1 : undefined}
        totalItems={filteredEmployees.length}
        onPrev={() => {
          const idx = filteredEmployees.findIndex(e => e.id === currentEmployee?.id);
          if (idx > 0) setSelectedEmployee(filteredEmployees[idx - 1].id);
        }}
        onNext={() => {
          const idx = filteredEmployees.findIndex(e => e.id === currentEmployee?.id);
          if (idx < filteredEmployees.length - 1) setSelectedEmployee(filteredEmployees[idx + 1].id);
        }}
        footerInfo="Employment record last updated on Mar 20, 2026"
        formContent={
          currentEmployee && (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Employment Bio</label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-t3 mb-1">Full Name</label>
                    <input type="text" defaultValue={currentEmployee.fullName} className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-t1 outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-t3 mb-1">Role</label>
                      <input type="text" defaultValue={currentEmployee.role} className="w-full px-3 py-1.5 border border-border rounded-xl text-xs text-t1 bg-surface outline-none focus:border-accent transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-t3 mb-1">Department</label>
                      <select defaultValue={currentEmployee.department} className="w-full px-3 py-1.5 border border-border rounded-xl text-xs text-t1 bg-surface outline-none focus:border-accent transition-colors">
                        <option>Executive</option>
                        <option>Finance</option>
                        <option>Transport</option>
                        <option>Operations</option>
                        <option>Procurement</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Contact & Access</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-t3 mb-1">Professional Email</label>
                    <input type="email" defaultValue={currentEmployee.email} className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-t1 outline-none focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-t3 mb-1">Mobile Phone</label>
                    <input type="tel" defaultValue={currentEmployee.phone} className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-t1 outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
              </div>
              <div className="pt-6">
                <button className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-h shadow-lg shadow-accent/20 transition-all">
                  Save Record Changes
                </button>
              </div>
            </div>
          )
        }
        previewContent={
          currentEmployee && (
            <div className="relative font-sans text-gray-900">
              <div className="flex flex-col items-center text-center mb-16 border-b border-dashed border-gray-200 pb-12">
                <div className="w-32 h-32 rounded-full ring-8 ring-gray-50 bg-accent flex items-center justify-center text-white text-5xl font-black mb-6 shadow-2xl relative">
                  {currentEmployee.fullName.split(' ').map(n => n[0]).join('')}
                  <div className="absolute right-0 bottom-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">{currentEmployee.fullName}</h1>
                <p className="text-sm font-bold text-[#4285f4] mt-1">{currentEmployee.role.toUpperCase()}</p>
                <p className="text-[10px] font-black text-gray-400 mt-2 tracking-[0.3em] uppercase">{currentEmployee.department} DIVISION</p>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 mb-16">
                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Personal Data</label>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-xs text-gray-400">Date of Birth</span>
                      <span className="text-sm font-bold">{new Date(currentEmployee.personalInfo.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-xs text-gray-400">Citizenship</span>
                      <span className="text-sm font-bold">Rwanda</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Contract Info</label>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-xs text-gray-400">Employment Type</span>
                      <span className="text-sm font-bold capitalize">{currentEmployee.contract.type}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-xs text-gray-400">Join Date</span>
                      <span className="text-sm font-bold">{new Date(currentEmployee.contract.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-[#4285f4]/5 rounded-2xl border border-[#4285f4]/10">
                <label className="block text-[10px] text-[#4285f4] font-black uppercase tracking-widest mb-4">Emergency Contact Protocol</label>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{currentEmployee.personalInfo.emergencyContact}</p>
                    <p className="text-xs text-gray-500">Legal Guardian / Primary Contact</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#4285f4]">{currentEmployee.personalInfo.emergencyPhone}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      />

      {/* Add Employee panel */}
      <DocumentSidePanel
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        title="Onboarding New Employee"
        formContent={
          <div className="p-2 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-t3 uppercase mb-2">Full Identity</label>
                <input type="text" placeholder="First and last names" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase mb-2">Division</label>
                  <select className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-t1 outline-none focus:border-accent transition-colors">
                    <option>Operations</option>
                    <option>Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase mb-2">Role Tier</label>
                  <input type="text" placeholder="Job Title" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black text-t3 uppercase mb-2">Professional Email</label>
              <input type="email" placeholder="email@tekaccess.rw" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
            </div>
            <div className="pt-6">
              <button className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all">
                Initialize Onboarding
              </button>
            </div>
          </div>
        }
        previewContent={
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center mb-8 border-4 border-dashed border-gray-200">
              <Users size={56} weight="duotone" className="text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Drafting New Employee File</h3>
            <p className="text-sm text-gray-400 max-w-[300px]">Complete the form on the left to generate the digital onboarding manifest.</p>
          </div>
        }
      />
    </div>
  );
}
