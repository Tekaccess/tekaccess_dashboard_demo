import React, { useState, useEffect } from "react";
import { X, Plus, Search, Users, Building } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { departmentsData } from "../data/navigation";
import { employeesData, departmentsOverview } from "../data/employees";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeDetail from "../components/EmployeeDetail";
import DepartmentCard from "../components/DepartmentCard";
import DocumentSidePanel from "../components/DocumentSidePanel";

export default function SectionPage({
  departmentId,
  sectionId,
}: {
  departmentId: string;
  sectionId: string;
}) {
  const navigate = useNavigate();
  const department = departmentsData.find((d) => d.id === departmentId);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Find the specific item (e.g., "Receivables")
  let sectionItem: any = null;
  department?.sections.forEach((sec) => {
    const found = sec.items.find(
      (item) => item.name.toLowerCase().replace(/\s+/g, "-") === sectionId,
    );
    if (found) sectionItem = found;
  });

  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (sectionItem?.subItems?.length > 0) {
      // Filter out "Add Employee" from tabs
      const filteredTabs = sectionItem.subItems.filter(
        (item: string) => item !== "Add Employee",
      );
      setActiveTab(filteredTabs[0] || "");
    }
  }, [sectionItem]);

  const handleAddEmployeeClick = () => {
    setShowAddEmployeeModal(true);
  };

  if (!sectionItem) {
    return <div className="p-6">Section not found</div>;
  }

  // Filter out "Add Employee" from the tabs list
  const displayTabs = (sectionItem.subItems || []).filter(
    (item: string) => item !== "Add Employee",
  );

  // Show employee detail view if an employee is selected
  if (selectedEmployee && sectionItem.name === "Employees") {
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

  // Filter employees based on search
  const filteredEmployees = employeesData.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filter departments based on search
  const filteredDepartments = departmentsOverview.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.manager.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{sectionItem.name}</h2>
        {sectionItem.name === "Employees" && (
          <button
            onClick={handleAddEmployeeClick}
            className="flex items-center px-4 py-2 bg-[#4A4B4D] text-white rounded-md text-sm font-medium hover:bg-[#3a3b3d]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        )}
      </div>

      {/* Sub-item Tabs */}
      {displayTabs.length > 0 && (
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
      )}

      {/* Content Area */}
      {sectionItem.name === "Employees" ? (
        <div className="space-y-4">
          {/* Search Bar */}
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
              {/* Employee List */}
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
              {/* Search Bar */}
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

              {/* Department List */}
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
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 border border-gray-100">
              <sectionItem.icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab || sectionItem.name}
            </h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              This is the {activeTab || sectionItem.name} component view. Data
              tables and charts for this specific section will be rendered here.
            </p>
          </div>
        </div>
      )}

      {/* ── Standardized Side Panel (Unified HR UX) ───────────────────────────── */}
      <DocumentSidePanel
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        title="Employee Onboarding"
        footerInfo="Departmental synchronization active"
        formContent={
          <div className="p-2 space-y-6">
            <div className="space-y-4">
               <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase mb-2">Full Identity</label>
                  <input type="text" placeholder="First and last names" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase mb-2">Division</label>
                    <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1e3a8a]">
                      <option>Operations</option>
                      <option>Finance</option>
                      <option>Procurement</option>
                      <option>Transport</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase mb-2">Role Tier</label>
                    <input type="text" placeholder="Job Title" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1e3a8a]" />
                  </div>
               </div>
            </div>
            <div className="space-y-4">
               <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase mb-2">Professional Email</label>
                  <input type="email" placeholder="email@tekaccess.rw" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]" />
               </div>
            </div>
            <div className="pt-6">
              <button className="w-full py-3 bg-[#1e3a8a] text-white rounded-xl text-sm font-bold shadow-xl shadow-[#1e3a8a]/20">Initialize Onboarding</button>
            </div>
          </div>
        }
        previewContent={
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
             <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center mb-8 border-4 border-dashed border-gray-200">
                <Users className="w-16 h-16 text-gray-200" />
             </div>
             <h3 className="text-xl font-black text-gray-900 mb-2 whitespace-nowrap">Drafting New Employee File</h3>
             <p className="text-sm text-gray-400 max-w-[300px]">Complete the form on the left to generate the digital onboarding manifest for this department.</p>
          </div>
        }
      />
    </div>
  );
}
