import { toast } from 'sonner';

export type ToastType = 'success' | 'info' | 'error';

export function useToast() {
  return {
    showToast: (message: string, type: ToastType = 'success') => {
      toast[type](message);
    },
  };
}
