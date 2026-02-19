/**
 * Location Value Object
 *
 * Represents a restaurant location (dynamic, based on restaurant slug).
 * Previously was a union type 'circunvalacao' | 'boavista', now dynamic.
 */
export type Location = string;
