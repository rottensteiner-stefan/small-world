import { EventDispatcherImpl } from './EventDispatcherImpl.js';
/**
 * Universal EventBus Singleton for the engine.
 * Assumes a "1 Engine Instance per Page" architecture.
 * Use this to avoid prop-drilling the EventDispatcher through constructors.
 */
export declare const UniversalEventBus: EventDispatcherImpl;
