import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, MagnifyingGlass, Users, Buildings, Spinner, Phone, Envelope } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { departmentsOverview } from "../data/employees";
import EmployeeCard from "../components/EmployeeCard";
import ModernModal from "../components/ui/ModernModal";
import { apiListEmployees, apiCreateEmployee, apiUpdateEmployee, apiListContracts, apiInstantiateContract, Employee, OperationsContract } from "../lib/api";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Employees");
  const [contracts, setContracts] = useState<OperationsContract[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'new' | 'edit' | 'view' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    fullName: '', email: '', phone: '', role: '', department: 'Operations',
    contractId: '', startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [eRes, cRes, tRes] = await Promise.all([
      apiListEmployees({ search: searchQuery || undefined }),
      apiListContracts({ contractType: 'employee', status: 'active', isTemplate: 'false', limit: '200' }),
      apiListContracts({ contractType: 'employee', isTemplate: 'true', limit: '200' }),
    ]);
    if (eRes.success) setEmployees(eRes.data.employees);
    if (cRes.success && tRes.success) setContracts([...tRes.data.contracts, ...cRes.data.contracts]);
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  const displayTabs = ["All Employees", "Departments"];

  const currentEmployee = employees.find(e => e._id === selectedEmployeeId) || null;

  async function handleSave() {
    if (!draft.fullName || !draft.email) { setError('Name and email are required.'); return; }
    setSaving(true); setError(null);

    let finalContractId = draft.contractId;
    const selectedContract = contracts.find(c => c._id === draft.contractId);

    if (selectedContract?.isTemplate) {
      const instRes = await apiInstantiateContract({
        templateId: selectedContract._id,
        targetName: draft.fullName,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });
      if (!instRes.success) { setError(`Contract error: ${instRes.message}`); setSaving(false); return; }
      finalContractId = instRes.data.contract._id;
    }

    const payload = { ...draft, contractId: finalContractId };
    const res = modalMode === 'new'
      ? await apiCreateEmployee(payload as any)
      : await apiUpdateEmployee(selectedEmployeeId!, payload as any);

    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); loadData();
  }

  function openEdit(e: Employee) {
    setDraft({
      fullName: e.fullName, email: e.email, phone: e.phone || '',
      role: e.role, department: e.department, contractId: e.contractId || '',
      startDate: '', endDate: '',
    });
    setSelectedEmployeeId(e._id); setModalMode('edit');
  }

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
          onClick={() => { setDraft({ fullName: '', email: '', phone: '', role: '', department: 'Operations', contractId: '', startDate: new Date().toISOString().split('T')[0], endDate: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().split('T')[0] }); setModalMode('new'); }}
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
            {loading ? (
              <div className="flex justify-center py-20"><Spinner size={32} className="animate-spin text-accent" /></div>
            ) : employees.length > 0 ? (
              <div className="space-y-3">
                {employees.map((employee) => (
                  <EmployeeCard key={employee._id} employee={employee as any} onClick={() => { setSelectedEmployeeId(employee._id); setModalMode('view'); }} />
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

      <ModernModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'new' ? 'Onboard New Employee' : modalMode === 'edit' ? 'Update Employee' : currentEmployee?.fullName ?? ''}
        summaryContent={
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Departmental Context</p>
              <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-t3">Division</span>
                  <span className="font-bold text-t1">{modalMode === 'view' ? currentEmployee?.department : draft.department}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-t3">Tier</span>
                  <span className="text-t1 font-medium">{modalMode === 'view' ? currentEmployee?.role : draft.role || '—'}</span>
                </div>
              </div>
            </div>
            {modalMode === 'view' && currentEmployee && (
              <div className="pt-4 border-t border-border">
                <button onClick={() => openEdit(currentEmployee)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
                  Edit Personal File
                </button>
              </div>
            )}
          </div>
        }
        actions={modalMode !== 'view' && (
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h flex items-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Initialize Onboarding' : 'Save Changes'}
          </button>
        )}
      >
        {modalMode === 'view' && currentEmployee ? (
          <div className="space-y-6">
             <div className="flex flex-col items-center text-center p-6 bg-surface/30 rounded-2xl border border-border">
                <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl">
                  {currentEmployee.fullName.split(' ').map(n => n[0]).join('')}
                </div>
                <h1 className="text-xl font-bold text-t1">{currentEmployee.fullName}</h1>
                <p className="text-sm font-medium text-accent">{currentEmployee.role}</p>
                <div className="flex items-center gap-4 mt-4 text-t2">
                  <span className="flex items-center gap-1"><Envelope size={14}/> {currentEmployee.email}</span>
                  <span className="flex items-center gap-1"><Phone size={14}/> {currentEmployee.phone || '—'}</span>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-card border border-border rounded-xl">
                  <p className="text-[10px] text-t3 font-black uppercase mb-2">Contract Details</p>
                  <p className="text-sm font-bold text-t1">{currentEmployee.contractRef || 'No contract linked'}</p>
                  <p className="text-xs text-t3 mt-1">Status: <span className="text-emerald-400">Active</span></p>
                </div>
                <div className="p-4 bg-card border border-border rounded-xl">
                  <p className="text-[10px] text-t3 font-black uppercase mb-2">Internal KPI</p>
                  <p className="text-sm font-bold text-t1">Performance Score: —</p>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-6">
            {error && <p className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-t3 uppercase mb-2">Full Identity</label>
                <input type="text" value={draft.fullName} onChange={e => setDraft(d => ({ ...d, fullName: e.target.value }))} placeholder="First and last names" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-t1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase mb-2">Division</label>
                  <select className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-t1" value={draft.department} onChange={e => setDraft(d => ({ ...d, department: e.target.value }))}>
                    {['Operations', 'Finance', 'Executive', 'Procurement', 'Transport'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-t3 uppercase mb-2">Role Tier</label>
                  <input type="text" value={draft.role} onChange={e => setDraft(d => ({ ...d, role: e.target.value }))} placeholder="Job Title" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-t1" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-[11px] font-black text-t3 uppercase mb-2">Professional Email</label>
                <input type="email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} placeholder="email@tekaccess.rw" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-t1" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-t3 uppercase mb-2">Mobile Phone</label>
                <input type="tel" value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} placeholder="+250..." className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-t1" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black text-t3 uppercase mb-2">Employment Contract / Template</label>
              <select className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-t1" value={draft.contractId} onChange={e => setDraft(d => ({ ...d, contractId: e.target.value }))}>
                <option value="">No contract selected</option>
                {contracts.map(con => (
                  <option key={con._id} value={con._id}>{con.isTemplate ? '[TEMPLATE] ' : ''}{con.contractRef} — {con.title}</option>
                ))}
              </select>
            </div>
            {contracts.find(c => c._id === draft.contractId)?.isTemplate && (
               <div className="grid grid-cols-2 gap-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
                <div>
                  <label className="block text-[10px] font-bold text-accent uppercase mb-1">Join Date</label>
                  <input type="date" className="w-full px-3 py-1.5 border border-accent/20 rounded-lg text-xs bg-surface" value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-accent uppercase mb-1">Contract End</label>
                  <input type="date" className="w-full px-3 py-1.5 border border-accent/20 rounded-lg text-xs bg-surface" value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
        )}
      </ModernModal>
    </div>
  );
}
