export interface Location {
  id: number;
  organisation_id: number;
  name: string;
  address_line_1: string;
  address_line_2: string;
  suburb: string;
  state: string;
  postcode: string;
  minor_id: string;
  proda_link_status: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  name: string;
  organisation_id?: number;
  address_line_1?: string;
  address_line_2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}

export interface LocationUpdate {
  name?: string;
  address_line_1?: string;
  address_line_2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  proda_link_status?: string;
  status?: string;
}

export interface LocationProvider {
  id: number;
  location_id: number;
  provider_number: string;
  provider_type: string;
  hw027_status: string;
  air_access_list: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
