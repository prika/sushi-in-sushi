export type TableLocation = "circunvalacao" | "boavista";

export interface Table {
  id: string;
  number: number;
  name: string;
  location: TableLocation;
  is_active: boolean;
  qr_code_token: string | null;
  qr_code_generated_at: string | null;
  qr_code_scans: number;
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TableInsert {
  id?: string;
  number: number;
  name: string;
  location?: TableLocation;
  is_active?: boolean;
  qr_code_token?: string | null;
  qr_code_generated_at?: string | null;
  qr_code_scans?: number;
  last_scan_at?: string | null;
}

export interface TableUpdate {
  number?: number;
  name?: string;
  location?: TableLocation;
  is_active?: boolean;
  qr_code_token?: string | null;
  qr_code_generated_at?: string | null;
  qr_code_scans?: number;
  last_scan_at?: string | null;
}

export const LOCATION_LABELS: Record<TableLocation, string> = {
  circunvalacao: "Circunvalacao",
  boavista: "Boavista",
};
