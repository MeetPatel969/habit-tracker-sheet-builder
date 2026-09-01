/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, ArrowUp, ArrowDown, Plus, Download, Loader2, ListTodo, Palette, Smile, X, AlertTriangle, RectangleHorizontal, RectangleVertical, Share2, Link as LinkIcon, Twitter, MessageCircle, Facebook, ChevronLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import EmojiPicker from 'emoji-picker-react';
import twemoji from 'twemoji';

import LZString from 'lz-string';

/**
 * A robust component to render Twemoji images instead of native emoji characters.
 * Useful for consistent rendering across browsers and accurate PDF exports via html-to-image.
 */
function Twemoji({ emoji, className }: { emoji: string; className?: string }) {
  const [hasError, setHasError] = useState(false);
  
  // Reset error state if the emoji changes
  useEffect(() => {
    setHasError(false);
  }, [emoji]);

  if (!emoji) return null;
  
  // If image fails to load, gracefully fallback to the native OS emoji text
  if (hasError) {
    return <span className={className}>{emoji}</span>;
  }

  try {
    const codePoint = twemoji.convert.toCodePoint(emoji);
    const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codePoint}.svg`;

    return (
      <img
        src={url}
        alt={emoji}
        crossOrigin="anonymous"
        className={className}
        style={{ width: '1em', height: '1em', display: 'inline-block', verticalAlign: '-0.1em' }}
        onError={() => setHasError(true)}
      />
    );
  } catch (e) {
    // If toCodePoint fails, fallback to native emoji
    return <span className={className}>{emoji}</span>;
  }
}


const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PRESETS = [
  { name: 'Minimal', accentColor: '#000000', textColor: '#000000', fontFamily: '"Inter", sans-serif' },
  { name: 'Classic', accentColor: '#3B82F6', textColor: '#000000', fontFamily: '"Playfair Display", serif' },
  { name: 'Pastel', accentColor: '#EC4899', textColor: '#8B5CF6', fontFamily: '"Quicksand", sans-serif' },
  { name: 'Bold', accentColor: '#EF4444', textColor: '#000000', fontFamily: '"Fredoka", sans-serif' },
  { name: 'Calm', accentColor: '#10B981', textColor: '#000000', fontFamily: '"Inter", sans-serif' },
  { name: 'Playful', accentColor: '#F59E0B', textColor: '#EF4444', fontFamily: '"Mali", cursive' },
];

// Predefined simple colors for the accent color picker.
// We use hex codes so they can be easily passed directly into inline CSS styles.
const COLORS = [
  '#000000', // Black
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

const FONTS = [
  { name: 'Inter (Default)', value: '"Inter", sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'Quicksand (Playful)', value: '"Quicksand", sans-serif' },
  { name: 'Fredoka (Cute)', value: '"Fredoka", sans-serif' },
  { name: 'Caveat (Handwriting)', value: '"Caveat", cursive' },
  { name: 'Pacifico (Fun)', value: '"Pacifico", cursive' },
  { name: 'Mali (Playful)', value: '"Mali", cursive' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
];

export default function App() {
  // --- STATE MANAGEMENT ---
  const today = new Date();
  interface Habit {
    id: string;
    name: string;
    icon?: string;
  }

  // --- APP STATE ---
  type AppState = {
    habits: Habit[];
    month: number;
    year: number;
    showCalendar: boolean;
    accentColor: string;
    textColor: string;
    fontFamily: string;
    orientation: 'landscape' | 'portrait';
  };

  const [state, setState] = useState<AppState>(() => {
    const defaultState: AppState = {
      habits: [
        { id: '1', name: 'Drink 2L Water' },
        { id: '2', name: 'Read 10 pages' }
      ],
      month: today.getMonth(),
      year: today.getFullYear(),
      showCalendar: true,
      accentColor: COLORS[0],
      textColor: COLORS[0],
      fontFamily: FONTS[0].value,
      orientation: 'landscape'
    };

    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = LZString.decompressFromEncodedURIComponent(hash);
        if (decoded) {
          const parsed = JSON.parse(decoded);
          
          // Check if it's the old format (contains 'habits' key)
          if (parsed.habits) {
            return { ...defaultState, ...parsed };
          }
          
          // New optimized format
          const mappedState: any = { ...defaultState };
          if (parsed.h) {
            mappedState.habits = parsed.h.map((h: any) => ({
              id: h.i,
              name: h.n,
              icon: h.ic
            }));
          }
          if (parsed.m !== undefined) mappedState.month = parsed.m;
          if (parsed.y !== undefined) mappedState.year = parsed.y;
          if (parsed.sc !== undefined) mappedState.showCalendar = parsed.sc;
          if (parsed.ac !== undefined) mappedState.accentColor = parsed.ac;
          if (parsed.tc !== undefined) mappedState.textColor = parsed.tc;
          if (parsed.f !== undefined) mappedState.fontFamily = parsed.f;
          if (parsed.o !== undefined) mappedState.orientation = parsed.o;
          
          return mappedState;
        }
      } catch (e) {
        console.error("Failed to parse shared design from URL", e);
      }
    }
    
    return defaultState;
  });

  const { habits, month, year, showCalendar, accentColor, textColor, fontFamily, orientation } = state;

  const updateState = (updates: Partial<AppState>) => {
    setState(curr => ({ ...curr, ...updates }));
  };

  // 'newHabitName' holds the temporary text in the "Add habit" text input box.
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState<string | undefined>(undefined);
  
  // Which habit is currently picking an emoji. 'new' for the new habit form.
  const [pickingEmojiFor, setPickingEmojiFor] = useState<string | null>(null);

  // --- VIEW STATE ---
  const [view, setView] = useState<'editor' | 'export'>('editor');
  
  // Track left panel height to scale the preview
  const exportLeftPanelRef = useRef<HTMLDivElement>(null);
  const [exportLeftPanelHeight, setExportLeftPanelHeight] = useState<number>(500);

  useEffect(() => {
    if (view === 'export' && exportLeftPanelRef.current) {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setExportLeftPanelHeight(entries[0].contentRect.height);
        }
      });
      observer.observe(exportLeftPanelRef.current);
      return () => observer.disconnect();
    }
  }, [view]);

  // 'backgroundImage' stores the data URL of the uploaded image
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.15);

  // --- PDF EXPORT STATE ---
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Reference to the A4 container div so html2canvas knows what to capture
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Close emoji picker when clicking outside
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setPickingEmojiFor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLERS ---
  

  const applyPreset = (preset: typeof PRESETS[0]) => {
    updateState({
      accentColor: preset.accentColor,
      textColor: preset.textColor,
      fontFamily: preset.fontFamily,
    });
  };
  
  // Adds a new habit to the list
  const addHabit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the browser from refreshing the page on form submit
    
    if (!newHabitName.trim()) return; // Don't add empty habits

    const newHabit: Habit = {
      id: crypto.randomUUID(), // Generates a random unique ID for the new row
      name: newHabitName.trim(),
      icon: newHabitIcon
    };

    // '...' (spread operator) takes all existing habits and adds the new one to the end
    updateState({ habits: [...habits, newHabit] });
    setNewHabitName(''); // Clear the input field after adding
    setNewHabitIcon(undefined);
  };

  // Removes a habit by keeping everything EXCEPT the one with the matching id
  const removeHabit = (id: string) => {
    updateState({ habits: habits.filter(habit => habit.id !== id) });
  };
  
  const updateHabitIcon = (id: string, icon: string | undefined) => {
    updateState({ habits: habits.map(habit => habit.id === id ? { ...habit, icon } : habit) });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setBackgroundImage(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input so the same file can be uploaded again if needed
    if (e.target) e.target.value = '';
  };


  // Moves a habit up or down in the array
  const moveHabit = (index: number, direction: 'up' | 'down') => {
    // Prevent moving if already at the very top or very bottom
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === habits.length - 1) return;

    // Create a copy of the array so we don't mutate state directly (React rule)
    const newHabits = [...habits];
    
    // Determine the index to swap with
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap the elements in the array
    [newHabits[index], newHabits[swapIndex]] = [newHabits[swapIndex], newHabits[index]];
    
    updateState({ habits: newHabits });
  };

  // --- DATE CALCULATIONS ---
  const title = `${MONTHS[month]} ${year}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday

  // Create an array of objects containing day number and weekday info
  const dayInfo = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return {
      day,
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    };
  });

  // Generate cells for the calendar grid
  const calendarCells: (number | null)[] = [];
  // Pad beginning of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }
  // Pad end of month to complete the 7-day grid rows
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  // --- SHARE LOGIC ---
  const [isCopied, setIsCopied] = useState(false);

  const getShareUrl = () => {
    try {
      const defaultState = {
        month: today.getMonth(),
        year: today.getFullYear(),
        showCalendar: true,
        accentColor: COLORS[0],
        textColor: COLORS[0],
        fontFamily: FONTS[0].value,
        orientation: 'landscape'
      };

      const shortState: any = {
        h: state.habits.map(h => {
          const mapped: any = { i: h.id, n: h.name };
          if (h.icon) mapped.ic = h.icon;
          return mapped;
        })
      };

      if (state.month !== defaultState.month) shortState.m = state.month;
      if (state.year !== defaultState.year) shortState.y = state.year;
      if (state.showCalendar !== defaultState.showCalendar) shortState.sc = state.showCalendar;
      if (state.accentColor !== defaultState.accentColor) shortState.ac = state.accentColor;
      if (state.textColor !== defaultState.textColor) shortState.tc = state.textColor;
      if (state.fontFamily !== defaultState.fontFamily) shortState.f = state.fontFamily;
      if (state.orientation !== defaultState.orientation) shortState.o = state.orientation;

      const json = JSON.stringify(shortState);
      const compressed = LZString.compressToEncodedURIComponent(json);
      const url = new URL(window.location.href);
      url.hash = compressed;
      return url.toString();
    } catch (e) {
      console.error("Failed to generate share link", e);
      return window.location.href;
    }
  };

  const shareDesign = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    console.log(`Share URL length: ${url.length} chars`);
  };

  // --- PDF EXPORT LOGIC ---
  const exportToPDF = async () => {
    if (!sheetRef.current) return;
    
    setIsExporting(true);
    setExportError(null);

    try {
      // 1. Capture the DOM element as a canvas/image.
      // html-to-image converts the DOM node directly into a PNG data URL.
      // We set a multiplier to scale up the resolution for a crisper print.
      const rect = sheetRef.current.getBoundingClientRect();
      console.log(`Container before capture: ${rect.width}x${rect.height} (ratio: ${rect.width / rect.height})`);

      const dataUrl = await toPng(sheetRef.current, {
        pixelRatio: 2, // Equivalent to scale: 2 for better print quality
      });

      // 2. Create a new jsPDF instance
      // 'l' = landscape, 'p' = portrait, 'mm' = millimeters, 'a4' = standard paper size
      const pdf = new jsPDF({
        orientation: orientation === 'landscape' ? 'l' : 'p',
        unit: 'mm',
        format: 'a4',
      });

      // 3. Calculate dimensions
      // A4 landscape dimensions are 297 x 210 mm
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      // 4. Add the image to the PDF
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfPageHeight);

      // 5. Download the PDF
      const filename = title ? `${title.replace(/\s+/g, '_')}_Tracker.pdf` : 'Habit_Tracker.pdf';
      pdf.save(filename);
    } catch (error) {
      console.error('PDF Export Error:', error);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const sheetPhysicalHeightPx = orientation === 'landscape' ? 793.7 : 1122.5;
  const exportScale = exportLeftPanelHeight / sheetPhysicalHeightPx;

  return (
    <div className={`flex h-screen w-full font-sans text-gray-900 overflow-hidden ${view === 'export' ? 'bg-[#F5F2ED] items-center justify-center gap-16' : 'bg-[#EDE9E1]'}`}>
      
      {/* LEFT PANEL: CONTROLS SIDEBAR */}
      {view === 'editor' && (
      <div className="w-80 bg-[#F5F2ED] border-r border-[#E5E0D8] flex flex-col overflow-y-auto shrink-0 shadow-sm z-10 relative">
        <div className="sticky top-0 z-20 bg-[#F5F2ED] border-b border-[#E5E0D8] p-6 pb-4 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold mb-1">StreakSheet</h1>
              <p className="text-sm text-gray-500">Design your printable tracker.</p>
            </div>
          </div>
          <button
            onClick={() => setView('export')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors font-medium shadow-sm"
          >
            Export as PDF <ChevronLeft className="rotate-180 w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-8 pt-6">
        {/* Orientation Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Orientation</label>
          <div className="flex bg-black/5 p-1 rounded-md">
            <button
              onClick={() => updateState({ orientation: 'landscape' })}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded transition-all ${
                orientation === 'landscape' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <RectangleHorizontal size={16} /> Landscape
            </button>
            <button
              onClick={() => updateState({ orientation: 'portrait' })}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded transition-all ${
                orientation === 'portrait' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <RectangleVertical size={16} /> Portrait
            </button>
          </div>
        </div>

        {/* Title Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Month & Year</label>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => updateState({ month: Number(e.target.value) })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => updateState({ year: Number(e.target.value) })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Calendar Toggle */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCalendar}
              onChange={(e) => updateState({ showCalendar: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="text-sm font-semibold text-gray-700">Show Daily Notes Calendar</span>
          </label>
        </div>

        {/* Theme Presets */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Theme Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => {
              const isActive = accentColor === preset.accentColor && textColor === preset.textColor && fontFamily === preset.fontFamily;
              return (
                <button
                  key={preset.name}
                  onClick={() => {
                    updateState({ accentColor: preset.accentColor });
                    updateState({ textColor: preset.textColor });
                    updateState({ fontFamily: preset.fontFamily });
                  }}
                  className={`p-2 rounded border-2 flex flex-col items-center justify-center transition-all ${
                    isActive ? 'border-gray-900 bg-black/5 scale-105' : 'border-[#E5E0D8] hover:border-gray-300 bg-white'
                  }`}
                  title={`${preset.name} Theme`}
                >
                  <span className="text-xl leading-none mb-1 font-bold" style={{ color: preset.accentColor, fontFamily: preset.fontFamily }}>Aa</span>
                  <span className="text-[10px] uppercase font-bold text-gray-500">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Accent Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateState({ accentColor: color })}
                className={`w-8 h-8 rounded-full border-2 ${
                  accentColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                } transition-all duration-150`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
            <label 
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-150 relative bg-black/5 ${
                !COLORS.includes(accentColor) ? 'border-gray-900 scale-110' : 'border-gray-300'
              }`}
              title="Custom Accent Color"
            >
              <Palette className="w-4 h-4 text-gray-700" />
              <input
                type="color"
                value={accentColor}
                onChange={(e) => updateState({ accentColor: e.target.value })}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Text Color Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Text Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={`text-${color}`}
                onClick={() => updateState({ textColor: color })}
                className={`w-8 h-8 rounded-full border-2 ${
                  textColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                } transition-all duration-150`}
                style={{ backgroundColor: color }}
                aria-label={`Select text color ${color}`}
              />
            ))}
            <label 
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-150 relative bg-black/5 ${
                !COLORS.includes(textColor) ? 'border-gray-900 scale-110' : 'border-gray-300'
              }`}
              title="Custom Text Color"
            >
              <Palette className="w-4 h-4 text-gray-700" />
              <input
                type="color"
                value={textColor}
                onChange={(e) => updateState({ textColor: e.target.value })}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Font Style Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Text Style</label>
          <select
            value={fontFamily}
            onChange={(e) => updateState({ fontFamily: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {FONTS.map((font) => (
              <option key={font.name} value={font.value}>{font.name}</option>
            ))}
          </select>
        </div>

        {/* Background Image Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Background Image</label>
          {!backgroundImage ? (
            <div>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
                id="bg-image-upload"
              />
              <label 
                htmlFor="bg-image-upload"
                className="w-full flex items-center justify-center px-4 py-2 border border-[#E5E0D8] rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-black/5 cursor-pointer"
              >
                Upload Image
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded border border-gray-200 bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                />
                <button
                  type="button"
                  onClick={() => setBackgroundImage(null)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Opacity</span>
                  <span>{Math.round(bgOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                {bgOpacity > 0.7 && (
                  <div className="bg-amber-50 text-amber-800 text-xs p-2 mt-2 rounded-md flex gap-2 items-start border border-amber-200">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p className="leading-tight">
                      High opacity may make the text on your tracker difficult to read.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Habits Control */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">Habits</label>

          {habits.length > 12 && showCalendar && (
            <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded-md flex gap-2 items-start border border-amber-200">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="leading-tight">
                12+ habits with the calendar enabled may look cramped when printed — consider turning off the calendar or keeping habits under 12 for the best print result.
              </p>
            </div>
          )}

          {/* Add Habit Form */}
          <form onSubmit={addHabit} className="flex gap-2 relative">
            <button
              type="button"
              className="px-2 py-2 border border-gray-300 rounded-md hover:bg-black/5 flex items-center justify-center transition-colors flex-shrink-0 bg-white"
              onClick={() => setPickingEmojiFor('new')}
              title="Pick an icon"
            >
              {newHabitIcon ? <Twemoji emoji={newHabitIcon} className="text-lg leading-none" /> : <Smile size={20} className="text-gray-400" />}
            </button>
            {pickingEmojiFor === 'new' && (
              <div className="absolute top-12 left-0 z-50 shadow-xl" ref={emojiPickerRef}>
                <EmojiPicker 
                  onEmojiClick={(emoji) => {
                    setNewHabitIcon(emoji.emoji);
                    setPickingEmojiFor(null);
                  }}
                  width={300}
                  height={400}
                />
              </div>
            )}
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full min-w-0"
              placeholder="New habit..."
            />
            <button
              type="submit"
              className="bg-gray-900 text-white p-2 rounded-md hover:bg-gray-800 flex items-center justify-center transition-colors flex-shrink-0"
              disabled={!newHabitName.trim()}
            >
              <Plus size={20} />
            </button>
          </form>

          {/* Habits List */}
          <ul className="space-y-2">
            {habits.map((habit, index) => (
              <li key={habit.id} className="flex items-center gap-1 bg-white/60 p-2 rounded border border-[#E5E0D8] relative">
                <button
                  type="button"
                  className="p-1.5 border border-gray-200 rounded hover:bg-gray-200 flex items-center justify-center transition-colors bg-white flex-shrink-0"
                  onClick={() => setPickingEmojiFor(habit.id)}
                  title="Change icon"
                >
                  {habit.icon ? <Twemoji emoji={habit.icon} className="text-sm leading-none" /> : <Smile size={16} className="text-gray-400" />}
                </button>
                {pickingEmojiFor === habit.id && (
                  <div className="absolute top-10 left-0 z-50 shadow-xl" ref={emojiPickerRef}>
                    <div className="bg-white border-b border-gray-200 p-2 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-500">Pick an icon</span>
                      <button 
                        onClick={() => {
                          updateHabitIcon(habit.id, undefined);
                          setPickingEmojiFor(null);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                      >
                        <X size={12} /> Remove Icon
                      </button>
                    </div>
                    <EmojiPicker 
                      onEmojiClick={(emoji) => {
                        updateHabitIcon(habit.id, emoji.emoji);
                        setPickingEmojiFor(null);
                      }}
                      width={300}
                      height={400}
                    />
                  </div>
                )}
                
                <span className="flex-1 text-sm font-medium truncate px-1 min-w-0">
                  {habit.name}
                </span>

                {/* Move Up */}
                <button
                  onClick={() => moveHabit(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ArrowUp size={14} />
                </button>

                {/* Move Down */}
                <button
                  onClick={() => moveHabit(index, 'down')}
                  disabled={index === habits.length - 1}
                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ArrowDown size={14} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => removeHabit(habit.id)}
                  className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors ml-1"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {habits.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-6 border-2 border-dashed border-gray-200 rounded">
                No habits added yet.
              </p>
            )}
          </ul>
        </div>
        </div>
      </div>
      )}

      {/* EXPORT OVERLAY CONTROLS */}
      {view === 'export' && (
        <div ref={exportLeftPanelRef} className="flex flex-col gap-6 max-w-sm z-20">
          <div>
            <h2 className="text-4xl font-bold font-serif text-gray-900 mb-2">Your sheet is ready!</h2>
            <p className="text-gray-600">Download your printable PDF or share it with others.</p>
          </div>
          
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-3 transition-colors font-semibold shadow-md text-lg mt-2"
          >
            {isExporting ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
            {isExporting ? 'Generating PDF...' : 'Download PDF'}
          </button>
          
          {exportError && (
            <p className="text-red-500 text-sm text-center">{exportError}</p>
          )}

          <div className="flex flex-col gap-3 mt-2">
            <button 
              onClick={() => setView('editor')}
              className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors font-medium"
            >
              Back to Editor
            </button>
            <button 
              onClick={() => {
                setState({
                  habits: [{ id: '1', name: 'Drink 2L Water' }, { id: '2', name: 'Read 10 pages' }],
                  accentColor: COLORS[0],
                  textColor: COLORS[0],
                  fontFamily: FONTS[0].value,
                  orientation: 'landscape',
                  month: today.getMonth(),
                  year: today.getFullYear(),
                  showCalendar: true,
                });
                setBackgroundImage(null);
                setView('editor');
                // Clear the URL hash so the shared link is removed
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }}
              className="w-full text-gray-500 py-3 px-4 rounded-lg hover:text-gray-700 hover:bg-black/5 flex items-center justify-center transition-colors font-medium text-sm"
            >
              Start New Sheet
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-[#E5E0D8]">
            <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Share this design</p>
            <p className="text-xs text-gray-500 mb-4">
              Background images are not included in shared links.
            </p>
            <div className="flex gap-3 relative">
              <button onClick={() => {
                const url = encodeURIComponent(getShareUrl());
                window.open(`https://twitter.com/intent/tweet?url=${url}&text=Check out my habit tracker design on StreakSheet!`, '_blank');
              }} className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors shadow-sm" title="Share on Twitter/X">
                <Twitter size={20} />
              </button>
              <button onClick={() => {
                const url = encodeURIComponent(getShareUrl());
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
              }} className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors shadow-sm" title="Share on Facebook">
                <Facebook size={20} />
              </button>
              <button onClick={() => {
                const url = encodeURIComponent(getShareUrl());
                window.open(`https://api.whatsapp.com/send?text=Check out my habit tracker design on StreakSheet! ${url}`, '_blank');
              }} className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors shadow-sm" title="Share on WhatsApp">
                <MessageCircle size={20} />
              </button>
              <button onClick={shareDesign} className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors shadow-sm flex items-center gap-2" title="Copy Link">
                <LinkIcon size={20} />
                {isCopied && <span className="text-xs font-semibold absolute left-full ml-3 whitespace-nowrap bg-gray-800 text-white px-2 py-1 rounded">Copied!</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT PANEL: LIVE PREVIEW */}
      <div className={`${view === 'export' ? 'flex-none origin-left rounded-lg overflow-visible border-4 border-black/5 relative' : 'flex-1 overflow-auto p-12 flex justify-center items-start'} print:p-0 print:bg-white print:overflow-visible transition-all duration-300`}
           style={view === 'export' ? { 
             width: `calc(${orientation === 'landscape' ? '297mm' : '210mm'} * ${exportScale})`, 
             height: `calc(${orientation === 'landscape' ? '210mm' : '297mm'} * ${exportScale})` 
           } : undefined}
      >
        
        {/* Shadow Wrapper to prevent shadow bleed in html-to-image export */}
        <div 
          className={`shadow-[0_8px_30px_rgb(0,0,0,0.08)] print:shadow-none origin-top-left transition-transform duration-300 ${view === 'export' ? 'absolute top-0 left-0' : 'relative'}`}
          style={{
            width: orientation === 'landscape' ? '297mm' : '210mm',
            aspectRatio: orientation === 'landscape' ? '297 / 210' : '210 / 297',
            transform: view === 'export' ? `scale(${exportScale})` : 'scale(1)',
          }}
        >
          {/* A4 Page Container */}
          <div
            ref={sheetRef}
            className="bg-white flex flex-col overflow-hidden relative w-full h-full"
            style={{
              padding: '2rem',
              fontFamily: fontFamily
            }}
          >
          {/* Background Image Layer */}
          {backgroundImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{ 
                backgroundImage: `url(${backgroundImage})`,
                opacity: bgOpacity,
                // Make sure the image covers the entire sheet but doesn't overflow
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: 'cover'
              }}
            />
          )}

          {/* Sheet Title */}
          <h2
            className="text-4xl font-bold mb-4 tracking-tight shrink-0 relative z-10"
            style={{ color: textColor }}
          >
            {title || 'Untitled Sheet'}
          </h2>

          {/* Tracking Grid */}
          <div className="w-full overflow-hidden border-2 shrink-0 relative z-10 bg-white/70" style={{ borderColor: accentColor }}>
            <table className="w-full text-sm border-collapse table-fixed">
              <thead>
                <tr>
                  {/* Top-Left Header Cell */}
                  <th
                    className={`p-2 text-left border-r-2 border-b-2 font-bold tracking-wide align-bottom ${
                      orientation === 'landscape' ? 'w-48 text-lg' : 'w-32 text-sm'
                    }`}
                    style={{ borderColor: accentColor, color: textColor }}
                  >
                    Habit
                  </th>
                  {/* Days 1-X Headers */}
                  {dayInfo.map(({day, label, isWeekend}) => (
                    <th
                      key={day}
                      className="py-1 px-0 text-center border-r border-b-2"
                      style={{
                        borderBottomColor: accentColor,
                        borderRightColor: day === daysInMonth ? 'transparent' : `${accentColor}40`,
                        backgroundColor: isWeekend ? `${accentColor}26` : 'transparent'
                      }}
                    >
                      <div className={`font-semibold leading-none ${orientation === 'landscape' ? 'text-xs' : 'text-[9px]'}`} style={{ color: textColor }}>{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((habit, rowIndex) => (
                  <tr key={habit.id}>
                    {/* Habit Name Cell */}
                    <td
                      className={`py-1 px-1.5 border-r-2 border-b font-medium align-middle ${
                        orientation === 'landscape' ? 'text-xs' : 'text-[10px]'
                      }`}
                      style={{
                        borderRightColor: accentColor,
                        borderBottomColor: rowIndex === habits.length - 1 ? 'transparent' : `${accentColor}40`,
                        color: textColor
                      }}
                    >
                      <div className="break-words whitespace-normal leading-tight line-clamp-2">
                        {habit.icon && <Twemoji emoji={habit.icon} className="mr-1 inline-block" />}
                        {habit.name}
                      </div>
                    </td>
                    {/* Empty Checkbox Cells */}
                    {dayInfo.map(({day, isWeekend}) => (
                      <td
                        key={day}
                        className="p-0 border-r border-b align-middle"
                        style={{
                          borderBottomColor: rowIndex === habits.length - 1 ? 'transparent' : `${accentColor}40`,
                          borderRightColor: day === daysInMonth ? 'transparent' : `${accentColor}40`,
                          backgroundColor: isWeekend ? `${accentColor}1A` : 'transparent'
                        }}
                      >
                        {/* Empty space that looks like a box due to the cell borders */}
                        <div className="w-full aspect-square" /> 
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* Fallback empty row if no habits exist so the grid isn't totally missing */}
                {habits.length === 0 && (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="py-16 text-center bg-gray-50/50">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <ListTodo size={32} className="text-gray-400 opacity-60" />
                        <div className="text-gray-500 font-medium">No habits added yet</div>
                        <div className="text-sm text-gray-400">Add your first habit in the sidebar to get started.</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Daily Notes Calendar */}
          {showCalendar && (
            <div className="mt-6 flex flex-col flex-1 min-h-0 relative z-10">
              <h3 className="text-xl font-bold mb-2 shrink-0" style={{ color: textColor }}>Daily Notes</h3>
              <div className="flex-1 min-h-0 bg-white/70">
                <table className="w-full h-full border-collapse table-fixed border-2" style={{ borderColor: accentColor }}>
                  <thead>
                    <tr>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <th 
                          key={d} 
                          className="p-1 text-center text-sm font-bold border-2 tracking-wide uppercase" 
                          style={{ 
                            borderColor: accentColor, 
                            color: textColor,
                            backgroundColor: (i === 0 || i === 6) ? `${accentColor}1A` : 'transparent'
                          }}
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: calendarCells.length / 7 }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {calendarCells.slice(rowIndex * 7, (rowIndex + 1) * 7).map((cellDay, colIndex) => {
                          const index = rowIndex * 7 + colIndex;
                          const isWeekendCell = colIndex === 0 || colIndex === 6;
                          return (
                            <td 
                              key={index}
                              className={`p-1 border-2 relative align-top ${!cellDay ? 'bg-gray-100/30' : 'bg-transparent'}`}
                              style={{ 
                                borderColor: accentColor,
                                backgroundColor: (cellDay && isWeekendCell) ? `${accentColor}0D` : (!cellDay ? undefined : 'transparent')
                              }}
                            >
                              {cellDay && (
                                <span className="absolute top-1.5 left-2 text-sm font-semibold opacity-80" style={{ color: textColor }}>
                                  {cellDay}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Branding Watermark */}
          <div 
            className="absolute z-20 pointer-events-none flex items-center gap-1 text-[10px] text-gray-400/80 font-sans tracking-wide"
            style={{ bottom: '0.75rem', right: '2rem' }}
          >
            Made with StreakSheet.com <Twemoji emoji="💖" className="w-2.5 h-2.5 opacity-80" />
          </div>
        </div>
        {/* End of Shadow Wrapper */}
        </div>

      </div>
    </div>
  );
}
