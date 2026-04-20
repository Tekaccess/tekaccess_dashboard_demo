import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DotsThree, Plus, MagnifyingGlass } from '@phosphor-icons/react';
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

const columnHelper = createColumnHelper<Transaction>();

const ActionCell = ({ transaction, onSelect }: { transaction: Transaction; onSelect: (tx: Transaction) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex justify-end" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="text-t3 hover:text-t1 border border-[var(--border)] rounded-lg p-1 inline-flex transition-colors"
      >
        <DotsThree size={16} weight="bold" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-card rounded-xl shadow-2xl border border-[var(--border)] z-50 overflow-hidden">
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onSelect(transaction); }}
            className="block w-full text-left px-4 py-2.5 text-sm text-t2 hover:bg-surface hover:text-t1 transition-colors"
          >
            View Details
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onSelect(transaction); }}
            className="block w-full text-left px-4 py-2.5 text-sm text-t2 hover:bg-surface hover:text-t1 transition-colors"
          >
            Edit Transaction
          </button>
        </div>
      )}
    </div>
  );
};

export default function RecentTransactions() {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: () => <input type="checkbox" className="rounded border-[var(--border)] accent-accent" />,
      cell: () => <input type="checkbox" className="rounded border-[var(--border)] accent-accent" onClick={e => e.stopPropagation()} />,
    }),
    columnHelper.accessor('id', {
      header: 'ID :',
      cell: info => <span className="text-sm text-t3">{info.getValue()}</span>,
    }),
    columnHelper.accessor('customer', {
      header: 'CUSTOMER :',
      cell: info => <span className="text-sm font-medium text-t1">{info.getValue()}</span>,
    }),
    columnHelper.accessor('product', {
      header: 'PRODUCT :',
      cell: info => <span className="text-sm text-t2">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'STATUS :',
      cell: info => {
        const status = info.getValue();
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            status === 'Success'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'Success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor('qty', {
      header: 'QTY :',
      cell: info => <span className="text-sm font-bold text-t1">{info.getValue()}</span>,
    }),
    columnHelper.accessor('price', {
      header: 'UNIT PRICE :',
      cell: info => <span className="text-sm font-bold text-t1">{info.getValue()}</span>,
    }),
    columnHelper.accessor('total', {
      header: 'TOTAL REVENUE :',
      cell: info => <span className="text-sm font-bold text-t1">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right">ACTIONS</div>,
      cell: ({ row }) => <ActionCell transaction={row.original} onSelect={setSelectedTx} />,
    }),
  ], []);

  const table = useReactTable({ data: transactions, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <>
      <div className="bg-card rounded-xl border border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-surface rounded-t-xl">
          <div className="flex items-center space-x-2">
            <h2 className="text-xs font-bold text-t3 uppercase tracking-wider">Recent Transactions</h2>
            <div className="w-4 h-4 rounded-full bg-surface-hover"></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:flex-none">
              <MagnifyingGlass size={14} weight="regular" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t3" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="block w-full sm:w-48 pl-8 pr-3 py-1.5 border border-[var(--border)] rounded-lg leading-5 bg-card placeholder-[var(--text-3)] text-t1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-xs transition-colors"
              />
            </div>
            <button className="flex items-center px-3 py-1.5 bg-card border border-[var(--border)] text-t2 text-xs font-medium rounded-lg hover:bg-surface transition-colors">
              <Plus size={13} weight="bold" className="mr-1" />
              Add Transaction
            </button>
            <button className="p-1.5 bg-card border border-[var(--border)] rounded-lg text-t3 hover:bg-surface transition-colors">
              <DotsThree size={16} weight="bold" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[250px]">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-card">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      scope="col"
                      className={`px-6 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider ${header.id === 'select' ? 'w-10' : ''}`}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-card divide-y divide-[var(--border-s)]">
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="hover:bg-surface cursor-pointer transition-colors"
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
