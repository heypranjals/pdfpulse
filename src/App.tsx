import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Combine,
  Cpu,
  Eraser,
  FileImage,
  FileText,
  Github,
  Heart,
  Images,
  Lock,
  Menu,
  Minimize2,
  Moon,
  RotateCw,
  Scissors,
  ShieldCheck,
  Stamp,
  Star,
  Sun,
  Target,
  Trash2,
  UploadCloud,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import MergeTool from "@/components/pdf-tools/MergeTool";
import SplitTool from "@/components/pdf-tools/SplitTool";
import CompressTool from "@/components/pdf-tools/CompressTool";
import ExportImagesTool from "@/components/pdf-tools/ExportImagesTool";
import ImagesToPdfTool from "@/components/pdf-tools/ImagesToPdfTool";
import RotateTool from "@/components/pdf-tools/RotateTool";
import WatermarkTool from "@/components/pdf-tools/WatermarkTool";
import PageNumberTool from "@/components/pdf-tools/PageNumberTool";
import SignatureTool from "@/components/pdf-tools/SignatureTool";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

/** Set this to your real "owner/repo". The star count is fetched live and hidden if the request fails. */
const GITHUB_REPO = "heypranjals/pdfpulse";
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
const TARGET_PRESETS_KB = [50, 100, 200, 500] as const;

/* -------------------------------------------------------------------------- */
/*  Types & data                                                              */
/* -------------------------------------------------------------------------- */

export type ToolId =
  | "merge"
  | "split"
  | "compress"
  | "pdf-to-images"
  | "images-to-pdf"
  | "organize"
  | "watermark"
  | "protect"
  | "sanitize";

export interface LaunchOptions {
  /** Target output size in KB for the compression engine. `null` means automatic. */
  targetKb?: number | null;
}

/** Wire this to your router / tool workspace. Receives only files the tool can accept. */
export type LaunchHandler = (toolId: ToolId, files: File[], options?: LaunchOptions) => void;

type Category = "Organize" | "Optimize" | "Convert" | "Security";
type BadgeKind = "Fast" | "Client-Side" | "Popular" | "New";

interface Tool {
  id: ToolId;
  name: string;
  description: string;
  category: Category;
  icon: LucideIcon;
  badges: BadgeKind[];
  accepts: "pdf" | "image";
  minFiles: number;
  highlight?: string;
}

const CATEGORIES: Category[] = ["Organize", "Optimize", "Convert", "Security"];

const TOOLS: Tool[] = [
  {
    id: "merge",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one document, in the order you choose.",
    category: "Organize",
    icon: Combine,
    badges: ["Popular", "Fast"],
    accepts: "pdf",
    minFiles: 2,
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Extract page ranges or split a document into separate files.",
    category: "Organize",
    icon: Scissors,
    badges: ["Client-Side"],
    accepts: "pdf",
    minFiles: 1,
  },
  {
    id: "compress",
    name: "Compress PDF",
    description: "Shrink files to an exact size limit without uploading anything.",
    category: "Optimize",
    icon: Minimize2,
    badges: ["Popular", "New"],
    accepts: "pdf",
    minFiles: 1,
    highlight: "Target size for govt forms",
  },
  {
    id: "pdf-to-images",
    name: "PDF to Images",
    description: "Export every page as a sharp PNG or JPG image.",
    category: "Convert",
    icon: Images,
    badges: ["Fast"],
    accepts: "pdf",
    minFiles: 1,
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    description: "Turn photos and scans into a single, neatly paged PDF.",
    category: "Convert",
    icon: FileImage,
    badges: ["Client-Side"],
    accepts: "image",
    minFiles: 1,
  },
  {
    id: "organize",
    name: "Rotate & Organize",
    description: "Rotate, reorder and delete pages with a visual page grid.",
    category: "Organize",
    icon: RotateCw,
    badges: ["Fast"],
    accepts: "pdf",
    minFiles: 1,
  },
  {
    id: "watermark",
    name: "Watermark & Page Numbers",
    description: "Stamp text or add page numbers across every page at once.",
    category: "Organize",
    icon: Stamp,
    badges: ["Client-Side"],
    accepts: "pdf",
    minFiles: 1,
  },
  {
    id: "protect",
    name: "Protect & Sign",
    description: "Lock a PDF with a password or add your signature locally.",
    category: "Security",
    icon: Lock,
    badges: ["Client-Side"],
    accepts: "pdf",
    minFiles: 1,
  },
  {
    id: "sanitize",
    name: "Sanitize Metadata",
    description: "Strip author, device and hidden metadata before you share.",
    category: "Security",
    icon: Eraser,
    badges: ["New", "Fast"],
    accepts: "pdf",
    minFiles: 1,
  },
];

