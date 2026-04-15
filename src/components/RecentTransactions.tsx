import React from 'react';
import { MoreHorizontal, Plus, Search } from 'lucide-react';

const transactions = [
  { id: '#04910', customer: 'Ryan Korsgaard', product: 'Ergo Office Chair', status: 'Success', qty: 12, price: '$3,450', total: '$41,400' },
  { id: '#04911', customer: 'Madelyn Lubin', product: 'Sunset Desk 02', status: 'Success', qty: 20, price: '$2,980', total: '$89,200' },
  { id: '#04912', customer: 'Abram Bergson', product: 'Eco Bookshelf', status: 'Pending', qty: 22, price: '$1,750', total: '$75,900' },
];

export default function RecentTransactions() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Transactions</h2>
          <div className="w-4 h-4 rounded-full bg-gray-200"></div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search transactions..."
              className="block w-48 pl-8 pr-3 py-1.5 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>
          <button className="flex items-center px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Transaction
          </button>
          <button className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-10">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID :</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Customer :</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Product :</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status :</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Qty :</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Unit Price :</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue :</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {transactions.map((tx, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.customer}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.product}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    tx.status === 'Success' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      tx.status === 'Success' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                    {tx.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{tx.qty}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{tx.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{tx.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-gray-400 hover:text-gray-600 border border-gray-200 rounded p-1">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
