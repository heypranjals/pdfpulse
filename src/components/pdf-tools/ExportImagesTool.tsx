import React from 'react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export default function ExportImagesTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleExport = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const zip = new JSZip();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          if (context) {
            await (page as any).render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            zip.file(`${file.name.replace(/\.pdf$/i, '')}_page_${i}.png`, base64Data, { base64: true });
          }
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'exported_images.zip');
    } catch (err) {
      alert('Error exporting images: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Export every PDF page to crisp PNG images packaged into a single ZIP archive.
      </p>
      <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
        {files.map((f, i) => (
          <li key={i} className="flex justify-between items-center bg-zinc-100 dark:bg-white/5 p-2 rounded-lg">
            <span className="truncate">{f.name}</span>
            <span className="text-zinc-500">{(f.size / 1024).toFixed(1)} KB</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleExport}
        disabled={files.length === 0 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Rendering Images...' : 'Export Pages as PNG ZIP'}
      </button>
    </div>
  );
}
