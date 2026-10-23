import { toast } from 'sonner';

export type ToastType = 'success' | 'info' | 'error';

// One shared object, so `showToast` is stable and safe in hook dependency lists.
const toaster = {
  showToast: (message: string, type: ToastType = 'success') => {
    toast[type](message);
  },
};

export function useToast() {
  return toaster;
}
