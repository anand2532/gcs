import {useCommandCenterStore} from '../src/features/command-center/state/commandCenterStore';

describe('commandCenterStore', () => {
  beforeEach(() => {
    useCommandCenterStore.setState({
      open: false,
      activePanel: 'hub',
    });
  });

  it('opens panel and sets active route', () => {
    useCommandCenterStore.getState().openPanel('diagnostics');
    expect(useCommandCenterStore.getState().open).toBe(true);
    expect(useCommandCenterStore.getState().activePanel).toBe('diagnostics');
  });

  it('goHub resets to hub without closing', () => {
    useCommandCenterStore.getState().openPanel('settings');
    useCommandCenterStore.getState().goHub();
    expect(useCommandCenterStore.getState().activePanel).toBe('hub');
    expect(useCommandCenterStore.getState().open).toBe(true);
  });

  it('setOpen false resets panel', () => {
    useCommandCenterStore.getState().openPanel('diagnostics');
    useCommandCenterStore.getState().setOpen(false);
    expect(useCommandCenterStore.getState().activePanel).toBe('hub');
  });
});
