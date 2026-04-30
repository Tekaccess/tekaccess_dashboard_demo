import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, Users, BriefcaseMetal, EnvelopeSimple, Phone } from '@phosphor-icons/react';
import { apiListEmployees, Employee } from '../../lib/api';

const DEPT_LABELS: Record<string, string> = {
  executive: 'Executive',
  finance: 'Finance',
  transport: 'Transport',
  operations: 'Operations',
  procurement: 'Procurement',
  sales: 'Sales',
  hr: 'HR',
  admin: 'Admin',
  data_team: 'Data Team',
};

const STATUS_DOTS: Record<string, string> = {
  active: 'bg-emerald-500',
  'on-leave': 'bg-amber-500',
  inactive: 'bg-t3',
};

export default function OrgChartPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiListEmployees().then(r => {
      if (r.success) setEmployees(r.data.employees);
      setLoading(false);
    });
  }, []);

  const grouped = useMemo(() => {
    const filtered = search
      ? employees.filter(e =>
          e.fullName.toLowerCase().includes(search.toLowerCase()) ||
          e.role.toLowerCase().includes(search.toLowerCase()) ||
          e.department.toLowerCase().includes(search.toLowerCase())
        )
      : employees;
    const map: Record<string, Employee[]> = {};
    for (const e of filtered) {
      const key = e.department || 'unassigned';
      (map[key] ||= []).push(e);
    }
    // Sort employees within each department: managers/leads first, then alphabetical
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aIsLead = /lead|manager|head|director|chief/i.test(a.role);
        const bIsLead = /lead|manager|head|director|chief/i.test(b.role);
        if (aIsLead !== bIsLead) return aIsLead ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      });
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [employees, search]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={28} className="animate-spin text-accent" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Org Chart</h1>
        <p className="text-sm text-t3 mt-1">Reporting structure by department</p>
      </div>

      <input
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent"
        placeholder="Search by name, role, or department..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {grouped.length === 0 ? (
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-10 text-center text-sm text-t3">
            No employees found.
          </div>
        ) : grouped.map(([dept, list]) => (
          <div key={dept} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BriefcaseMetal size={16} weight="duotone" className="text-accent" />
                <h2 className="text-sm font-bold text-t1">{DEPT_LABELS[dept] || dept}</h2>
              </div>
              <span className="text-xs text-t3 inline-flex items-center gap-1">
                <Users size={12} weight="duotone" /> {list.length}
              </span>
            </div>
            <div className="space-y-2">
              {list.map(e => (
                <div key={e._id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface transition-colors">
                  <div className="w-9 h-9 rounded-full bg-accent-glow border border-accent/20 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                    {e.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOTS[e.status] || 'bg-t3'}`} />
                      <p className="text-sm font-medium text-t1 truncate">{e.fullName}</p>
                    </div>
                    <p className="text-xs text-t3 truncate">{e.role}</p>
                    {(e.email || e.phone) && (
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-t3">
                        {e.email && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <EnvelopeSimple size={10} /> {e.email}
                          </span>
                        )}
                        {e.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={10} /> {e.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
