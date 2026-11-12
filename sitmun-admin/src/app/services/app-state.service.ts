import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { LoggerService } from './logger.service';

export type WaitingReason = 'unreachable' | 'configuring';

export interface AppState {
  hasInitializationError: boolean;
  initializationError?: any;
  isInitialized: boolean;
  waitingForBackend: boolean;
  waitingReason: WaitingReason;
}

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private stateSubject = new BehaviorSubject<AppState>({
    hasInitializationError: false,
    isInitialized: false,
    waitingForBackend: false,
    waitingReason: 'unreachable',
  });

  public state$ = this.stateSubject.asObservable();

  constructor(private loggerService: LoggerService) {
    this.loggerService.debug('App state service initialized');
  }

  /**
   * Sets initialization error state
   * @param error - The error object
   * @param source - The source of the error (e.g., 'languages', 'configuration')
   */
  setInitializationError(error: any, source: string): void {
    const currentState = this.stateSubject.value;
    const newState: AppState = {
      ...currentState,
      hasInitializationError: true,
      waitingForBackend: false,
      initializationError: {
        error,
        source,
        timestamp: new Date().toISOString()
      }
    };

    this.stateSubject.next(newState);
    this.loggerService.error(`Initialization error in ${source}`, error);
  }

  /**
   * Marks the app as initialized successfully
   */
  markInitialized(): void {
    const currentState = this.stateSubject.value;
    const newState: AppState = {
      ...currentState,
      isInitialized: true
    };

    this.stateSubject.next(newState);
    this.loggerService.info('App marked as initialized');
  }

  /**
   * Gets the current app state
   */
  getState(): AppState {
    return this.stateSubject.value;
  }

  /**
   * Checks if there's an initialization error
   */
  hasInitializationError(): boolean {
    return this.stateSubject.value.hasInitializationError;
  }

  /**
   * Gets the initialization error
   */
  getInitializationError(): any {
    return this.stateSubject.value.initializationError;
  }

  /**
   * Checks if the app is initialized
   */
  isInitialized(): boolean {
    return this.stateSubject.value.isInitialized;
  }

  /** The server has not answered yet, or it is still applying setup. */
  setWaitingForBackend(reason: WaitingReason = 'unreachable'): void {
    const currentState = this.stateSubject.value;
    if (currentState.hasInitializationError) {
      return;
    }
    if (currentState.waitingForBackend && currentState.waitingReason === reason) {
      return;
    }
    this.stateSubject.next({
      ...currentState,
      waitingForBackend: true,
      waitingReason: reason,
    });
    this.loggerService.info(
      reason === 'configuring' ? 'Waiting while the server configures' : 'Waiting for the server to start',
    );
  }

  clearWaitingForBackend(): void {
    const currentState = this.stateSubject.value;
    if (!currentState.waitingForBackend) {
      return;
    }
    this.stateSubject.next({
      ...currentState,
      waitingForBackend: false,
    });
  }

  isWaitingForBackend(): boolean {
    return this.stateSubject.value.waitingForBackend;
  }

  /**
   * Clears the initialization error
   */
  clearInitializationError(): void {
    const currentState = this.stateSubject.value;
    const newState: AppState = {
      ...currentState,
      hasInitializationError: false,
      initializationError: undefined
    };

    this.stateSubject.next(newState);
    this.loggerService.info('Initialization error cleared');
  }
} 