const BADGE_STYLES: Record<BadgeKind, string> = {
  Fast: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  "Client-Side": "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  Popular: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300",
  New: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const isPdf = (f: File): boolean => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImage = (f: File): boolean =>
  /^image\/(png|jpe?g|webp)$/i.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name);
const isSupported = (f: File): boolean => isPdf(f) || isImage(f);
const fileKey = (f: File): string => `${f.name}-${f.size}-${f.lastModified}`;
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

type Theme = "dark" | "light";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("pdfpulse-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      /* storage unavailable */
    }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem("pdfpulse-theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return [theme, toggle];
}

function useGithubStars(repo: string): number | null {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, { signal: controller.signal });
        if (!res.ok) return;
        const data: { stargazers_count?: unknown } = await res.json();
        if (typeof data.stargazers_count === "number") setStars(data.stargazers_count);
      } catch {
        /* offline, rate-limited or aborted: the count simply stays hidden */
      }
    })();
    return () => controller.abort();
  }, [repo]);

  return stars;
}

/* -------------------------------------------------------------------------- */
/*  Small UI pieces                                                           */
/* -------------------------------------------------------------------------- */

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-zinc-300 bg-zinc-100 px-1.5 font-sans text-[11px] font-medium text-zinc-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300">
      {children}
    </kbd>
  );
}

