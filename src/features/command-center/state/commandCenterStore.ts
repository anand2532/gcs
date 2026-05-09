import {create} from 'zustand';

export type CommandPanelId =
  | 'hub'
  | 'diagnostics'
  | 'settings'
  | 'profile'
  | 'organization'
  | 'missions';

interface CommandCenterState {
  open: boolean;
  activePanel: CommandPanelId;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  goHub: () => void;
  openPanel: (panel: Exclude<CommandPanelId, 'hub'>) => void;
}

export const useCommandCenterStore = create<CommandCenterState>((set, get) => ({
  open: false,
  activePanel: 'hub',
  setOpen: open =>
    set({
      open,
      activePanel: open ? get().activePanel : 'hub',
    }),
  toggle: () => {
    const {open} = get();
    if (open) {
      const smooth = commandCenterSmoothClose;
      if (smooth) {
        smooth();
        return;
      }
      set({open: false, activePanel: 'hub'});
      return;
    }
    set({open: true});
  },
  goHub: () => set({activePanel: 'hub'}),
  openPanel: panel => set({open: true, activePanel: panel}),
}));

/** Registered by CommandCenterRoot for animated dismiss from toggle. */
let commandCenterSmoothClose: (() => void) | null = null;

export function registerCommandCenterSmoothClose(fn: (() => void) | null): void {
  commandCenterSmoothClose = fn;
}
