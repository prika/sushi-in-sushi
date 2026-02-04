/**
 * Location Value Object
 * Define as localizações do restaurante
 */

export type Location = 'circunvalacao' | 'boavista';

export const LOCATION_LABELS: Record<Location, string> = {
  circunvalacao: 'Circunvalação',
  boavista: 'Boavista',
};

export const ALL_LOCATIONS: Location[] = ['circunvalacao', 'boavista'];

/**
 * Verifica se uma string é uma localização válida
 */
export function isValidLocation(value: string): value is Location {
  return ALL_LOCATIONS.includes(value as Location);
}

/**
 * Obtém o label de uma localização
 */
export function getLocationLabel(location: Location): string {
  return LOCATION_LABELS[location];
}
