import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';

export default function App() {
  const [currentDepartmentId, setCurrentDepartmentId] = useState('finance');

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Sidebar 
        currentDepartmentId={currentDepartmentId} 
        onDepartmentChange={setCurrentDepartmentId} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Dashboard currentDepartmentId={currentDepartmentId} />
        </main>
      </div>
    </div>
  );
}
