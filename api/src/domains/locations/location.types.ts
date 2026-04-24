export interface NearestQuery {
  lat: number;
  lon: number;
  limit?: number;
}

export interface NearestResult {
  id: number;
  name: string;
  address: string;
  distance_m: number;
}
