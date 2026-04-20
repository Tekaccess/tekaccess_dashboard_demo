import React, { useState } from 'react';
import { CalendarDots, DotsThree, Envelope, Phone, Globe, CheckCircle, Clock, FileText, CaretRight, PencilSimple } from '@phosphor-icons/react';

interface Transaction {
  id: string;
  customer: string;
  product: string;
  status: 'Success' | 'Pending';
  qty: number;
  price: string;
  total: string;
}

interface TransactionDetailProps {
  transaction: Transaction;
}

export default function TransactionDetail({ transaction }: TransactionDetailProps) {
  const [activeTab, setActiveTab] = useState('Activity');
  const tabs = ['Activity', 'Appointments 1', 'Proposals 1', 'Invoices', 'Notifications', 'Notes', 'Tasks'];

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left pane */}
      <div className="w-full md:w-[35%] border-r border-[var(--border)] p-6 flex flex-col overflow-y-auto bg-card">
        <div className="flex items-center space-x-2 mb-4">
          <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded uppercase tracking-wider">
            {transaction.status === 'Success' ? 'PAID' : 'HOT LEADS'}
          </span>
          <span className="px-2 py-1 bg-surface text-t3 text-[10px] font-bold rounded uppercase tracking-wider">
            REPEAT
          </span>
        </div>

        <div className="mb-6">
          <div className="text-sm text-t3 mb-1">Invoice {transaction.id}</div>
          <h1 className="text-2xl font-bold text-t1 mb-2">{transaction.product}</h1>
          <p className="text-sm text-t2">2972 Washington Ave</p>
        </div>

        <div className="flex items-center space-x-3 mb-8">
          <button className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-500/10 text-emerald-500 font-medium rounded-full hover:bg-emerald-500/20 transition-colors text-sm">
            <PencilSimple size={14} weight="bold" className="mr-2" />
            Edit Details
          </button>
          <button className="p-2 border border-[var(--border)] rounded-full text-t3 hover:bg-surface transition-colors">
            <CalendarDots size={16} weight="duotone" />
          </button>
          <button className="p-2 border border-[var(--border)] rounded-full text-t3 hover:bg-surface transition-colors">
            <DotsThree size={16} weight="bold" />
          </button>
        </div>

        <div className="bg-surface rounded-xl p-5 mb-8 border border-[var(--border)]">
          <div className="text-sm text-t3 mb-2">Total Amount</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-t1">{transaction.total}</div>
            <button className="text-emerald-500 text-sm font-medium hover:text-emerald-400 transition-colors">View</button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-t1 mb-4">Contact Details</h3>
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-sm mr-4">
              {transaction.customer.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="font-medium text-t1">{transaction.customer}</div>
          </div>

          <div className="space-y-4">
            {[
              { Icon: Envelope, label: 'Email Address', value: `${transaction.customer.toLowerCase().replace(' ', '.')}@example.com` },
              { Icon: Phone, label: 'Phone', value: '(831) 522-5847' },
              { Icon: Globe, label: 'Source', value: 'Linkedin' },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start">
                <Icon size={15} weight="duotone" className="text-t3 mt-0.5 mr-3 shrink-0" />
                <div>
                  <div className="text-xs text-t3 mb-0.5">{label}</div>
                  <div className="text-sm text-t1">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--border)]">
          <h3 className="text-sm font-bold text-t1 mb-4">Salesperson</h3>
          <div className="flex items-center">
            <img src="https://picsum.photos/seed/sales/100/100" alt="Salesperson" className="w-8 h-8 rounded-full mr-3" referrerPolicy="no-referrer" />
            <div className="text-sm font-medium text-t1">Ahmad Fawaid</div>
          </div>
          <div className="text-xs text-t3 mt-6">Record created Jan 16, 2024 9:34 AM</div>
        </div>
      </div>

      {/* Right pane */}
      <div className="w-full md:w-[65%] flex flex-col bg-card">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm">
              <span className="text-t3">Pipeline: </span>
              <span className="font-medium text-t1">Sales Pipeline</span>
              <span className="text-t3 mx-2">|</span>
              <span className="text-t3">Stage: </span>
              <span className="font-medium text-t1">{transaction.status === 'Success' ? 'Paid' : 'Pending'}</span>
            </div>
            <div className="text-xs text-t3">Been this stage for 48 minutes</div>
          </div>

          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex h-8 text-xs font-medium min-w-[600px]">
              {['New Leads', 'Request Rec...', 'In Draft', 'Proposal Sent', 'Approved', 'Paid'].map((stage, i, arr) => {
                const isCurrent = transaction.status === 'Success' ? stage === 'Paid' : stage === 'Proposal Sent';
                const isPast = transaction.status === 'Success' || i < 3;

                let bgClass = 'bg-surface text-t3';
                if (isCurrent) bgClass = 'bg-emerald-500/20 text-emerald-500';
                else if (isPast) bgClass = 'bg-emerald-500/30 text-emerald-400';

                return (
                  <div key={stage} className={`relative flex-1 flex items-center justify-center ${bgClass} ${i === 0 ? 'rounded-l-full' : ''} ${i === arr.length - 1 ? 'rounded-r-full' : ''} border-r border-card last:border-r-0`}>
                    <span className="z-10 truncate px-2">{stage}</span>
                    {i < arr.length - 1 && (
                      <div className="absolute right-[-10px] top-0 w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-l-[10px] z-20" style={{ borderLeftColor: 'inherit' }}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center mt-6 p-4 bg-surface rounded-xl border border-[var(--border)] gap-4 sm:gap-0">
            <div className="flex-1 flex items-center">
              <div className="w-8 h-8 rounded-full bg-card border border-[var(--border)] flex items-center justify-center mr-3 shrink-0">
                <FileText size={14} weight="duotone" className="text-t3" />
              </div>
              <div>
                <div className="text-xs text-t3">Active sequence</div>
                <div className="text-sm font-medium text-t1">Proposals Sequence</div>
                <button className="text-xs text-emerald-500 font-medium mt-0.5 hover:text-emerald-400 transition-colors">Change</button>
              </div>
            </div>
            <div className="flex-1 flex items-center sm:border-l sm:border-[var(--border)] sm:pl-6 pt-4 sm:pt-0 border-t border-[var(--border)] sm:border-t-0">
              <div className="w-8 h-8 rounded-full bg-card border border-[var(--border)] flex items-center justify-center mr-3 shrink-0">
                <Clock size={14} weight="duotone" className="text-t3" />
              </div>
              <div>
                <div className="text-xs text-t3">Next drip</div>
                <div className="text-sm font-medium text-t1">Follow up proposal</div>
                <div className="text-xs text-t3 mt-0.5">Scheduled for Tomorrow 12:39 PM</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 border-b border-[var(--border)]">
          <nav className="flex space-x-6 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-emerald-500 text-t1'
                    : 'border-transparent text-t3 hover:text-t2 hover:border-[var(--border)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-app">
          {activeTab === 'Activity' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-t1 mb-6">Latest Activity</h3>

                <div className="relative pl-8 mb-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center z-10">
                    <Envelope size={11} weight="duotone" className="text-emerald-500" />
                  </div>
                  <div className="absolute left-3 top-7 bottom-[-32px] w-px bg-[var(--border)]"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-t1">Email Delivered: Proposal Sent</div>
                      <div className="text-sm text-t2 mt-1">Proposal has been sent the message to the customer's email.</div>
                    </div>
                    <div className="text-xs text-t3">Today 9:49 AM</div>
                  </div>
                </div>

                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center z-10">
                    <CaretRight size={11} weight="bold" className="text-accent" />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-t1">Stage: Request Received → Proposal Sent</div>
                      <div className="text-sm text-t2 mt-1">Deal {transaction.id} has been moved to the Proposal Sent stage.</div>
                      <button className="text-xs text-t3 font-medium mt-2 hover:text-t2 transition-colors">Show more</button>
                    </div>
                    <div className="text-xs text-t3">Today 9:48 AM</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                  <h3 className="text-lg font-bold text-t1">Appointments</h3>
                  <button className="text-sm font-medium text-emerald-500 flex items-center hover:text-emerald-400 transition-colors self-start sm:self-auto">
                    <CalendarDots size={15} weight="duotone" className="mr-1.5" />
                    Create appointment
                  </button>
                </div>

                <div className="bg-card border border-[var(--border)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
                  <div className="w-full sm:w-48 sm:pr-4 sm:border-r sm:border-[var(--border)] border-b border-[var(--border)] sm:border-b-0 pb-4 sm:pb-0">
                    <div className="text-sm text-emerald-500 font-medium mb-1">Monday</div>
                    <div className="text-lg font-bold text-t1 mb-1">January 19, 2024</div>
                    <div className="text-xs text-t3">10 AM - 10:30 AM</div>
                  </div>
                  <div className="flex-1 sm:pl-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-sm font-bold text-t1 flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shrink-0"></div>
                        On-Site Estimate <span className="text-t3 font-normal mx-1">with</span> {transaction.customer}
                      </div>
                      <button className="text-t3 hover:text-t1 shrink-0 ml-2 transition-colors">
                        <DotsThree size={16} weight="bold" />
                      </button>
                    </div>
                    <div className="text-sm text-t2 flex items-start sm:items-center mb-2">
                      <Globe size={13} weight="duotone" className="mr-1.5 text-t3 shrink-0 mt-0.5 sm:mt-0" />
                      <span>4517 Washington Avenue, Manchester, KY 39495</span>
                    </div>
                    <div className="flex items-center text-xs text-t3">
                      <img src="https://picsum.photos/seed/sales/100/100" alt="Salesperson" className="w-4 h-4 rounded-full mr-1.5 shrink-0" referrerPolicy="no-referrer" />
                      Ahmad Fawaid
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab !== 'Activity' && (
            <div className="flex items-center justify-center h-48 text-t3 text-sm">
              Content for {activeTab} will be displayed here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
