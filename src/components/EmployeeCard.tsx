import React from "react";
import { Envelope, Phone, Buildings, Briefcase } from "@phosphor-icons/react";
import { Employee } from "../data/employees";

interface EmployeeCardProps {
  employee: Employee;
  onClick: () => void;
  key?: string;
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-500",
    inactive: "bg-surface text-t3",
    "on-leave": "bg-amber-500/10 text-amber-500",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent-border)] hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="h-12 w-12 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent-border)] flex items-center justify-center text-accent font-bold text-lg flex-shrink-0">
            {employee.fullName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-t1 truncate">{employee.fullName}</h3>
            <p className="text-sm text-t3">{employee.role}</p>
            <div className="mt-2 space-y-1">
              {[
                { Icon: Envelope, value: employee.email },
                { Icon: Phone, value: employee.phone },
                { Icon: Buildings, value: employee.department },
              ].map(({ Icon, value }) => (
                <div key={value} className="flex items-center text-sm text-t2">
                  <Icon size={14} weight="duotone" className="mr-2 text-t3 flex-shrink-0" />
                  <span className="truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2 ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[employee.status]}`}>
            {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-glow)] text-accent">
            <Briefcase size={11} weight="duotone" className="mr-1" />
            {employee.contract.type}
          </span>
        </div>
      </div>
    </button>
  );
}
