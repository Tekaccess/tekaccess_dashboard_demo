import * as React from 'react';
import { cn } from '../../lib/utils';

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }
>(({ className, wrapperClassName, ...props }, ref) => (
  <div className={cn('relative w-full overflow-x-auto', wrapperClassName)}>
    <table
      ref={ref}
      className={cn(
        'w-full min-w-max caption-bottom text-sm border-separate border-spacing-0',
        className,
      )}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-surface/60 backdrop-blur-sm', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t border-border bg-surface/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'group transition-colors',
      'data-[state=selected]:bg-accent-glow',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-4 text-left align-middle whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-t3',
      'border-b border-r border-border last:border-r-0 first:rounded-tl-xl last:rounded-tr-xl',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

/**
 * TableHead with a draggable handle on its right edge that emits the new
 * column width. Pair with a `<colgroup>` whose `<col>` widths are driven
 * by `useColumnWidths` so cells inherit the column width automatically.
 *
 * The handle uses `position: absolute` so the parent <th> needs `position: relative`
 * (added here via className).
 */
type ResizableTableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  width: number;
  onWidthChange: (next: number) => void;
  minWidth?: number;
  maxWidth?: number;
};

const ResizableTableHead = React.forwardRef<HTMLTableCellElement, ResizableTableHeadProps>(
  ({ width, onWidthChange, minWidth = 80, maxWidth = 800, className, children, ...props }, ref) => {
    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = width;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.min(maxWidth, Math.max(minWidth, startW + delta));
        onWidthChange(next);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    return (
      <TableHead ref={ref} className={cn('relative', className)} {...props}>
        {children}
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize column"
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize select-none bg-transparent hover:bg-accent/40 active:bg-accent/60 transition-colors"
        />
      </TableHead>
    );
  },
);
ResizableTableHead.displayName = 'ResizableTableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-1 h-11 min-h-fit align-middle whitespace-nowrap text-sm text-t1 border-b border-r border-border-s last:border-r-0',
      'group-last/row:border-b-0',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-sm text-t3', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  ResizableTableHead,
  TableRow,
  TableCell,
  TableCaption,
};
