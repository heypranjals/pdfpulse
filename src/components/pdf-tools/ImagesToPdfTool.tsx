import React from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function ImagesToPdfTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let image;
        if (file.type === 'image/png' || /\.png$/i.test(file.name)) {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else {
          image = await pdfDoc.embedJpg(arrayBuffer);
        }
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      saveAs(blob, 'converted_images.pdf');
    } catch (err) {
      alert('Error converting images to PDF: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Turn {files.length} selected image{files.length === 1 ? '' : 's'} into a single PDF document.
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
        onClick={handleConvert}
        disabled={files.length === 0 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Converting...' : 'Generate PDF'}
      </button>
    </div>
  );
}
