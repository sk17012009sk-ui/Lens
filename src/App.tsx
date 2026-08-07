import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Camera, ImagePlus, X, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from './types';
import { getProducts, saveProduct, deleteProduct } from './db';
import { ProductCard } from './components/ProductCard';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Product State
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [netRate, setNetRate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sharing State
  const [sharingProduct, setSharingProduct] = useState<Product | null>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const loaded = await getProducts();
      setProducts(loaded);
    } catch (err) {
      console.warn("Could not load from IndexedDB:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!image || !name) return;
    
    const productData: Product = {
      id: editingId || (Math.random().toString(36).substring(2, 9) + Date.now().toString(36)),
      imageUrl: image,
      name,
      quantity: quantity || '0',
      rate: rate || '0',
      netRate: netRate || '0',
      createdAt: editingId ? (products.find(p => p.id === editingId)?.createdAt || Date.now()) : Date.now()
    };
    
    try {
      if (editingId) {
        // Delete old and save new to update (idb-keyval simple update)
        await deleteProduct(editingId);
      }
      await saveProduct(productData);
    } catch (err) {
      console.warn("Could not save to IndexedDB:", err);
    }
    
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? productData : p));
    } else {
      setProducts([productData, ...products]);
    }
    
    // Reset and close
    resetForm();
  };

  const resetForm = () => {
    setImage(null);
    setName('');
    setQuantity('');
    setRate('');
    setNetRate('');
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setImage(product.imageUrl);
    setName(product.name);
    setQuantity(product.quantity === '0' ? '' : product.quantity);
    setRate(product.rate === '0' ? '' : product.rate);
    setNetRate(product.netRate && product.netRate !== '0' ? product.netRate : '');
    setIsAdding(true);
  };

  const handleShareClick = async (product: Product) => {
    setSharingProduct(product);
    setShareFile(null);
    setSharePreviewUrl(null);
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = product.imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw enhanced image
      ctx.filter = 'saturate(110%) contrast(105%)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      // Draw premium gradient overlay
      const gradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle inner border for a premium look
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = Math.max(2, canvas.width * 0.005);
      const margin = Math.max(10, canvas.width * 0.02);
      ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

      // Setup typography
      const titleSize = Math.max(36, Math.floor(canvas.height * 0.055));
      const infoSize = Math.max(32, Math.floor(canvas.height * 0.045));
      const padding = Math.max(40, Math.floor(canvas.width * 0.06));
      
      let currentY = canvas.height - padding - margin;

      // Draw tags if available (Rate and Quantity)
      if (product.rate || product.quantity || product.netRate) {
        ctx.font = `800 ${infoSize}px 'Outfit', sans-serif`;
        
        const badges: string[] = [];
        if (product.netRate && product.netRate !== '0') badges.push(`N.RATE: ${product.netRate}`);
        if (product.rate && product.rate !== '0') badges.push(`MRP: ${product.rate}`);
        if (product.quantity && product.quantity !== '0') badges.push(`Qty: ${product.quantity}`);

        const badgeHeight = infoSize * 1.8;
        const badgePaddingX = padding * 1.5;
        const badgeMarginX = padding * 0.5;
        const badgeMarginY = padding * 0.5;

        // Group into rows
        let currentRow: {text: string, width: number}[] = [];
        let rowWidth = 0;
        const rows: {text: string, width: number}[][] = [];

        for (const text of badges) {
          const badgeWidth = ctx.measureText(text).width + badgePaddingX;
          if (currentRow.length > 0 && rowWidth + badgeWidth > canvas.width - padding * 2) {
            rows.push(currentRow);
            currentRow = [];
            rowWidth = 0;
          }
          currentRow.push({ text, width: badgeWidth });
          rowWidth += badgeWidth + badgeMarginX;
        }
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }

        // Draw rows from bottom to top (reverse order)
        for (let i = rows.length - 1; i >= 0; i--) {
           let xOffset = padding;
           for (const badge of rows[i]) {
              // Badge background
              ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.beginPath();
              ctx.roundRect(xOffset, currentY - badgeHeight, badge.width, badgeHeight, badgeHeight / 2);
              ctx.fill();
              
              // Badge border
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Badge text
              ctx.fillStyle = '#ffffff';
              ctx.fillText(badge.text, xOffset + padding * 0.75, currentY - badgeHeight / 2 + infoSize * 0.35);

              xOffset += badge.width + badgeMarginX;
           }
           currentY -= (badgeHeight + badgeMarginY);
        }
      }

      // Draw Title
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${titleSize}px 'Playfair Display', serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      
      // Basic text wrapping for title
      const words = product.name.split(' ');
      let line = '';
      let lines = [];
      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > canvas.width - padding * 2 && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      
      for(let i = lines.length - 1; i >= 0; i--) {
        ctx.fillText(lines[i], padding, currentY);
        currentY -= (titleSize * 1.2);
      }
      
      ctx.shadowColor = 'transparent'; // Reset shadow

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`, { type: 'image/jpeg' });
        setShareFile(file);
        setSharePreviewUrl(URL.createObjectURL(blob));
      }, 'image/jpeg', 0.9);

    } catch (err) {
      console.error("Could not generate share image:", err);
      alert("Could not generate image. Please try again.");
      setSharingProduct(null);
    }
  };

  const executeShare = async () => {
    if (!shareFile || !sharingProduct) return;
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({
          title: sharingProduct.name,
          text: `Check out ${sharingProduct.name}!`,
          files: [shareFile],
        });
      } else {
        const url = URL.createObjectURL(shareFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = shareFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Share failed:", err);
      }
    }
    setSharingProduct(null);
    setShareFile(null);
    setSharePreviewUrl(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
    } catch (err) {
      console.warn("Could not delete from IndexedDB:", err);
    }
    setProducts(products.filter(p => p.id !== id));
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center font-medium">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-24 selection:bg-neutral-900 selection:text-white relative">
      {/* Subtle Dot Grid Background */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#fcfcfc]/80 backdrop-blur-2xl border-b border-neutral-200/50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-900 w-full sm:w-auto">
            Product Lens
          </h1>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-100/50 border border-neutral-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:bg-white transition-all"
              />
            </div>
            <button 
              onClick={() => { resetForm(); setIsAdding(true); }}
              className="hidden sm:flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-neutral-900/10 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Capture New
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {products.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
              <Camera className="w-10 h-10 text-neutral-400" />
            </div>
            <h2 className="font-display text-3xl mb-3 text-neutral-900 font-medium tracking-tight">No products yet</h2>
            <p className="text-neutral-500 max-w-sm mb-10 text-lg leading-relaxed">
              Start photographing your products to create a beautiful, elegant catalog with stunning overlays.
            </p>
            <button 
              onClick={() => { resetForm(); setIsAdding(true); }}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-4 rounded-full font-medium transition-all shadow-xl shadow-neutral-900/20 hover:shadow-2xl hover:shadow-neutral-900/30 active:scale-95 text-lg"
            >
              <Plus className="w-5 h-5" />
              Capture First Product
            </button>
          </motion.div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-12 h-12 text-neutral-300 mb-4" />
            <h2 className="font-display text-2xl mb-2 text-neutral-900 font-medium">No results found</h2>
            <p className="text-neutral-500">We couldn't find any products matching "{searchQuery}"</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  onDelete={handleDelete} 
                  onEdit={handleEdit}
                  onShare={handleShareClick}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 sm:hidden z-40">
        <button 
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="w-16 h-16 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full flex items-center justify-center shadow-xl shadow-neutral-900/30 transition-transform active:scale-95"
        >
          <Camera className="w-7 h-7" />
        </button>
      </div>

      {/* Share Preview Modal */}
      <AnimatePresence>
        {sharingProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSharingProduct(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden z-10 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-medium tracking-tight">
                  Share Product
                </h2>
                <button 
                  onClick={() => setSharingProduct(null)}
                  className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-full hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-neutral-100 rounded-[24px] aspect-[4/5] overflow-hidden relative mb-6 flex items-center justify-center">
                {sharePreviewUrl ? (
                  <img src={sharePreviewUrl} alt="Share Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 gap-2">
                    <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                    <span className="text-sm font-medium">Generating...</span>
                  </div>
                )}
              </div>

              <button 
                onClick={executeShare}
                disabled={!sharePreviewUrl}
                className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 text-white rounded-2xl py-4 font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-neutral-900/20 active:scale-95 disabled:active:scale-100 disabled:shadow-none"
              >
                Share Photo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full h-full sm:h-auto sm:max-h-full sm:max-w-md bg-white sm:rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden z-10"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-100">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  {editingId ? 'Edit Product' : 'New Product'}
                </h2>
                <button 
                  onClick={resetForm}
                  className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-full hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Image Section */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3 ml-1">
                    Product Photo
                  </label>
                  
                  {image ? (
                    <div className="relative aspect-[4/5] rounded-[24px] overflow-hidden bg-neutral-100 group shadow-inner">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setImage(null)}
                        className="absolute top-4 right-4 p-2.5 bg-black/50 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70 hover:scale-110"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-3 aspect-square rounded-[24px] border-2 border-dashed border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100 hover:border-neutral-300 transition-all text-neutral-600 active:scale-95"
                      >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Take Photo</span>
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-3 aspect-square rounded-[24px] border-2 border-dashed border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100 hover:border-neutral-300 transition-all text-neutral-600 active:scale-95"
                      >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Upload File</span>
                      </button>
                      
                      {/* Hidden Inputs */}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        ref={cameraInputRef}
                        onChange={handleImageCapture}
                      />
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImageCapture}
                      />
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                      Product Name
                    </label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Minimalist Ceramic Vase"
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-medium text-lg placeholder:font-normal placeholder:text-neutral-400"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                        Quantity
                      </label>
                      <input 
                        type="text" 
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 50 pcs"
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-medium placeholder:font-normal placeholder:text-neutral-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                        N.RATE:
                      </label>
                      <input 
                        type="text" 
                        value={netRate}
                        onChange={(e) => setNetRate(e.target.value)}
                        placeholder="e.g. $19.99"
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-medium placeholder:font-normal placeholder:text-neutral-400"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                      MRP:
                    </label>
                    <input 
                      type="text" 
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="e.g. $24.99"
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-medium placeholder:font-normal placeholder:text-neutral-400"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-neutral-100 bg-neutral-50/50">
                <button 
                  onClick={handleSave}
                  disabled={!image || !name}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 text-white rounded-2xl py-4 font-medium transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-neutral-900/20 active:scale-95 disabled:active:scale-100 disabled:shadow-none"
                >
                  {editingId ? 'Save Changes' : 'Save Product'}
                </button>
              </div>
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

