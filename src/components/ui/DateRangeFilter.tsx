import React, { useState } from 'react';
import { CalendarBlank, X } from '@phosphor-icons/react';
import * as Popover from '@radix-ui/react-popover';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  addDays, addWeeks, addMonths, addYears,
  subDays, subWeeks, subMonths, subYears,
} from 'date-fns';
import { Calendar } from './calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export type DueRange =
  | 'all'
  | 'past-day'   | 'this-day'   | 'next-day'
  | 'past-week'  | 'this-week'  | 'next-week'
  | 'past-month' | 'this-month' | 'next-month'
  | 'past-year'  | 'this-year'  | 'next-year';

export const DUE_RANGE_LABELS: Record<DueRange, string> = {
  'all':         'All due dates',
  'past-day':    'Yesterday',
  'this-day':    'Today',
  'next-day':    'Tomorrow',
  'past-week':   'Last week',
  'this-week':   'This week',
  'next-week':   'Next week',
  'past-month':  'Last month',
  'this-month':  'This month',
  'next-month':  'Next month',
  'past-year':   'Last year',
  'this-year':   'This year',
  'next-year':   'Next year',
};

export function getDueRangeBounds(
  range: DueRange,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  switch (range) {
    case 'all':         return null;
    case 'past-day':    { const d = subDays(now, 1);   return { start: startOfDay(d),    end: endOfDay(d)    }; }
    case 'this-day':    return { start: startOfDay(now),   end: endOfDay(now)   };
    case 'next-day':    { const d = addDays(now, 1);   return { start: startOfDay(d),    end: endOfDay(d)    }; }
    case 'past-week':   { const d = subWeeks(now, 1);  return { start: startOfWeek(d),   end: endOfWeek(d)   }; }
    case 'this-week':   return { start: startOfWeek(now),  end: endOfWeek(now)  };
    case 'next-week':   { const d = addWeeks(now, 1);  return { start: startOfWeek(d),   end: endOfWeek(d)   }; }
    case 'past-month':  { const d = subMonths(now, 1); return { start: startOfMonth(d),  end: endOfMonth(d)  }; }
    case 'this-month':  return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'next-month':  { const d = addMonths(now, 1); return { start: startOfMonth(d),  end: endOfMonth(d)  }; }
    case 'past-year':   { const d = subYears(now, 1);  return { start: startOfYear(d),   end: endOfYear(d)   }; }
    case 'this-year':   return { start: startOfYear(now),  end: endOfYear(now)  };
    case 'next-year':   { const d = addYears(now, 1);  return { start: startOfYear(d),   end: endOfYear(d)   }; }
  }
}

type Modifier = 'all' | 'past' | 'this' | 'next';
type Unit = 'day' | 'week' | 'month' | 'year';

const MODIFIER_LABEL: Record<Modifier, string> = {
  all: 'All',
  past: 'Last',
  this: 'This',
  next: 'Next',
};

function rangeToParts(range: DueRange): { modifier: Modifier; unit: Unit } {
  if (range === 'all') return { modifier: 'all', unit: 'week' };
  const [m, u] = range.split('-') as [Modifier, Unit];
  return { modifier: m, unit: u };
}

function partsToRange(modifier: Modifier, unit: Unit): DueRange {
  if (modifier === 'all') return 'all';
  return `${modifier}-${unit}` as DueRange;
}

interface DateRangeFilterProps {
  value: DueRange;
  onChange: (range: DueRange) => void;
  label?: string;
  className?: string;
}

export default function DateRangeFilter({
  value,
  onChange,
  label = 'Due Date',
  className = '',
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const { modifier, unit } = rangeToParts(value);
  const bounds = getDueRangeBounds(value);
  const isActive = value !== 'all';
  const focusMonth = bounds?.start ?? new Date();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`group inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border bg-card text-xs font-medium shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
            isActive
              ? 'border-accent/40 text-t1 hover:border-accent'
              : 'border-border text-t2 hover:border-accent/40 hover:text-t1'
          } ${className}`}
        >
          <CalendarBlank size={14} weight="duotone" className="text-t3" />
          <span className="text-t1">
            <span className="text-t3">{label}: </span>
            {DUE_RANGE_LABELS[value]}
          </span>
          {isActive && (
            <span
              role="button"
              aria-label="Clear date filter"
              onClick={(e) => {
                e.stopPropagation();
                onChange('all');
              }}
              className="ml-0.5 p-0.5 rounded text-t3 hover:bg-surface hover:text-t1 transition-colors"
            >
              <X size={12} weight="bold" />
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[100] w-72 bg-card border border-border rounded-xl shadow-2xl p-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-medium text-t1">{label}</span>
            <span className="text-[11px] text-t3">relative to today</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <Select
              value={modifier}
              onValueChange={(v) => onChange(partsToRange(v as Modifier, unit))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>{MODIFIER_LABEL[modifier]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="past">Last</SelectItem>
                <SelectItem value="this">This</SelectItem>
                <SelectItem value="next">Next</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={unit}
              onValueChange={(v) => onChange(partsToRange(modifier, v as Unit))}
              disabled={modifier === 'all'}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>{unit}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">day</SelectItem>
                <SelectItem value="week">week</SelectItem>
                <SelectItem value="month">month</SelectItem>
                <SelectItem value="year">year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <Calendar
              key={value}
              mode="range"
              selected={bounds ? { from: bounds.start, to: bounds.end } : undefined}
              defaultMonth={focusMonth}
              onSelect={() => { /* read-only visualization */ }}
            />
          </div>

          <p className="text-[11px] text-t3 mt-1 px-1">
            Filter will update with the current date
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
