/**
 * Design System — InboxChat
 * Componentes UI reutilizables. Sin emojis. Sin estilos inline.
 * Todos usan Tailwind + lucide-react.
 */
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── BUTTON ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-300/40 hover:from-violet-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-violet-300/50 hover:-translate-y-px active:translate-y-0",
      secondary:
        "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200",
      danger:
        "bg-red-600 text-white shadow-md hover:bg-red-700 hover:-translate-y-px active:translate-y-0",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5",
      md: "text-sm px-4 py-2.5",
      lg: "text-base px-6 py-3",
    };

    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ─── CARD ─────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200 shadow-sm",
        hover &&
          "hover:border-slate-300 hover:shadow-md transition-all duration-200 hover:-translate-y-px",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-b border-slate-100", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "violet" | "emerald" | "amber" | "red" | "slate";
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    violet: "bg-violet-100 text-violet-700 border border-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    slate: "bg-slate-50 text-slate-500 border border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full text-sm rounded-xl border bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all duration-200",
              "border-slate-200 hover:border-slate-300",
              "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 focus:border-transparent",
              "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
              error && "border-red-400 focus:ring-red-400",
              leftIcon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── SKELETON ─────────────────────────────────────────────────────────────────

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rect" | "circle";
}

export function Skeleton({ variant = "rect", className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 rounded-lg",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4 rounded",
        className
      )}
      {...props}
    />
  );
}

// Skeleton preset: Card stats
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
      <Skeleton variant="text" className="w-24 h-3" />
      <Skeleton variant="text" className="w-16 h-7" />
      <Skeleton variant="text" className="w-32 h-3" />
    </div>
  );
}

// Skeleton preset: Conversation row
export function SkeletonConvRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton variant="circle" className="w-9 h-9 flex-shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex justify-between">
          <Skeleton variant="text" className="w-28 h-3" />
          <Skeleton variant="text" className="w-8 h-3" />
        </div>
        <Skeleton variant="text" className="w-40 h-3" />
      </div>
    </div>
  );
}

// Skeleton preset: Analytics cards row
export function SkeletonAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <Skeleton variant="text" className="w-48 h-4 mb-2" />
        <Skeleton variant="text" className="w-32 h-3 mb-6" />
        <Skeleton className="w-full h-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <Skeleton variant="text" className="w-40 h-4" />
            <Skeleton className="w-full h-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
