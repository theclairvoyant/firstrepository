import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastInstance {
  id: string;
  message: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
}

export interface ShowToastInput {
  message: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastState {
  toasts: ToastInstance[];
  show: (input: ShowToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;

function nextId(): string {
  counter += 1;
  return `t_${Date.now().toString(36)}_${counter}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (input) => {
    const id = nextId();
    const toast: ToastInstance = {
      id,
      message: input.message,
      description: input.description,
      variant: input.variant ?? 'info',
      durationMs: input.durationMs ?? 3500,
    };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export function showToast(input: ShowToastInput): string {
  return useToastStore.getState().show(input);
}

export function dismissToast(id: string): void {
  useToastStore.getState().dismiss(id);
}

export function clearToasts(): void {
  useToastStore.getState().clear();
}
