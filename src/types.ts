export interface Producer {
  id: number;
  lat: number;
  lng: number;
  peakPower: number; // in kWp
  name: string;
}

export interface Consumer {
  id: number;
  lat: number;
  lng: number;
  name: string;
}