import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { ConfirmHost } from '@/components/common/ConfirmDialog';
import './index.css';

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
      <ConfirmHost />
    </ThemeProvider>
  );
}
