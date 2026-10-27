import React from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function PageNumberTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleAddPageNumbers = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const total = pdf.getPageCount();
        const copied = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copied.forEach((page, idx) => {
          const { width } = page.getSize();
          page.drawText(`${idx + 1} / ${total}`, {
            x: width - 70,
            y: 20,
            size: 11,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          mergedPdf.addPage(page);
        });
      }
      const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
      saveAs(blob, 'paginated.pdf');
    } catch (err) {
      alert('Error adding page numbers: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Automatically insert clean footer page numbers (e.g. "1 / 10") into all pages.
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
        onClick={handleAddPageNumbers}
        disabled={files.length === 0 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Processing...' : 'Add Page Numbers & Download'}
      </button>
    </div>
  );
}
