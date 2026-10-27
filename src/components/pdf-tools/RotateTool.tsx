import React from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function RotateTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [rotation, setRotation] = React.useState(0);
  const {getRootProps, getInputProps} = useDropzone({
    accept: {'application/pdf': []},
    onDrop: accepted => setFiles(prev => [...prev, ...accepted]),
  });

  const handleRotate = async () => {
    if (!files.length) return;
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
    const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], {type: 'application/pdf'});
    saveAs(blob, `rotated_${rotation}.pdf`);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Rotate PDF</h2>
      <div {...getRootProps()} className="border-2 border-dashed p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag & drop PDFs to rotate.</p>
      </div>
      <select value={rotation} onChange={e => setRotation(parseInt(e.target.value,10))} className="mb-2 p-1">
        <option value={0}>0° (no rotation)</option>
        <option value={90}>90°</option>
        <option value={180}>180°</option>
        <option value={270}>270°</option>
      </select>
      <button onClick={handleRotate} disabled={files.length===0}
        className="px-4 py-2 bg-primary-light text-white rounded disabled:opacity-50">
        Rotate PDFs
      </button>
    </div>
  );
}
