import React, { useState, useEffect } from "react";
import { Plus, MagnifyingGlass, Users, Buildings } from "@phosphor-icons/react";
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
      const filteredTabs = sectionItem.subItems.filter((item: string) => item !== "Add Employee");
      setActiveTab(filteredTabs[0] || "");
    }
  }, [sectionItem]);

  if (!sectionItem) {
    return <div className="p-6 text-t2">Section not found</div>;
  }

  const displayTabs = (sectionItem.subItems || []).filter((item: string) => item !== "Add Employee");

  if (selectedEmployee && sectionItem.name === "Employees") {
    const employee = employeesData.find((e) => e.id === selectedEmployee);
    if (employee) {
      return <EmployeeDetail employee={employee} onBack={() => setSelectedEmployee(null)} />;
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
        <h2 className="text-2xl font-bold text-t1">{sectionItem.name}</h2>
        {sectionItem.name === "Employees" && (
          <button
            onClick={() => setShowAddEmployeeModal(true)}
            className="flex items-center px-4 py-2 bg-surface border border-[var(--border)] text-t1 rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            <Plus size={15} weight="bold" className="mr-2" />
            Add Employee
          </button>
        )}
      </div>

      {/* Tabs */}
      {displayTabs.length > 0 && (
        <div className="border-b border-[var(--border)]">
          <nav className="-mb-px flex space-x-8">
            {displayTabs.map((subItem: string) => (
              <button
                key={subItem}
                onClick={() => setActiveTab(subItem)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === subItem
                    ? "border-accent text-accent"
                    : "border-transparent text-t3 hover:text-t2 hover:border-[var(--border)]"
                }`}
              >
                {subItem}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      {sectionItem.name === "Employees" ? (
        <div className="space-y-4">
          {activeTab === "All Employees" && (
            <div className="relative">
              <MagnifyingGlass size={18} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input
                type="text"
                placeholder="Search employees by name, email, department, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-surface text-t1 placeholder-[var(--text-3)] focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>
          )}

          {activeTab === "All Employees" && (
            filteredEmployees.length > 0 ? (
              <div className="space-y-3">
                {filteredEmployees.map((employee) => (
                  <EmployeeCard key={employee.id} employee={employee} onClick={() => setSelectedEmployee(employee.id)} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-[var(--border)] p-12 flex flex-col items-center justify-center min-h-[300px]">
                <Users size={56} weight="duotone" className="text-t3 mb-4" />
                <h3 className="text-lg font-medium text-t1 mb-2">No employees found</h3>
                <p className="text-sm text-t3 text-center">
                  {searchQuery ? "Try adjusting your search terms" : "Get started by adding your first employee"}
                </p>
              </div>
            )
          )}

          {activeTab === "Departments" && (
            <>
              <div className="relative">
                <MagnifyingGlass size={18} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
                <input
                  type="text"
                  placeholder="Search departments by name, manager, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-surface text-t1 placeholder-[var(--text-3)] focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>

              {filteredDepartments.length > 0 ? (
                <div className="space-y-3">
                  {filteredDepartments.map((dept) => (
                    <DepartmentCard key={dept.id} department={dept} onClick={() => navigate({ to: `/${dept.id}` })} />
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-xl border border-[var(--border)] p-12 flex flex-col items-center justify-center min-h-[300px]">
                  <Buildings size={56} weight="duotone" className="text-t3 mb-4" />
                  <h3 className="text-lg font-medium text-t1 mb-2">No departments found</h3>
                  <p className="text-sm text-t3 text-center">
                    {searchQuery ? "Try adjusting your search terms" : "No departments available"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-[var(--border)] p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface mb-4 border border-[var(--border)]">
              <sectionItem.icon size={28} weight="duotone" className="text-t3" />
            </div>
            <h3 className="text-lg font-medium text-t1">{activeTab || sectionItem.name}</h3>
            <p className="mt-2 text-sm text-t3 max-w-sm mx-auto">
              This is the {activeTab || sectionItem.name} view. Data tables and charts for this section will be rendered here.
            </p>
          </div>
        </div>
      )}

      <DocumentSidePanel
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        title="Employee Onboarding"
        footerInfo="Departmental synchronization active"
        formContent={
          <div className="p-2 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Full Identity</label>
                <input type="text" placeholder="First and last names" className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-lg text-sm text-t1 placeholder-[var(--text-3)] outline-none focus:border-accent transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Division</label>
                  <select className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-lg text-xs text-t1 outline-none focus:border-accent transition-colors">
                    <option>Operations</option>
                    <option>Finance</option>
                    <option>Procurement</option>
                    <option>Transport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Role Tier</label>
                  <input type="text" placeholder="Job Title" className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-lg text-xs text-t1 placeholder-[var(--text-3)] outline-none focus:border-accent transition-colors" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Professional Email</label>
              <input type="email" placeholder="email@tekaccess.rw" className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-lg text-sm text-t1 placeholder-[var(--text-3)] outline-none focus:border-accent transition-colors" />
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
