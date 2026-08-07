import { get, set, update } from 'idb-keyval';
import { Product } from './types';

const PRODUCTS_KEY = 'product-lens-items';

export async function getProducts(): Promise<Product[]> {
  const products = await get<Product[]>(PRODUCTS_KEY);
  return products || [];
}

export async function saveProduct(product: Product): Promise<void> {
  await update(PRODUCTS_KEY, (val) => {
    const products = (val as Product[]) || [];
    return [product, ...products];
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await update(PRODUCTS_KEY, (val) => {
    const products = (val as Product[]) || [];
    return products.filter((p) => p.id !== id);
  });
}
