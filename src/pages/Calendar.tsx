import React, { useState } from 'react';
import {
  CaretLeft,
  CaretRight,
  Plus,
  Clock,
  MapPin,
  Users,
  CalendarDots as CalendarIcon,
  DotsThree,
  X
} from '@phosphor-icons/react';
import DocumentSidePanel from '../components/DocumentSidePanel';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'meeting' | 'deadline' | 'reminder' | 'holiday';
  location?: string;
  attendees?: string[];
  description?: string;
}

const eventTypeColors = {
  meeting: 'bg-accent text-white',
  deadline: 'bg-red-500 text-white',
  reminder: 'bg-amber-500 text-white',
  holiday: 'bg-green-500 text-white'
};

const eventTypeDots = {
  meeting: 'bg-accent',
  deadline: 'bg-red-500',
  reminder: 'bg-amber-500',
  holiday: 'bg-green-500'
};

const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Finance Review Meeting',
    date: new Date(2026, 3, 16),
    startTime: '10:00',
    endTime: '11:30',
    type: 'meeting',
    location: 'Conference Room A',
    attendees: ['Thierry', 'Marie', 'Jean'],
    description: 'Q1 financial performance review'
  },
  {
    id: '2',
    title: 'Project Deadline',
    date: new Date(2026, 3, 18),
    startTime: '09:00',
    endTime: '17:00',
    type: 'deadline',
    description: 'Transport optimization project due'
  },
  {
    id: '3',
    title: 'Team Standup',
    date: new Date(2026, 3, 15),
    startTime: '09:00',
    endTime: '09:30',
    type: 'meeting',
    location: 'Virtual',
    attendees: ['All Team'],
    description: 'Daily standup meeting'
  },
  {
    id: '4',
    title: 'Company Holiday',
    date: new Date(2026, 3, 20),
    startTime: '00:00',
    endTime: '23:59',
    type: 'holiday',
    description: 'Easter Monday'
  },
  {
    id: '5',
    title: 'Inventory Audit',
    date: new Date(2026, 3, 22),
    startTime: '08:00',
    endTime: '16:00',
    type: 'reminder',
    location: 'Warehouse B',
    description: 'Quarterly inventory audit'
  }
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 15));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 3, 15));
  const [showEventModal, setShowEventModal] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const getEventsForDate = (date: Date) => {
    return sampleEvents.filter(event =>
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(year, month + (direction === 'next' ? 1 : -1), 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  const calendarDays: { day: number; currentMonth: boolean }[] = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, currentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, currentMonth: true });
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ day: i, currentMonth: false });
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-t1">Calendar</h2>
          <p className="text-sm text-t2 mt-1">Manage your schedule and events</p>
        </div>
        <button
          onClick={() => setShowEventModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-t1">
              {monthNames[month]} {year}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-surface rounded-xl transition-colors"
              >
                <CaretLeft className="w-5 h-5 text-t2" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-surface rounded-xl transition-colors"
              >
                <CaretRight className="w-5 h-5 text-t2" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-t2 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              const date = new Date(year, item.currentMonth ? month : (idx < firstDay ? month - 1 : month + 1), item.day);
              const events = getEventsForDate(date);

              return (
                <button
                  key={idx}
                  onClick={() => item.currentMonth && setSelectedDate(date)}
                  className={`
                    relative p-2 min-h-[80px] border rounded-xl transition-all
                    ${!item.currentMonth ? 'bg-surface text-t3' : 'bg-card hover:bg-surface'}
                    ${isSelected(item.day) ? 'border-accent bg-accent/5' : 'border-border'}
                    ${isToday(item.day) && item.currentMonth ? 'ring-2 ring-[#1e3a8a]' : ''}
                  `}
                  disabled={!item.currentMonth}
                >
                  <span className={`text-sm font-medium ${isToday(item.day) ? 'text-accent' : 'text-t1'}`}>
                    {item.day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {events.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate ${eventTypeColors[event.type]}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-xs text-t2">+{events.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Event Details Sidebar */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-t1 mb-4">
            {selectedDate
              ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
              : 'Select a date'
            }
          </h3>

          {selectedDateEvents.length > 0 ? (
            <div className="space-y-4">
              {selectedDateEvents.map((event) => (
                <div key={event.id} className="border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-t1">{event.title}</h4>
                    <button className="p-1 hover:bg-surface rounded">
                      <DotsThree className="w-4 h-4 text-t2" />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm text-t2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-t3" />
                      <span>{event.startTime} - {event.endTime}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-t3" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.attendees && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-t3" />
                        <span>{event.attendees.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-xs text-t2 mt-2 pt-2 border-t border-border-s">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-t3 mx-auto mb-4" />
              <p className="text-sm text-t2">No events on this date</p>
              <button
                onClick={() => setShowEventModal(true)}
                className="mt-4 text-sm text-accent hover:underline"
              >
                Create an event
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-xs font-semibold text-t2 mb-3">Event Types</h4>
            <div className="space-y-2">
              {Object.entries(eventTypeDots).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-xs text-t2 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Standardized Side Panel for Event Scheduling ─────────────────────────── */}
      <DocumentSidePanel
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Event Orchestration"
        footerInfo={`Scheduling system active • GMT+2`}
        formContent={
          <div className="space-y-6">
             <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Event Identity</label>
                <div className="space-y-4">
                  <input type="text" placeholder="Title of the event" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none focus:border-accent" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="time" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none" />
                    <input type="time" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none" />
                  </div>
                </div>
              </div>

               <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Categorization</label>
                <select className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs appearance-none outline-none focus:ring-2 focus:ring-[#1e3a8a]/10">
                  <option>Strategic Meeting</option>
                  <option>Critical Deadline</option>
                  <option>Operational Reminder</option>
                  <option>Public Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Environment</label>
                <input type="text" placeholder="Physical or Virtual Location" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Agenda & Brief</label>
                <textarea rows={4} placeholder="Summary of objectives..." className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none" />
              </div>

              <div className="pt-6">
                <button className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-xl shadow-[#1e3a8a]/20">Confirm Schedule</button>
              </div>
          </div>
        }
        previewContent={
          <div className="relative font-sans text-t1 h-full flex flex-col">
               {/* Daily Header */}
               <div className="mb-12 border-b-8 border-gray-900 pb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-5xl font-black tracking-tighter uppercase leading-[0.8] mb-2">Daily<br/>Protocol</h2>
                    <p className="text-[10px] font-black text-t3 uppercase tracking-[0.2em]">Operational Schedule Tracking</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-accent">
                      {selectedDate?.getDate() || '15'}
                    </p>
                    <p className="text-[10px] font-black uppercase text-t3">
                      {monthNames[selectedDate?.getMonth() || month]} {year}
                    </p>
                  </div>
               </div>

               {/* Timeline Mockup */}
               <div className="flex-1 space-y-8">
                  {[1, 2].map((i) => (
                    <div key={i} className={`flex gap-6 ${i === 2 ? 'opacity-20' : ''}`}>
                       <div className="w-20 text-right">
                          <p className="text-xs font-black text-t1">09:00 AM</p>
                          <div className="h-full w-px bg-surface-hover ml-auto mr-1 my-2" />
                       </div>
                       <div className="flex-1 bg-surface rounded-2xl p-6 border-l-4 border-accent">
                          <div className="flex justify-between items-start mb-2">
                             <h4 className="font-black text-t1 uppercase text-sm tracking-tight">System Syncing...</h4>
                             <span className="text-[10px] font-bold text-accent bg-accent-glow px-2 py-0.5 rounded">Sync active</span>
                          </div>
                          <p className="text-xs text-t2">Waiting for user input parameters to generate detail view.</p>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Footer Branding */}
               <div className="mt-20 pt-8 border-t border-border-s flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                        <CalendarIcon className="w-3.5 h-3.5 text-white" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-t1">Tek Calendar Engine</span>
                  </div>
                  <div className="w-24 h-1 bg-surface rounded-full overflow-hidden">
                     <div className="w-1/2 h-full bg-accent" />
                  </div>
               </div>
          </div>
        }
      />
    </div>
  );
}
