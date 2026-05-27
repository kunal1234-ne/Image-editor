import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  Lock, 
  Unlock, 
  Download, 
  Trash2, 
  History, 
  Check, 
  Sparkles, 
  X, 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  Sliders,
  Scaling,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  Wand2,
  RefreshCw
} from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';
import { 
  formatBytes, 
  resizeImageToWebP, 
  generateId 
} from './utils';
import { 
  FitMode, 
  ImageDimensions, 
  ResizePreset, 
  TaskHistoryItem,
  BackgroundImage
} from './types';

// Constants for Standard Presets
const RESIZE_PRESETS: ResizePreset[] = [
  { id: 'insta_sq', name: 'Instagram Square', category: 'Social', width: 1080, height: 1080 },
  { id: 'insta_port', name: 'Instagram Portrait', category: 'Social', width: 1080, height: 1350 },
  { id: 'insta_story', name: 'Instagram Story', category: 'Social', width: 1080, height: 1920 },
  { id: 'yt_thumb', name: 'YouTube Thumbnail', category: 'Social', width: 1280, height: 720 },
  { id: 'fhd_banner', name: 'Full HD Web', category: 'Web', width: 1920, height: 1080 },
  { id: 'hd_web', name: 'Standard HD', category: 'Web', width: 1280, height: 720 },
  { id: 'avatar', name: 'Profile Avatar', category: 'Web', width: 512, height: 512 },
  { id: 'favicon', name: 'Favicon / Icon', category: 'Web', width: 64, height: 64 },
];

