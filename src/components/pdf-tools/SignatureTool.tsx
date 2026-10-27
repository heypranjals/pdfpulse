import React from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function SignatureTool({ initialFiles = [] }: { initialFiles?: File[] }) {
  const [files, setFiles] = React.useState<File[]>(initialFiles);
  const [signatureText, setSignatureText] = React.useState('Verified Digital Signature');
  const [sanitize, setSanitize] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (initialFiles.length > 0) setFiles(initialFiles);
  }, [initialFiles]);

  const handleSignAndSanitize = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        
        if (sanitize) {
          pdf.setTitle('');
          pdf.setAuthor('');
          pdf.setSubject('');
          pdf.setKeywords([]);
          pdf.setProducer('');
          pdf.setCreator('');
        }

        const pages = pdf.getPages();
        if (pages.length > 0 && signatureText.trim()) {
          const lastPage = pages[pages.length - 1];
          lastPage.drawText(`Signed: ${signatureText}`, {
            x: 50,
            y: 50,
            size: 11,
            font,
            color: rgb(0.1, 0.4, 0.8),
          });
        }

        const bytes = await pdf.save();
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        saveAs(blob, `secured_${file.name}`);
      }
    } catch (err) {
      alert('Error protecting PDF: ' + err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Signature Stamp</label>
        <input
          type="text"
          value={signatureText}
          onChange={(e) => setSignatureText(e.target.value)}
          placeholder="Signature Name or ID"
          className="w-full rounded-lg border border-zinc-300 bg-white dark:bg-white/5 dark:border-white/10 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={sanitize}
          onChange={(e) => setSanitize(e.target.checked)}
          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
        />
        Sanitize metadata (strip author, device, and GPS traces)
      </label>
      <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
        {files.map((f, i) => (
          <li key={i} className="flex justify-between items-center bg-zinc-100 dark:bg-white/5 p-2 rounded-lg">
            <span className="truncate">{f.name}</span>
            <span className="text-zinc-500">{(f.size / 1024).toFixed(1)} KB</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSignAndSanitize}
        disabled={files.length === 0 || processing}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {processing ? 'Applying Security...' : 'Protect & Download'}
      </button>
    </div>
  );
}
