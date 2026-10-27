import React from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function SplitTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [range, setRange] = React.useState('1-');
  const [processing, setProcessing] = React.useState(false);
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': [] },
    onDrop: (accepted) => setFiles((prev) => [...prev, ...accepted]),
  });

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleSplit = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const zip = new JSZip();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const total = pdf.getPageCount();
        const [startStr, endStr] = range.split('-');
        const start = startStr ? Math.max(0, parseInt(startStr, 10) - 1) : 0;
        const end = endStr ? Math.min(total - 1, parseInt(endStr, 10) - 1) : total - 1;
        const pages = [...Array(total).keys()].slice(start, end + 1);
        const newPdf = await PDFDocument.create();
        const copied = await newPdf.copyPages(pdf, pages);
        copied.forEach((p) => newPdf.addPage(p));
        const blob = new Blob([await newPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
        zip.file(`${file.name.replace(/\.pdf$/i, '')}_pages_${start + 1}-${end + 1}.pdf`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'split_documents.zip');
    } catch (err) {
      alert('Error splitting PDF: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className="border-2 border-dashed border-zinc-300 dark:border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500">
        <input {...getInputProps()} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Drag & drop PDFs to split, or click to browse</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Page Range (e.g. "1-3" or "2-5")</label>
        <input
          type="text"
          placeholder="1-"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white dark:bg-white/5 dark:border-white/10 px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={handleSplit}
        disabled={files.length === 0 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Splitting...' : 'Extract & Download ZIP'}
      </button>
    </div>
  );
}
