import React from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function CompressTool({ initialFiles = [], targetKb }: { initialFiles?: File[]; targetKb?: number | null }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [compressing, setCompressing] = React.useState(false);

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleCompress = async () => {
    if (files.length === 0) return;
    setCompressing(true);
    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const compressedBytes = await pdf.save({ useObjectStreams: true });
        const blob = new Blob([compressedBytes as unknown as BlobPart], { type: 'application/pdf' });
        saveAs(blob, `optimized_${file.name}`);
      }
    } catch (e) {
      alert('Error compressing: ' + e);
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        In-browser stream optimization and unused object stripping{targetKb ? ` (Target: ${targetKb} KB)` : ''}.
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
        onClick={handleCompress}
        disabled={files.length === 0 || compressing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {compressing ? 'Compressing...' : 'Compress & Download'}
      </button>
    </div>
  );
}
