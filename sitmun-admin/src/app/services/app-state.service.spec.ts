import { AppStateService } from './app-state.service';

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() };

describe('AppStateService waiting reason', () => {
  it('updates the reason while the waiting page stays up', () => {
    const state = new AppStateService(logger as never);

    state.setWaitingForBackend();
    state.setWaitingForBackend('configuring');

    expect(state.isWaitingForBackend()).toBe(true);
    expect(state.getState().waitingReason).toBe('configuring');
  });
});
