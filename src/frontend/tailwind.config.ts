import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // CRITICAL: Grid responsive classes - MUST BE GENERATED
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'sm:grid-cols-2', 
    'md:grid-cols-2',
    'md:grid-cols-3',
    'md:grid-cols-4',
    'md:grid-cols-5',
    'md:grid-cols-6',
    'lg:grid-cols-2',
    'lg:grid-cols-3',
    'lg:grid-cols-4',
    
    // CRITICAL: Sidebar responsive classes - SIDEBAR DISAPPEARING FIX
    'lg:translate-x-0',
    'md:translate-x-0',
    'lg:-translate-x-full',
    'md:-translate-x-full',
    '-translate-x-full',
    'translate-x-0',
    
    // CRITICAL: Width responsive classes for sidebar
    'w-16',
    'w-64',
    'md:w-16',
    'md:w-64',
    'lg:w-16',
    'lg:w-64',
    
    // CRITICAL: Margin responsive classes for main content
    'ml-16',
    'ml-64',
    'md:ml-16',
    'md:ml-64',
    'lg:ml-16',
    'lg:ml-64',
    
    // CRITICAL: Display responsive classes
    'hidden',
    'md:hidden',
    'lg:hidden',
    'md:flex',
    'lg:flex',
    'sm:flex',
    'md:block',
    'lg:block',
    
    // Legacy badge classes (for footer)
    'badge',
    'badge-success',
    'badge-info',
    'badge-purple',
    
    // Rounded classes
    'rounded-2xl',
    'rounded-xl',
    'rounded-lg',
    'rounded-full',
    // Background colors
    'bg-white',
    'bg-gray-50',
    'bg-gray-100',
    'bg-gray-900',
    // Text colors  
    'text-gray-500',
    'text-gray-600',
    'text-gray-700',
    'text-gray-900',
    'text-emerald-500',
    'text-emerald-600',
    'text-emerald-700',
    'text-red-500',
    'text-red-600',
    // Border colors
    'border-gray-100',
    'border-gray-200',
    'hover:border-primary-200',
    'hover:border-amber-200',
    // Hover effects
    'hover:shadow-md',
    'hover:scale-105',
    'hover:bg-primary-700',
    // Responsive padding/spacing
    'p-6',
    'px-2',
    'py-1',
    'mb-2',
    'mb-4',
    'mb-6',
    'gap-2',
    'gap-6',
    'space-x-2',
    'space-x-4',
    'md:space-x-6',
    
    // Text responsive classes
    'text-xl',
    'md:text-2xl',
    'lg:text-2xl',
    'text-xs',
    'md:text-sm',
    'lg:text-sm',
    
    // Mobile-specific classes (MOBILE OPTIMIZATION)
    'touch-manipulation',
    'active:scale-95',
    'active:scale-98',
    'line-clamp-1',
    'line-clamp-2',
    
    // Mobile-responsive text sizes
    'text-2xl',
    'sm:text-3xl',
    'text-base',
    'sm:text-lg',
    'text-sm',
    'sm:text-base',
    
    // Mobile-responsive spacing
    'p-3',
    'sm:p-4',
    'sm:p-6',
    'space-y-4',
    'sm:space-y-0',
    'sm:space-x-2',
    'gap-3',
    'sm:gap-4',
    
    // Mobile-responsive flex and grid
    'flex-col',
    'sm:flex-row',
    'sm:justify-between',
    'sm:items-start',
    'sm:items-center',
    'space-y-2',
    'sm:space-y-0',
    'justify-center',
    'sm:justify-end',
    'text-center',
    'sm:text-right',
    
    // Mobile navigation and sidebar
    '-translate-x-full',
    'translate-x-0',
    'lg:translate-x-0',
    'lg:-translate-x-full',
    'lg:ml-16',
    'lg:ml-64',
    'lg:hidden',
    'lg:block',
    'flex-shrink-0',
    'min-w-0',
    'flex-wrap',
    
    // Mobile text and sizing
    'w-8',
    'h-8',
    'sm:w-10',
    'sm:h-10',
    'text-xs',
    'text-base',
    'md:text-2xl',
    'md:text-xl',
    'md:flex',
    'md:hidden',
    
    // Mobile spacing variations
    'p-1.5',
    'px-1.5',
    'py-0.5',
    'py-2.5',
    'ml-1',
    'space-x-1',
    'mb-2',
    'mb-3',
    'mb-4',
    'mb-6',
    'mt-3',
    'mt-6',
    'pt-3',
    'pt-6',
    'gap-2',
    
    // Mobile authentication and UI specific classes
    'w-6',
    'h-6',
    'w-12',
    'h-12',
    'max-w-sm',
    'max-h-96',
    'max-h-[90vh]',
    'overflow-y-auto',
    'break-all',
    'break-words',
    'py-1',
    'px-2',
  ],
  theme: {
    extend: {
      colors: {
        // Nuru Heritage-Tech brand colors - Ancient Amber/Gold
        primary: {
          50: '#fffbeb',  // Light amber background
          100: '#fef3c7', // Soft amber
          200: '#fde68a', // Medium amber
          300: '#fcd34d', // Bright amber
          400: '#fbbf24', // Rich amber
          500: '#f59e0b', // Main Nuru Heritage Gold
          600: '#d97706', // Deep amber
          700: '#b45309', // Ancient gold
          800: '#92400e', // Dark heritage gold
          900: '#78350f', // Deep heritage
        },
        // Design system colors
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // Design system spacing tokens
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
        '24': '6rem',     // 96px
      },
      borderRadius: {
        'sm': '0.25rem',  // 4px
        'md': '0.375rem', // 6px
        'lg': '0.5rem',   // 8px
        'xl': '0.75rem',  // 12px
        '2xl': '1rem',    // 16px
      }
    },
  },
  plugins: [],
}
export default config