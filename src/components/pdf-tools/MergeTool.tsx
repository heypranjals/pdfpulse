import React from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function MergeTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [processing, setProcessing] = React.useState(false);
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': [] },
    onDrop: (accepted) => setFiles((prev) => [...prev, ...accepted]),
  });

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }
      const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
      saveAs(blob, 'merged.pdf');
    } catch (err) {
      alert('Error merging PDFs: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className="border-2 border-dashed border-zinc-300 dark:border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500">
        <input {...getInputProps()} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Drag & drop additional PDFs, or click to browse</p>
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
        onClick={handleMerge}
        disabled={files.length < 2 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Merging...' : `Merge ${files.length} PDFs`}
      </button>
    </div>
  );
}