export default function App() {
  // Dark Mode Theme Toggle States
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('webp_resizer_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('webp_resizer_theme', theme);
  }, [theme]);

  // Image Source & File States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Background States
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('webp_resizer_backgrounds');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse backgrounds from localStorage', e);
      }
    }
    return [];
  });
  const [selectedBgId, setSelectedBgId] = useState<string | null>(null);
  const [bgImgElement, setBgImgElement] = useState<HTMLImageElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedBgId) {
      setBgImgElement(null);
      return;
    }
    const bg = backgrounds.find(b => b.id === selectedBgId);
    if (bg) {
      const img = new Image();
      img.onload = () => setBgImgElement(img);
      img.src = bg.dataUrl;
    } else {
      setBgImgElement(null);
    }
  }, [selectedBgId, backgrounds]);

  // original dimensions
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);

  // target inputs
  const [targetWidth, setTargetWidth] = useState<string>('0');
  const [targetHeight, setTargetHeight] = useState<string>('0');

  // state variables
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<FitMode>('stretch');
  const [quality, setQuality] = useState<number>(80); // percentage 10-100

  // Image Offset States for Positioning over bg
  const [imageOffsetX, setImageOffsetX] = useState<number>(0);
  const [imageOffsetY, setImageOffsetY] = useState<number>(0);
  const [imageScale, setImageScale] = useState<number>(100);
  const [cropShape, setCropShape] = useState<'rect' | 'circle'>('rect');
  const [interactionMode, setInteractionMode] = useState<'compare' | 'move'>('compare');
  const [isDraggingMove, setIsDraggingMove] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  // Preview WebP State
  const [resizedPreviewUrl, setResizedPreviewUrl] = useState<string>('');
  const [resizedSize, setResizedSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const [removeBg, setRemoveBg] = useState<boolean>(false);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [processedImgElement, setProcessedImgElement] = useState<HTMLImageElement | null>(null);

  // Custom Live Canvas Reference for 60fps interaction
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Before / After Slider Position
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // History State (Persisted in localStorage)
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);

  // Selected Preset state (for styling)
  const [activePresetId, setActivePresetId] = useState<string>('');

  // Background removal effect
  useEffect(() => {
    if (!removeBg || !imageSrc) {
      setProcessedImgElement(null);
      return;
    }

    let isMounted = true;
    setIsRemovingBg(true);
    
    removeBackground(imageSrc)
      .then((blob) => {
        if (!isMounted) return;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          if (!isMounted) return;
          setProcessedImgElement(img);
          setIsRemovingBg(false);
        };
        img.src = url;
      })
      .catch((err) => {
        console.error("Error removing background", err);
        if (isMounted) setIsRemovingBg(false);
      });

    return () => {
      isMounted = false;
    };
  }, [removeBg, imageSrc]);

  // Initial Load of History
  useEffect(() => {
    const saved = localStorage.getItem('webp_resizer_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
  }, []);

  // Sync History to LocalStorage
  const saveHistory = (newHistory: TaskHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('webp_resizer_history', JSON.stringify(newHistory));
  };

  const getAspectRatio = () => {
    if (originalWidth === 0 || originalHeight === 0) return 1;
    return originalWidth / originalHeight;
  };

  const numericWidth = parseInt(targetWidth, 10) || 0;
  const numericHeight = parseInt(targetHeight, 10) || 0;

  // Handle file input triggering
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processSelectedFile(files[0]);
    }
  };

  const saveBackgrounds = (newBgs: BackgroundImage[]) => {
    setBackgrounds(newBgs);
    try {
      localStorage.setItem('webp_resizer_backgrounds', JSON.stringify(newBgs));
    } catch (err) {
      console.warn('Could not save background to localStorage, quota exceeded?', err);
    }
  };

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert('Selected file is not an image');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const newBg: BackgroundImage = {
          id: generateId(),
          dataUrl: src,
          name: file.name
        };
        saveBackgrounds([...backgrounds, newBg]);
        setSelectedBgId(newBg.id);
      };
      reader.readAsDataURL(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Selected file is not an image. Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);

      const img = new Image();
      img.onload = () => {
        setImgElement(img);
        setOriginalWidth(img.naturalWidth);
        setOriginalHeight(img.naturalHeight);
        
        // Reset crop/fit modes and target outputs
        setTargetWidth(img.naturalWidth.toString());
        setTargetHeight(img.naturalHeight.toString());
        setLockAspectRatio(true);
        setActivePresetId('');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    setImageFile(file);
  };

  // Drag-and-drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Keep dimensions linked based on lock aspect ratio rule
  const handleWidthChange = (valStr: string) => {
    setTargetWidth(valStr);
    setActivePresetId(''); // clear active preset if manual change
    const val = parseInt(valStr, 10) || 0;
    if (lockAspectRatio && originalWidth > 0 && originalHeight > 0) {
      const ratio = getAspectRatio();
      const nextHeight = Math.round(val / ratio);
      setTargetHeight(nextHeight.toString());
    }
  };

  const handleHeightChange = (valStr: string) => {
    setTargetHeight(valStr);
    setActivePresetId(''); // clear active preset if manual change
    const val = parseInt(valStr, 10) || 0;
    if (lockAspectRatio && originalWidth > 0 && originalHeight > 0) {
      const ratio = getAspectRatio();
      const nextWidth = Math.round(val * ratio);
      setTargetWidth(nextWidth.toString());
    }
  };

  // Apply Dimension scaling %
  const applyScalingPercentage = (percentage: number) => {
    if (originalWidth === 0 || originalHeight === 0) return;
    const nextWidth = Math.round(originalWidth * (percentage / 100));
    const nextHeight = Math.round(originalHeight * (percentage / 100));
    setTargetWidth(nextWidth.toString());
    setTargetHeight(nextHeight.toString());
    setActivePresetId('');
  };

  // Select Preset Handler
  const applyPreset = (preset: ResizePreset) => {
    setLockAspectRatio(false); // Disable lock briefly to apply exact dimension parameters
    setTargetWidth(preset.width.toString());
    setTargetHeight(preset.height.toString());
    setActivePresetId(preset.id);
  };

  // Live Canvas Render for 60fps UI Dragging
  useEffect(() => {
    const currentImgElement = processedImgElement || imgElement;
    if (previewCanvasRef.current && currentImgElement && parseInt(targetWidth, 10) > 0 && parseInt(targetHeight, 10) > 0) {
      import('./utils').then(({ drawImageToCanvas }) => {
        if (!previewCanvasRef.current) return;
        drawImageToCanvas(
          previewCanvasRef.current,
          currentImgElement,
          parseInt(targetWidth, 10),
          parseInt(targetHeight, 10),
          fitMode,
          bgImgElement,
          imageOffsetX,
          imageOffsetY,
          imageScale,
          cropShape
        );
      });
    }
  }, [imgElement, processedImgElement, targetWidth, targetHeight, fitMode, bgImgElement, imageOffsetX, imageOffsetY, imageScale, cropShape]);

  // Interactive Live Preview Generation (Debounced) - Only for WebP Blob & Display
  useEffect(() => {
    const currentImgElement = processedImgElement || imgElement;
    if (!currentImgElement || numericWidth <= 0 || numericHeight <= 0) {
      setResizedPreviewUrl('');
      setResizedSize(0);
      return;
    }

    if (isDraggingMove) return; // Prevent heavy encoding while just dragging visually

    setIsProcessing(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const qualityFactor = quality / 100;
        const result = await resizeImageToWebP(
          currentImgElement,
          numericWidth,
          numericHeight,
          fitMode,
          qualityFactor,
          bgImgElement,
          imageOffsetX,
          imageOffsetY,
          imageScale,
          cropShape
        );
        setResizedPreviewUrl(result.dataUrl);
        setResizedSize(result.size);
      } catch (err) {
        console.error('Error generating live WebP:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [imgElement, processedImgElement, numericWidth, numericHeight, fitMode, quality, bgImgElement, imageOffsetX, imageOffsetY, imageScale, cropShape, isDraggingMove]);

  // Handle pointer down for dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode === 'move') {
      setIsDraggingMove(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setDragStartOffset({ x: imageOffsetX, y: imageOffsetY });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  // Before / After Slider Mouse Move / Touch Move or Image Dragging
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode === 'compare') {
      if (!sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const position = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
      setSliderPosition(position);
    } else if (interactionMode === 'move' && isDraggingMove) {
      if (!sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const numericWidth = parseInt(targetWidth, 10);
      const numericHeight = parseInt(targetHeight, 10);
      
      // Calculate scale ratio between container display and actual pixels
      const scaleRatio = Math.min(rect.width / numericWidth, rect.height / numericHeight);
      
      const dx = (e.clientX - dragStartPos.x) / scaleRatio;
      const dy = (e.clientY - dragStartPos.y) / scaleRatio;
      
      setImageOffsetX(Math.round(dragStartOffset.x + dx));
      setImageOffsetY(Math.round(dragStartOffset.y + dy));
    }
  };

  // Handle pointer up to stop dragging
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode === 'move') {
      setIsDraggingMove(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Download Resized Image to WebP & Log to Task History
  const triggerExport = () => {
    if (!resizedPreviewUrl || !imageFile) return;

    // Trigger standard browser download
    const link = document.createElement('a');
    const originalBaseName = imageFile.name.substring(0, imageFile.name.lastIndexOf('.')) || imageFile.name;
    const targetFileName = `${originalBaseName}_${numericWidth}x${numericHeight}.webp`;
    
    link.href = resizedPreviewUrl;
    link.download = targetFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save task to history list for daily trackers
    const newHistoryItem: TaskHistoryItem = {
      id: generateId(),
      fileName: targetFileName,
      originalFormat: imageFile.type.split('/')[1] || 'unknown',
      originalSize: imageFile.size,
      resizedSize: resizedSize,
      originalWidth: originalWidth,
      originalHeight: originalHeight,
      resizedWidth: numericWidth,
      resizedHeight: numericHeight,
      quality: quality,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      downloadUrl: resizedPreviewUrl,
    };

    saveHistory([newHistoryItem, ...history]);
  };

  // File Reset
  const resetFile = () => {
    setImageFile(null);
    setImageSrc('');
    setImgElement(null);
    setProcessedImgElement(null);
    setRemoveBg(false);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setTargetWidth('0');
    setTargetHeight('0');
    setResizedPreviewUrl('');
    setResizedSize(0);
    setActivePresetId('');
    setImageOffsetX(0);
    setImageOffsetY(0);
    setImageScale(100);
    setCropShape('rect');
  };

  const deleteHistoryItem = (id: string) => {
    const filtered = history.filter(item => item.id !== id);
    saveHistory(filtered);
  };

  const clearAllHistory = () => {
    if (confirm('Are you sure you want to clear your daily task logs? This is irreversible.')) {
      saveHistory([]);
    }
  };

  // Compression savings percentage
  const savingsPercent = imageFile && resizedSize > 0 
    ? Math.round(((imageFile.size - resizedSize) / imageFile.size) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors selection:bg-indigo-100 dark:selection:bg-indigo-950 selection:text-indigo-900 dark:selection:text-indigo-200">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-sm">
              <Scaling className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight" id="main_title">Daily WebP Task Resizer</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Resize any image to crystal clear WebP with exact pixel controls</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs flex items-center justify-center"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/30 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm border border-indigo-200 dark:border-indigo-900"
              id="upload-button-header"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* NO IMAGE STATE */}
        {!imageFile && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center mt-8"
          >
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]' 
                  : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md'
              }`}
            >
              <div className="p-5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full mb-6">
                <Upload className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Drag and drop your task image</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                Supports all formats (PNG, JPG, BMP, GIF, WebP, SVG) and outputs as optimized WebP file formats.
              </p>
              <span className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all">
                Select File From Device
              </span>
            </div>

            {/* DAILY TASK LOG OVERVIEW (WHEN NOTHING LOADED) */}
            {history.length > 0 && (
              <div className="mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-left shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-bold text-slate-900 dark:text-white">Today's Resizing Tasks ({history.length})</h4>
                  </div>
                  <button 
                    onClick={clearAllHistory}
                    className="text-slate-400 hover:text-red-500 font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Logs
                  </button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {history.map((item) => {
                    const reductionPercent = Math.round(((item.originalSize - item.resizedSize) / item.originalSize) * 100);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 group transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 p-2 rounded-lg font-mono text-center min-w-[50px] shrink-0 text-xs font-bold leading-none">
                            WEBP
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-150 truncate max-w-[240px]">{item.fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-400 font-medium">
                              <span>{item.resizedWidth} × {item.resizedHeight} px</span>
                              <span>•</span>
                              <span>{formatBytes(item.resizedSize)}</span>
                              {reductionPercent > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.2 rounded">
                                  -{reductionPercent}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">At {item.timestamp}</span>
                          <a 
                            href={item.downloadUrl}
                            download={item.fileName}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg hover:shadow-xs transition-all cursor-pointer"
                            title="Re-download completed item"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Remove log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* WORKSPACE PREVIEW (WHEN FILE IS LOADED) */}
        {imageFile && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: EDITINGCONTROLS (SPAN 5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* FILE SPECIFICATION PANEL */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[200px] sm:max-w-xs">{imageFile.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide font-mono">
                        {imageFile.type.split('/')[1] || 'UNKNOWN'} FORMAT • {formatBytes(imageFile.size)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={resetFile}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                    title="Upload another file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-950/60 rounded-xl p-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Original Dimensions</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{originalWidth} × {originalHeight} px</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Aspect Ratio</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{getAspectRatio().toFixed(2)}:1</p>
                  </div>
                </div>
              </div>

              {/* TARGET PIXELS & DIMENSIONS PANEL */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Resize Resolution</h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Width input */}
                    <div className="relative flex-1">
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold uppercase text-slate-400 tracking-wider">Width (px)</label>
                      <input 
                        type="number"
                        min="1"
                        max="16000"
                        value={targetWidth}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl pt-5 pb-2 px-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 font-mono focus:outline-hidden transition-all"
                      />
                    </div>

                    {/* Aspect Lock */}
                    <button 
                      onClick={() => {
                        const nextLock = !lockAspectRatio;
                        setLockAspectRatio(nextLock);
                        if (nextLock && originalWidth > 0 && originalHeight > 0) {
                          // Immediately sync height based on width
                          const ratio = getAspectRatio();
                          const currentW = parseInt(targetWidth, 10) || 0;
                          const syncedH = Math.round(currentW / ratio);
                          setTargetHeight(syncedH.toString());
                        }
                      }}
                      className={`p-3 border rounded-xl transition-all cursor-pointer ${
                        lockAspectRatio 
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                      title={lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                    >
                      {lockAspectRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>

                    {/* Height input */}
                    <div className="relative flex-1">
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold uppercase text-slate-400 tracking-wider">Height (px)</label>
                      <input 
                        type="number"
                        min="1"
                        max="16000"
                        value={targetHeight}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-705 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl pt-5 pb-2 px-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 font-mono focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Scaling Factor Quick Buttons */}
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-2">Quick Scaling Controls</span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[25, 50, 75, 100, 150, 200].map((percent) => (
                      <button
                        key={percent}
                        onClick={() => applyScalingPercentage(percent)}
                        className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-905 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset List Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Dimensions presets for tasks</span>
                  </div>
                  <div className="max-h-[160px] overflow-y-auto border border-slate-100 dark:border-slate-800/80 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-950/60 pr-1">
                    {RESIZE_PRESETS.map((preset) => {
                      const isActive = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer transition-all ${
                            isActive 
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' 
                              : 'hover:bg-slate-100 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{preset.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{preset.category} Dimensions</span>
                          </div>
                          <span className="font-mono text-xs font-bold leading-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 px-2 rounded-md shadow-xs text-slate-800 dark:text-slate-200">
                            {preset.width} × {preset.height} px
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STRETCH / CROP FIT ENGINE CONFIG */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Resizing Adaptation Method</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'stretch', label: 'Stretch', desc: 'Ignore ratio, fill exact box' },
                      { id: 'fit', label: 'Box Fit', desc: 'Letterbox padding, keep aspect' },
                      { id: 'fill', label: 'Crop Fill', desc: 'Fill completely, crop surplus' },
                    ].map((mode) => {
                      const isSelected = fitMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setFitMode(mode.id as FitMode)}
                          className={`p-3 text-center border rounded-xl flex flex-col justify-between items-center transition cursor-pointer min-h-[90px] h-full ${
                            isSelected 
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-bold">{mode.label}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-auto leading-tight">{mode.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Background Selection */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500">Custom Background Layer</h3>
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Add Image
                    </button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={bgInputRef}
                      onChange={handleBgFileChange} 
                      className="hidden" 
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedBgId(null)}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                        selectedBgId === null 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      }`}
                      title="No Background (Transparent)"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                    
                    {backgrounds.map((bg) => (
                      <div key={bg.id} className="relative group">
                        <button
                          onClick={() => setSelectedBgId(bg.id)}
                          className={`w-12 h-12 rounded-xl border-2 overflow-hidden bg-white shadow-sm transition-all cursor-pointer block ${
                            selectedBgId === bg.id 
                              ? 'border-indigo-500 scale-105' 
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                          title={bg.name}
                        >
                          <img src={bg.dataUrl || undefined} alt={bg.name} className="w-full h-full object-cover" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newBgs = backgrounds.filter(b => b.id !== bg.id);
                            saveBackgrounds(newBgs);
                            if (selectedBgId === bg.id) setSelectedBgId(null);
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm cursor-pointer"
                          title="Remove Background"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Foreground Adjustments (Scale & Crop) */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       <Wand2 className="w-4 h-4 text-indigo-500" />
                       Magic AI Foreground
                    </h3>
                    <button
                      onClick={() => setRemoveBg(!removeBg)}
                      disabled={isRemovingBg}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        removeBg ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                      } ${isRemovingBg ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="sr-only">Remove Background</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          removeBg ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {isRemovingBg && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-2 rounded-lg">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Processing AI background removal...
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Foreground Scale</span>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-1 px-2.5 rounded-lg font-mono">
                        {imageScale}%
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={imageScale}
                      onChange={(e) => setImageScale(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                    />
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">Foreground Crop Shape</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCropShape('rect')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          cropShape === 'rect'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 border'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent border'
                        }`}
                      >
                        Rectangle
                      </button>
                      <button
                        onClick={() => setCropShape('circle')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          cropShape === 'circle'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 border'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent border'
                        }`}
                      >
                        Circle Overlay
                      </button>
                    </div>
                  </div>
                </div>

                {/* WebP Quality factor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">WebP Compression Quality</span>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-1 px-2.5 rounded-lg font-mono">
                      {quality}%
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 font-medium">
                    <span>Highest Speed</span>
                    <span>Balanced (Default)</span>
                    <span>Max Size</span>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: PREVIEW SLIDER & SAVINGS (SPAN 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* SAVINGS GRAPH & DOWNLOAD ACTIONS HEADER */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs font-sans">
                
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Export Summary Result</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center mb-6">
                  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Output File Extension</span>
                    <p className="text-lg font-extrabold text-blue-700 dark:text-blue-400 mt-0.5">.WEBP</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Final Sizing</span>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                      {isProcessing ? 'Estimating...' : formatBytes(resizedSize)}
                    </p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/60 col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider font-mono">Byte Savings Factor</span>
                    <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {isProcessing ? '...' : `${savingsPercent}% Off`}
                    </p>
                  </div>
                </div>

                {/* LARGE ACTION DOWNLOAD EXPORT BUTTON */}
                <button
                  onClick={triggerExport}
                  disabled={!resizedPreviewUrl || isProcessing}
                  className={`w-full text-center py-4 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer ${
                    !resizedPreviewUrl || isProcessing
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  <span>Download WebP Resized Image</span>
                </button>

              </div>

              {/* VISUAL BEFORE/AFTER SLIDER PREVIEW */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Visual Before & After Comparison</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {interactionMode === 'compare' ? 'Hover/Drag slider left-to-right to inspect differences in detail' : 'Click and drag the image below to align it over the background'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {bgImgElement && (
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                          onClick={() => setInteractionMode('compare')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                            interactionMode === 'compare' 
                              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' 
                              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer'
                          }`}
                        >
                          Compare
                        </button>
                        <button
                          onClick={() => setInteractionMode('move')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                            interactionMode === 'move' 
                              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' 
                              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer'
                          }`}
                        >
                          Adjust Position
                        </button>
                        {(imageOffsetX !== 0 || imageOffsetY !== 0) && (
                          <button
                            onClick={() => { setImageOffsetX(0); setImageOffsetY(0); }}
                            className="px-3 py-1.5 text-xs font-bold rounded-md transition-all text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                            title="Reset Position"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-slate-400">
                      <span className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">Original &rarr; Left</span>
                      <span>•</span>
                      <span className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">WebP &rarr; Right</span>
                    </div>
                  </div>
                </div>

                {/* THE COMPARISON SLIDER BOX */}
                <div 
                  ref={sliderContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`relative h-[340px] bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 select-none group touch-none ${
                    interactionMode === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-ew-resize'
                  }`}
                >
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex flex-col items-center justify-center z-20 backdrop-blur-xs">
                      <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-3">Recalculating canvas export pixels...</span>
                    </div>
                  )}

                  {/* Right Half: WebP Live Preview (Canvas) */}
                  <canvas 
                    ref={previewCanvasRef}
                    className="absolute inset-0 w-full h-full object-contain p-2"
                  />

                  {/* Left Half: Original Image (Clipped inside width of sliderPosition) */}
                  {interactionMode === 'compare' && (
                    <>
                      <div 
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                      >
                        <img 
                          src={imageSrc || undefined} 
                          alt="Original" 
                          className="absolute inset-0 w-full h-full object-contain p-2"
                          draggable="false"
                          style={{ width: sliderContainerRef.current?.getBoundingClientRect().width }}
                        />
                      </div>

                      {/* Horizontal Handle Bar */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-indigo-600 border border-white p-2 rounded-full shadow-md text-white flex items-center justify-center">
                          <Maximize2 className="w-3.5 h-3.5 rotate-45" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Sizing indicators in corners */}
                  <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 text-white text-[10px] font-bold font-mono px-2.5 py-1 rounded-md z-1">
                    Original File: {originalWidth} × {originalHeight}px
                  </div>
                  <div className="absolute top-3 right-3 bg-indigo-900/85 backdrop-blur-md border border-indigo-800 text-white text-[10px] font-bold font-mono px-2.5 py-1 rounded-md z-1">
                    Export WebP: {numericWidth} × {numericHeight}px
                  </div>

                </div>

              </div>

              {/* DAILY TASK COMPLETE LOG TABLE (VISIBLE ONLY WHEN ACTIVE FILE REZISING IS UP) */}
              {history.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Task History Log (Today)</h4>
                    </div>
                    <button 
                      onClick={clearAllHistory}
                      className="text-slate-400 hover:text-red-500 font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Logs
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {history.map((item) => {
                      const reductionPercent = Math.round(((item.originalSize - item.resizedSize) / item.originalSize) * 100);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:border-slate-200 dark:hover:border-slate-705 group transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg font-mono text-center min-w-[50px] shrink-0 text-[10px] font-bold leading-none">
                              WEBP
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">{item.fileName}</p>
                              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-400 font-medium">
                                <span>{item.resizedWidth} × {item.resizedHeight} px</span>
                                <span>•</span>
                                <span>{formatBytes(item.resizedSize)}</span>
                                {reductionPercent > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.2 rounded">
                                    -{reductionPercent}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono hidden md:inline-block">At {item.timestamp}</span>
                            <a 
                              href={item.downloadUrl}
                              download={item.fileName}
                              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg hover:shadow-xs transition-all cursor-pointer"
                              title="Re-download completed item"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => deleteHistoryItem(item.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Remove log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-850 mt-16 py-8 px-6 bg-slate-100 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <p className="font-semibold">&copy; Daily WebP Task Resizer Utility. Offline-first, and completely secure in-browser conversion.</p>
          <div className="flex gap-4">
            <span>Powered by HTML5 Canvas &amp; WebP encoder</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
