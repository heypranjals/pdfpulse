import React from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function RotateTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [rotation, setRotation] = React.useState(90);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleRotate = async () => {
    if (!files.length) return;
    setProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = pdf.getPages();
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const currentAngle = page.getRotation().angle;
          page.setRotation(degrees((currentAngle + rotation) % 360));
          const [copied] = await mergedPdf.copyPages(pdf, [i]);
          mergedPdf.addPage(copied);
        }
      }
      const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
      saveAs(blob, `rotated_${rotation}deg.pdf`);
    } catch (err) {
      alert('Error rotating PDF: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rotation Angle:</label>
        <select
          value={rotation}
          onChange={(e) => setRotation(parseInt(e.target.value, 10))}
          className="rounded-lg border border-zinc-300 bg-white dark:bg-white/5 dark:border-white/10 px-3 py-1.5 text-sm"
        >
          <option value={90}>90° Clockwise</option>
          <option value={180}>180° Flip</option>
          <option value={270}>270° Counter-Clockwise</option>
        </select>
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
        onClick={handleRotate}
        disabled={files.length === 0 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Rotating...' : 'Rotate & Download'}
      </button>
    </div>
  );
}