function StatusPill({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ${className}`}
      role="status"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Offline ready · Zero cloud uploads
    </div>
  );
}

function Toast({ message }: { message: string | null }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
    >
      {message && (
        <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-zinc-200 bg-white/90 px-4 py-3 text-sm text-zinc-800 shadow-xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-100">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
          {message}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                    */
/* -------------------------------------------------------------------------- */

interface NavbarProps {
  theme: Theme;
  stars: number | null;
  onToggleTheme: () => void;
  onPickTool: (id: ToolId) => void;
}

function Navbar({ theme, stars, onToggleTheme, onPickTool }: NavbarProps) {
  const [openMenu, setOpenMenu] = useState<Category | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const pick = (id: ToolId) => {
    setOpenMenu(null);
    setMobileOpen(false);
    onPickTool(id);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/60">
      <div ref={navRef} className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <a href="#top" className="group flex items-center gap-2.5" aria-label="PDFPulse home">
          <span className="relative flex h-8 w-8 items-center justify-center">
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 opacity-60 blur-md transition-opacity group-hover:opacity-90" />
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white ring-1 ring-white/20">
              <FileText className="h-4 w-4" strokeWidth={2.25} />
            </span>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white">PDFPulse</span>
        </a>

        {/* Desktop categories */}
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Tool categories">
          {CATEGORIES.map((cat) => {
            const tools = TOOLS.filter((t) => t.category === cat);
            const isOpen = openMenu === cat;
            return (
              <div
                key={cat}
                className="relative"
                onMouseEnter={() => setOpenMenu(cat)}
                onMouseLeave={() => setOpenMenu((cur) => (cur === cat ? null : cur))}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  onClick={() => setOpenMenu(cat)}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isOpen
                      ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {cat}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 w-72 pt-2"
                  >
                    <div className="rounded-xl border border-zinc-200 bg-white/95 p-1.5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95">
                      {tools.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="menuitem"
                          onClick={() => pick(t.id)}
                          className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                            <t.icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-medium text-zinc-900 dark:text-white">{t.name}</span>
                            <span className="block text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                              {t.description}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <a
            href="#privacy"
            className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:text-white"
          >
            Privacy
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <StatusPill className="hidden lg:inline-flex" />

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10 sm:inline-flex"
          >
            <Github className="h-4 w-4" />
            <span>Star</span>
            {stars !== null && (
              <span className="flex items-center gap-1 border-l border-zinc-200 pl-2 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {formatStars(stars)}
              </span>
            )}
          </a>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-zinc-200 bg-white/95 px-4 pb-5 pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 md:hidden">
          <StatusPill className="mb-4" />
          {CATEGORIES.map((cat) => (
            <div key={cat} className="mb-3">
              <p className="mb-1 px-1 text-xs font-medium text-zinc-500 dark:text-zinc-500">{cat}</p>
              {TOOLS.filter((t) => t.category === cat).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/5"
                >
                  <t.icon className="h-4 w-4 text-indigo-500" />
                  {t.name}
                </button>
              ))}
            </div>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-white/10 dark:text-zinc-200 sm:hidden"
          >
            <Github className="h-4 w-4" />
            View on GitHub
            {stars !== null && <span className="text-zinc-500">· {formatStars(stars)} ★</span>}
          </a>
        </div>
      )}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero + Dropzone                                                           */
/* -------------------------------------------------------------------------- */

interface DropzoneProps {
  files: File[];
  inputRef: RefObject<HTMLInputElement | null>;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onLaunch: (id: ToolId, files?: File[], options?: LaunchOptions) => void;
}

function Dropzone({ files, inputRef, onAdd, onRemove, onClear, onLaunch }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetKb, setTargetKb] = useState<number | null>(null);
  const depth = useRef(0);

  const pdfs = useMemo(() => files.filter(isPdf), [files]);
  const images = useMemo(() => files.filter(isImage), [files]);
  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  const ingest = useCallback(
    (list: FileList | File[]) => {
      const all = Array.from(list);
      const accepted = all.filter(isSupported);
      const skipped = all.length - accepted.length;
      setError(
        skipped > 0
          ? `${plural(skipped, "file")} skipped. PDFPulse accepts PDF, PNG, JPG and WebP files.`
          : null,
      );
      if (accepted.length > 0) onAdd(accepted);
    },
    [onAdd],
  );

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length > 0) ingest(e.dataTransfer.files);
  };
  const onZoneKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const quick: { id: ToolId; label: string; icon: LucideIcon; enabled: boolean; hint: string }[] = [
    { id: "merge", label: "Merge", icon: Combine, enabled: pdfs.length >= 2, hint: "Add at least 2 PDFs" },
    { id: "split", label: "Split", icon: Scissors, enabled: pdfs.length >= 1, hint: "Add a PDF" },
    { id: "compress", label: "Compress", icon: Minimize2, enabled: pdfs.length >= 1, hint: "Add a PDF" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-zinc-200 bg-white/70 p-2 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <div
          role="button"
          tabIndex={0}
          aria-label="Add files. Drag and drop, or press Enter to browse."
          onClick={() => inputRef.current?.click()}
          onKeyDown={onZoneKey}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 motion-reduce:transition-none sm:py-12 ${
            dragging
              ? "scale-[1.01] border-indigo-500 bg-indigo-500/10"
              : "border-zinc-300 bg-zinc-50/60 hover:border-indigo-400 hover:bg-indigo-500/5 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-indigo-400/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.files) ingest(e.target.files);
              e.target.value = "";
            }}
          />
          <span
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-colors ${
              dragging
                ? "bg-indigo-500 text-white ring-indigo-400"
                : "bg-white text-indigo-600 ring-zinc-200 group-hover:ring-indigo-300 dark:bg-white/5 dark:text-indigo-300 dark:ring-white/10"
            }`}
          >
            <UploadCloud className="h-6 w-6" />
          </span>
          <p className="text-base font-medium text-zinc-900 dark:text-white">
            {dragging ? "Release to add your files" : "Drop PDFs or images here"}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            or <span className="font-medium text-indigo-600 dark:text-indigo-300">browse your device</span>. Files stay
            in this tab.
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            PDF, PNG, JPG, WebP · press <Kbd>U</Kbd> to upload
          </p>
        </div>

        {error && (
          <p role="alert" className="mx-2 mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-left text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        {files.length > 0 && (
          <div className="mt-2 px-2 pb-2 text-left">
            <div className="mb-2 flex items-center justify-between px-1 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {plural(files.length, "file")} · {formatSize(totalBytes)}
              </span>
              <button
                type="button"
                onClick={onClear}
                className="rounded px-1.5 py-0.5 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Clear all
              </button>
            </div>

            <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {files.map((f) => (
                <li
                  key={fileKey(f)}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
                >
                  {isPdf(f) ? (
                    <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                  ) : (
                    <FileImage className="h-4 w-4 shrink-0 text-sky-500" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-100" title={f.name}>
                    {f.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {formatSize(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(fileKey(f))}
                    aria-label={`Remove ${f.name}`}
                    className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {pdfs.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <Target className="h-3.5 w-3.5 text-indigo-500" />
                  Compress target
                </span>
                {[null, ...TARGET_PRESETS_KB].map((kb) => (
                  <button
                    key={kb ?? "auto"}
                    type="button"
                    aria-pressed={targetKb === kb}
                    onClick={() => setTargetKb(kb)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      targetKb === kb
                        ? "bg-indigo-500 text-white ring-indigo-500"
                        : "bg-white text-zinc-600 ring-zinc-200 hover:ring-indigo-300 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10"
                    }`}
                  >
                    {kb === null ? "Auto" : `${kb} KB`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2 px-2 pb-2 pt-1">
          {quick.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={!q.enabled}
              title={q.enabled ? undefined : q.hint}
              onClick={() => onLaunch(q.id, pdfs, q.id === "compress" ? { targetKb } : undefined)}
              className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 transition-all hover:border-indigo-300 hover:bg-indigo-500/5 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-200 disabled:hover:bg-white disabled:hover:text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200 dark:disabled:hover:border-white/10 dark:disabled:hover:bg-white/5 dark:disabled:hover:text-zinc-100"
            >
              <q.icon className="h-4 w-4" />
              {q.label}
            </button>
          ))}
        </div>

        {images.length > 0 && (
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => onLaunch("images-to-pdf", images)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <FileImage className="h-4 w-4" />
              Convert {plural(images.length, "image")} to PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface HeroProps extends DropzoneProps {}

function Hero(props: HeroProps) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.22),transparent_70%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.30),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(113,113,122,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(113,113,122,0.12)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-20">
        <StatusPill className="mb-6 lg:hidden" />

        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
          The modern, private PDF suite.
          <span className="block bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text pb-1 text-transparent">
            Zero cloud uploads.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
          Every tool runs 100% in your browser. Your files never leave your device, so there is nothing to upload,
          nothing to wait for, and nothing to leak.
        </p>

        <div className="mt-10">
          <Dropzone {...props} />
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {["No file limits", "No paywalls", "No queue timers"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tool catalog                                                              */
/* -------------------------------------------------------------------------- */

function ToolCard({ tool, onOpen }: { tool: Tool; onOpen: (id: ToolId) => void }) {
  const handleMove = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(tool.id)}
      onMouseMove={handleMove}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 bg-[radial-gradient(260px_circle_at_var(--x,50%)_var(--y,0%),rgba(99,102,241,0.16),transparent_70%)]"
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 ring-1 ring-indigo-500/20 transition-colors group-hover:from-indigo-500 group-hover:to-violet-600 group-hover:text-white dark:text-indigo-300">
          <tool.icon className="h-5 w-5" />
        </span>
        <span className="flex flex-wrap justify-end gap-1.5">
          {tool.badges.map((b) => (
            <span key={b} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${BADGE_STYLES[b]}`}>
              {b}
            </span>
          ))}
        </span>
      </div>

      <h3 className="relative mt-4 text-base font-semibold tracking-tight text-zinc-900 dark:text-white">{tool.name}</h3>
      <p className="relative mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{tool.description}</p>

      {tool.highlight && (
        <div className="relative mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <Target className="h-3.5 w-3.5" />
            {tool.highlight}
          </p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {["50 KB", "100 KB", "SSC", "Railway", "UPSC"].map((c) => (
              <span
                key={c}
                className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10"
              >
                {c}
              </span>
            ))}
          </p>
        </div>
      )}

      <span className="relative mt-auto flex items-center gap-1 pt-5 text-sm font-medium text-zinc-500 transition-colors group-hover:text-indigo-600 dark:text-zinc-500 dark:group-hover:text-indigo-300">
        Open tool
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </button>
  );
}

function ToolGrid({ onOpen }: { onOpen: (id: ToolId) => void }) {
  const [filter, setFilter] = useState<Category | "All">("All");
  const visible = filter === "All" ? TOOLS : TOOLS.filter((t) => t.category === filter);

  return (
    <section id="tools" className="scroll-mt-20 border-t border-zinc-200 py-16 dark:border-white/10 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Every tool you need, none of the clutter
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              No ads between you and your document. Pick a tool, drop a file, and download the result.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter tools by category"
            className="-mx-1 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100/70 p-1 dark:border-white/10 dark:bg-white/5 md:mx-0"
          >
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={filter === c}
                onClick={() => setFilter(c)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  filter === c
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <ToolCard key={t.id} tool={t} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Privacy bento                                                             */
/* -------------------------------------------------------------------------- */

function BentoBox({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03] sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function PrivacyBento() {
  return (
    <section id="privacy" className="scroll-mt-20 border-t border-zinc-200 py-16 dark:border-white/10 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Private because there is no server
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            PDFPulse is a static app. The code downloads once, then your browser does all the work.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* 1. WASM */}
          <BentoBox className="lg:col-span-3">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-300">
              <Cpu className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
              In-browser WASM processing
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Merging, splitting and compressing run on your own CPU. No server bills for us, no latency for you.
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                <p className="flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-100">
                  <FileText className="h-4 w-4 text-rose-500" />
                  your-file.pdf
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">On your device</p>
              </div>
              <ArrowRight className="mx-auto h-4 w-4 rotate-90 text-indigo-500 sm:rotate-0" />
              <div className="flex-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-indigo-700 dark:text-indigo-200">
                  <Zap className="h-4 w-4" />
                  Browser engine
                </p>
                <p className="mt-0.5 text-xs text-indigo-600/80 dark:text-indigo-300/70">Runs in this tab</p>
              </div>
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-400 line-through dark:border-white/15 sm:ml-1">
                Remote server
              </div>
            </div>
          </BentoBox>

          {/* 2. Zero leakage */}
          <BentoBox className="lg:col-span-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">Zero data leakage</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              A file that is never uploaded can't be breached, sold or kept in a log.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-zinc-700 dark:text-zinc-300">
              {[
                "No uploads, no accounts",
                "Nothing stored on a server",
                "Works offline after the first load",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </BentoBox>

          {/* 3. Speed */}
          <BentoBox className="lg:col-span-5">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-300">
                  <Zap className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Lightning fast
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Skip the upload, the queue and the download. Your result is ready as soon as processing finishes.
                </p>
              </div>

              <div className="space-y-4 text-xs text-zinc-500 dark:text-zinc-400">
                <div>
                  <p className="mb-1.5">Typical cloud PDF tool</p>
                  <div className="flex h-7 w-full overflow-hidden rounded-md">
                    {[
                      { l: "Upload", w: "w-[30%]", c: "bg-zinc-300 dark:bg-zinc-700" },
                      { l: "Queue", w: "w-[15%]", c: "bg-zinc-400 dark:bg-zinc-600" },
                      { l: "Process", w: "w-[20%]", c: "bg-zinc-300 dark:bg-zinc-700" },
                      { l: "Download", w: "w-[35%]", c: "bg-zinc-400 dark:bg-zinc-600" },
                    ].map((s) => (
                      <div
                        key={s.l}
                        className={`flex items-center justify-center truncate px-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-200 ${s.w} ${s.c}`}
                      >
                        {s.l}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-medium text-indigo-600 dark:text-indigo-300">PDFPulse</p>
                  <div className="flex h-7 w-full overflow-hidden rounded-md">
                    <div className="flex w-[20%] items-center justify-center bg-gradient-to-r from-indigo-500 to-violet-600 px-1 text-[11px] font-medium text-white">
                      Process
                    </div>
                  </div>
                </div>
                <p className="text-[11px]">Relative time per step. Actual speed depends on your device and file.</p>
              </div>
            </div>
          </BentoBox>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">PDFPulse</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Fast, private PDF tools that run entirely in your browser.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-zinc-900 dark:hover:text-white"
            >
              <Github className="h-4 w-4" />
              Source on GitHub
            </a>
            <a
              href="https://pdf-lib.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-zinc-900 dark:hover:text-white"
            >
              <Heart className="h-4 w-4 text-rose-500" />
              Built on open-source pdf-lib
            </a>
          </div>

          <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p className="flex items-center gap-2">
              <Kbd>U</Kbd> Add files
            </p>
            <p className="flex items-center gap-2">
              <Kbd>T</Kbd> Toggle theme
            </p>
            <p className="flex items-center gap-2">
              <Kbd>Esc</Kbd> Close menus
            </p>
          </div>
        </div>

        <p className="mt-10 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-white/10">
          © {new Date().getFullYear()} PDFPulse. Your files never leave your browser.
        </p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

export default function App({ onLaunch }: { onLaunch?: LaunchHandler }) {
  const [theme, toggleTheme] = useTheme();
  const stars = useGithubStars(GITHUB_REPO);
  const [files, setFiles] = useState<File[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [activeFiles, setActiveFiles] = useState<File[]>([]);
  const [activeOptions, setActiveOptions] = useState<LaunchOptions | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const seen = new Set(prev.map(fileKey));
      const fresh = incoming.filter((f) => !seen.has(fileKey(f)));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, []);

  const removeFile = useCallback((key: string) => {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
  }, []);

  const clearFiles = useCallback(() => setFiles([]), []);

  const launchTool = useCallback(
    (id: ToolId, explicit?: File[], options?: LaunchOptions) => {
      const tool = TOOLS.find((t) => t.id === id);
      if (!tool) return;
      const filter = tool.accepts === "pdf" ? isPdf : isImage;
      const usable = (explicit ?? files).filter(filter);

      if (usable.length < tool.minFiles) {
        const kind = tool.accepts === "pdf" ? "PDF" : "image";
        setToast(`${tool.name} needs ${tool.minFiles > 1 ? `${tool.minFiles}+ ${kind}s` : `a ${kind}`}. Choose files to continue.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        inputRef.current?.click();
        return;
      }

      if (onLaunch) {
        onLaunch(id, usable, options);
      } else {
        const target = options?.targetKb ? ` at ${options.targetKb} KB` : "";
        setToast(`${tool.name}: ${plural(usable.length, "file")} ready${target}.`);
        setActiveTool(id);
        setActiveFiles(usable);
        setActiveOptions(options);
      }
    },
    [files, onLaunch],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTool(null);
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "u") {
        e.preventDefault();
        inputRef.current?.click();
      } else if (key === "t") {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTheme]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-indigo-500/30 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar theme={theme} stars={stars} onToggleTheme={toggleTheme} onPickTool={(id) => launchTool(id)} />
      <main>
        <Hero
          files={files}
          inputRef={inputRef}
          onAdd={addFiles}
          onRemove={removeFile}
          onClear={clearFiles}
          onLaunch={launchTool}
        />
        <ToolGrid onOpen={(id) => launchTool(id)} />
        <PrivacyBento />
      </main>
      <Footer />
      <Toast message={toast} />

      {/* Active Tool Workspace Modal */}
      {activeTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {(() => {
                    const TIcon = TOOLS.find((t) => t.id === activeTool)?.icon || FileText;
                    return <TIcon className="h-5 w-5" />;
                  })()}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {TOOLS.find((t) => t.id === activeTool)?.name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {TOOLS.find((t) => t.id === activeTool)?.category} · 100% In-Browser
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-2">
              {activeTool === "merge" && <MergeTool initialFiles={activeFiles} />}
              {activeTool === "split" && <SplitTool initialFiles={activeFiles} />}
              {activeTool === "compress" && <CompressTool initialFiles={activeFiles} targetKb={activeOptions?.targetKb} />}
              {activeTool === "pdf-to-images" && <ExportImagesTool initialFiles={activeFiles} />}
              {activeTool === "images-to-pdf" && <ImagesToPdfTool initialFiles={activeFiles} />}
              {activeTool === "organize" && <RotateTool initialFiles={activeFiles} />}
              {activeTool === "watermark" && <WatermarkTool initialFiles={activeFiles} />}
              {activeTool === "protect" && <SignatureTool initialFiles={activeFiles} />}
              {activeTool === "sanitize" && <PageNumberTool initialFiles={activeFiles} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
