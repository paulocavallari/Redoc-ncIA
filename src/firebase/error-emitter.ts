// A simple event emitter for decoupling parts of the application.
// This is a common pattern to allow different components to communicate
// without having direct dependencies on each other.

type Listener<T> = (data: T) => void;

class EventEmitter<TEventMap extends Record<string, any>> {
  private listeners: { [K in keyof TEventMap]?: Listener<TEventMap[K]>[] } = {};

  on<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>): void {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event]!.filter(l => l !== listener);
  }

  emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): void {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event]!.forEach(listener => listener(data));
  }
}

// Define the shape of the events and their payloads
interface ErrorEvents {
  'permission-error': Error;
}

// Create and export a singleton instance of the event emitter.
// This instance will be used throughout the app to broadcast and listen for permission errors.
export const errorEmitter = new EventEmitter<ErrorEvents>();
