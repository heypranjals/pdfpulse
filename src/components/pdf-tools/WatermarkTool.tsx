import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function WatermarkTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [text, setText] = useState('CONFIDENTIAL');
  const [processing, setProcessing] = useState(false);

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleWatermark = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      const helvetica = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = pdf.getPages();
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          page.drawText(text, {
            x: width / 2 - (text.length * 8),
            y: height / 2,
            size: 36,
            font: helvetica,
            color: rgb(0.75, 0.75, 0.75),
            rotate: page.getRotation(),
            opacity: 0.5,
          });
          const [copied] = await mergedPdf.copyPages(pdf, [i]);
          mergedPdf.addPage(copied);
        }
      }
      const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
      saveAs(blob, 'watermarked.pdf');
    } catch (err) {
      alert('Error stamping watermark: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Watermark Text</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white dark:bg-white/5 dark:border-white/10 px-3 py-2 text-sm"
        />
      </div>
      <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
        {files.map((f, i) => (
          <li key={i} className="flex justify-between items-center bg-zinc-100 dark:bg-white/5 p-2 rounded-lg">
            <span className="truncate">{f.name}</span>
            <span className="text-zinc-500">{(f.size / 1024).toFixed(1)} KB</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleWatermark}
        disabled={files.length === 0 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Applying Watermark...' : 'Apply & Download'}
      </button>
    </div>
  );
}
