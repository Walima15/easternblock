'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface QrDisplayProps {
  value: string;
  label?: string;
}

export function QrDisplay({ value, label }: QrDisplayProps) {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'EasternBlock Lightning', text: value });
    } else {
      await copyToClipboard();
    }
  };

  const download = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = 'easternblock-qr.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl border bg-white p-4">
        <QRCodeSVG id="qr-code-svg" value={value} size={200} level="M" includeMargin />
      </div>
      {label && (
        <p className="max-w-xs break-all text-center text-xs text-muted-foreground">{label}</p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          <Copy className="mr-1 h-4 w-4" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={share}>
          <Share2 className="mr-1 h-4 w-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="mr-1 h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
}
