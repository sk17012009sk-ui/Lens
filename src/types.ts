export interface Product {
  id: string;
  imageUrl: string; // Base64 string of the image
  name: string;
  quantity: string;
  rate: string;
  netRate?: string;
  createdAt: number;
}
