import React, { useState } from 'react';
import { Calendar, MoreHorizontal, Mail, Phone, Globe, CheckCircle2, Clock, FileText, ChevronRight, Edit } from 'lucide-react';

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
      {/* Left Pane (approx 35%) */}
      <div className="w-full md:w-[35%] border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
        {/* Tags */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase tracking-wider">
            {transaction.status === 'Success' ? 'PAID' : 'HOT LEADS'}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">
            REPEAT
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-1">Invoice {transaction.id}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{transaction.product}</h1>
          <p className="text-sm text-gray-500">2972 Washington Ave</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mb-8">
          <button className="flex-1 flex items-center justify-center px-4 py-2 bg-[#bbf7d0] text-green-800 font-medium rounded-full hover:bg-[#86efac] transition-colors text-sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit Details
          </button>
          <button className="p-2 border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50">
            <Calendar className="w-4 h-4" />
          </button>
          <button className="p-2 border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-100">
          <div className="text-sm text-gray-500 mb-2">Total Amount</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{transaction.total}</div>
            <button className="text-green-600 text-sm font-medium hover:text-green-700">View</button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Contact Details</h3>
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm mr-4">
              {transaction.customer.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="font-medium text-gray-900">{transaction.customer}</div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 mr-3" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Email Address</div>
                <div className="text-sm text-gray-900">{transaction.customer.toLowerCase().replace(' ', '.')}@example.com</div>
              </div>
            </div>
            <div className="flex items-start">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5 mr-3" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Phone</div>
                <div className="text-sm text-gray-900">(831) 522-5847</div>
              </div>
            </div>
            <div className="flex items-start">
              <Globe className="w-4 h-4 text-gray-400 mt-0.5 mr-3" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Source</div>
                <div className="text-sm text-gray-900">Linkedin</div>
              </div>
            </div>
          </div>
        </div>

        {/* Salesperson */}
        <div className="mt-auto pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Salesperson</h3>
          <div className="flex items-center">
            <img src="https://picsum.photos/seed/sales/100/100" alt="Salesperson" className="w-8 h-8 rounded-full mr-3" referrerPolicy="no-referrer" />
            <div className="text-sm font-medium text-gray-900">Ahmad Fawaid</div>
          </div>
          <div className="text-xs text-gray-400 mt-6">
            Record created Jan 16, 2024 9:34 AM
          </div>
        </div>
      </div>

      {/* Right Pane (approx 65%) */}
      <div className="w-full md:w-[65%] flex flex-col bg-white">
        {/* Pipeline Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm">
              <span className="text-gray-500">Pipeline: </span>
              <span className="font-medium text-gray-900">Sales Pipeline</span>
              <span className="text-gray-300 mx-2">|</span>
              <span className="text-gray-500">Stage: </span>
              <span className="font-medium text-gray-900">{transaction.status === 'Success' ? 'Paid' : 'Pending'}</span>
            </div>
            <div className="text-xs text-gray-500">Been this stage for 48 minutes</div>
          </div>

          {/* Chevron Pipeline */}
          <div className="flex h-8 text-xs font-medium">
            {['New Leads', 'Request Rec...', 'In Draft', 'Proposal Sent', 'Approved', 'Paid'].map((stage, i, arr) => {
              const isCurrent = transaction.status === 'Success' ? stage === 'Paid' : stage === 'Proposal Sent';
              const isPast = transaction.status === 'Success' || i < 3; // Simplified logic for demo
              
              let bgClass = 'bg-gray-100 text-gray-500';
              if (isCurrent) bgClass = 'bg-[#bbf7d0] text-green-800';
              else if (isPast) bgClass = 'bg-[#86efac] text-green-900';

              return (
                <div key={stage} className={`relative flex-1 flex items-center justify-center ${bgClass} ${i === 0 ? 'rounded-l-full' : ''} ${i === arr.length - 1 ? 'rounded-r-full' : ''} border-r border-white last:border-r-0`}>
                  <span className="z-10 truncate px-2">{stage}</span>
                  {i < arr.length - 1 && (
                    <div className="absolute right-[-10px] top-0 w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-l-[10px] border-l-inherit z-20" style={{ borderLeftColor: 'inherit' }}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sequence Info */}
          <div className="flex items-center mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex-1 flex items-center">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center mr-3">
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Active sequence</div>
                <div className="text-sm font-medium text-gray-900">Proposals Sequence</div>
                <button className="text-xs text-green-600 font-medium mt-0.5">Change</button>
              </div>
            </div>
            <div className="flex-1 flex items-center border-l border-gray-200 pl-6">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center mr-3">
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Next drip</div>
                <div className="text-sm font-medium text-gray-900">Follow up proposal</div>
                <div className="text-xs text-gray-500 mt-0.5">Scheduled for Tomorrow 12:39 PM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <nav className="flex space-x-6 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-green-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
          {activeTab === 'Activity' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Latest Activity</h3>
                
                {/* Timeline Item 1 */}
                <div className="relative pl-8 mb-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[#bbf7d0] flex items-center justify-center z-10">
                    <Mail className="w-3 h-3 text-green-700" />
                  </div>
                  <div className="absolute left-3 top-7 bottom-[-32px] w-px bg-gray-200"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Email Delivered: Proposal Sent</div>
                      <div className="text-sm text-gray-500 mt-1">Proposal has been sent the message to the customer's email.</div>
                    </div>
                    <div className="text-xs text-gray-400">Today 9:49 AM</div>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center z-10">
                    <ChevronRight className="w-3 h-3 text-blue-700" />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Stage: Request Received → Proposal Sent</div>
                      <div className="text-sm text-gray-500 mt-1">Deal {transaction.id} has been moved to the Proposal Sent stage.</div>
                      <button className="text-xs text-gray-400 font-medium mt-2 hover:text-gray-600">Show more</button>
                    </div>
                    <div className="text-xs text-gray-400">Today 9:48 AM</div>
                  </div>
                </div>
              </div>

              {/* Appointments Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Appointments</h3>
                  <button className="text-sm font-medium text-green-600 flex items-center hover:text-green-700">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Create appointment
                  </button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center">
                  <div className="w-48 pr-4 border-r border-gray-100">
                    <div className="text-sm text-green-600 font-medium mb-1">Monday</div>
                    <div className="text-lg font-bold text-gray-900 mb-1">January 19, 2024</div>
                    <div className="text-xs text-gray-500">10 AM - 10:30 AM</div>
                  </div>
                  <div className="flex-1 pl-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-sm font-bold text-gray-900">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        On-Site Estimate <span className="text-gray-500 font-normal mx-1">with</span> {transaction.customer}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center mb-2">
                      <Globe className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                      4517 Washington Avenue, Manchester, KY 39495
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <img src="https://picsum.photos/seed/sales/100/100" alt="Salesperson" className="w-4 h-4 rounded-full mr-1.5" referrerPolicy="no-referrer" />
                      Ahmad Fawaid
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab !== 'Activity' && (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Content for {activeTab} will be displayed here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
