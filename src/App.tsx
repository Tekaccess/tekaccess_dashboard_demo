import React from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
