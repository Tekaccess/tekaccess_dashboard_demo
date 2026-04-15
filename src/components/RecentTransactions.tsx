import React, { useState } from 'react';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import SidePanel from './SidePanel';
import TransactionDetail from './TransactionDetail';

type Transaction = {
  id: string;
  customer: string;
  product: string;
  status: 'Success' | 'Pending';
  qty: number;
  price: string;
  total: string;
};

const transactions: Transaction[] = [
  { id: '#04910', customer: 'Ryan Korsgaard', product: 'Ergo Office Chair', status: 'Success', qty: 12, price: '$3,450', total: '$41,400' },
  { id: '#04911', customer: 'Madelyn Lubin', product: 'Sunset Desk 02', status: 'Success', qty: 20, price: '$2,980', total: '$89,200' },
  { id: '#04912', customer: 'Abram Bergson', product: 'Eco Bookshelf', status: 'Pending', qty: 22, price: '$1,750', total: '$75,900' },
];

export default function RecentTransactions() {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const columnHelper = createColumnHelper<Transaction>();

  const columns = [
    columnHelper.display({
      id: 'select',
      header: () => <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />,
      cell: () => <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={e => e.stopPropagation()} />,
    }),
    columnHelper.accessor('id', {
      header: 'ID :',
      cell: info => <span className="text-sm text-gray-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('customer', {
      header: 'CUSTOMER :',
      cell: info => <span className="text-sm font-medium text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('product', {
      header: 'PRODUCT :',
      cell: info => <span className="text-sm text-gray-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'STATUS :',
      cell: info => {
        const status = info.getValue();
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            status === 'Success' 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              status === 'Success' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor('qty', {
      header: 'QTY :',
      cell: info => <span className="text-sm font-bold text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('price', {
      header: 'UNIT PRICE :',
      cell: info => <span className="text-sm font-bold text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('total', {
      header: 'TOTAL REVENUE :',
      cell: info => <span className="text-sm font-bold text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right">ACTIONS</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTx(row.original);
            }}
            className="text-gray-400 hover:text-gray-600 border border-gray-200 rounded p-1 inline-flex"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
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
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      scope="col" 
                      className={`px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider ${header.id === 'select' ? 'w-10' : ''}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTx(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SidePanel 
        isOpen={!!selectedTx} 
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Transaction ${selectedTx.id}` : ''}
      >
        {selectedTx && <TransactionDetail transaction={selectedTx} />}
      </SidePanel>
    </>
  );
}
