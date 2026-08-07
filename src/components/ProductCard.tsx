import { Product } from '../types';
import { Trash2, Package, Tag, Share2, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onDelete?: (id: string) => void;
  onEdit?: (product: Product) => void;
  onShare?: (product: Product) => void;
}

export function ProductCard({ product, onDelete, onEdit, onShare }: ProductCardProps) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-neutral-200/50 aspect-[4/5] flex flex-col justify-end transition-all hover:shadow-2xl hover:shadow-neutral-900/10"
    >
      <img
        src={product.imageUrl}
        alt={product.name}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      
      {/* Premium Glass/Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10 w-full p-6 flex flex-col justify-end h-full pointer-events-none">
        <div className="translate-y-0 transition-transform duration-500 ease-out">
          <h3 className="font-display text-2xl text-white mb-4 drop-shadow-md line-clamp-2 leading-tight">
            {product.name}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 opacity-100 transition-opacity duration-500">
            {product.quantity && product.quantity !== '0' && (
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-sm font-medium border border-white/10 shadow-sm pointer-events-auto">
                <Package className="w-3.5 h-3.5 opacity-80" />
                {product.quantity}
              </div>
            )}
            {product.netRate && product.netRate !== '0' && (
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-sm font-medium border border-white/10 shadow-sm pointer-events-auto">
                <Tag className="w-3.5 h-3.5 opacity-80" />
                N.RATE: {product.netRate}
              </div>
            )}
            {product.rate && product.rate !== '0' && (
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-sm font-medium border border-white/10 shadow-sm pointer-events-auto">
                <Tag className="w-3.5 h-3.5 opacity-80" />
                MRP: {product.rate}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-100 transition-all duration-300">
        {onShare && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(product);
            }}
            className="p-2.5 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-green-500/90 hover:scale-110 shadow-sm transition-all"
            aria-label="Share product"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
            className="p-2.5 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-blue-500/90 hover:scale-110 shadow-sm transition-all"
            aria-label="Edit product"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product.id);
            }}
            className="p-2.5 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-red-500/90 hover:scale-110 shadow-sm transition-all"
            aria-label="Delete product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
