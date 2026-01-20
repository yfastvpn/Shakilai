
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  grounding?: GroundingSource[];
  image?: string; // Base64 image data
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface UserContact {
  id: string;
  name: string;
  phone: string;
  locationName?: string;
}
