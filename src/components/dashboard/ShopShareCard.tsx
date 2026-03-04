import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Download, QrCode } from "lucide-react";
import { notify } from "@/lib/notify";

interface ShopShareCardProps {
  shop: {
    id: string;
    name: string;
    logo_url?: string | null;
    is_active?: boolean;
    approval_status?: string;
  };
}

export function ShopShareCard({ shop }: ShopShareCardProps) {
  const promoRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const shopUrl = `${window.location.origin}/shops/${shop.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shopUrl);
    notify.success("تم نسخ الرابط!");
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopUrl)}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = `تسوق من ${shop.name} على سوق أبو حمص! ${shopUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = `تسوق من ${shop.name} على سوق أبو حمص!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shopUrl)}`, '_blank');
  };

  const handleDownloadImage = async () => {
    if (!promoRef.current) return;
    setIsDownloading(true);

    try {
      // Use html2canvas-like approach with canvas API
      const el = promoRef.current;
      const canvas = document.createElement("canvas");
      const scale = 2; // Higher resolution
      canvas.width = el.offsetWidth * scale;
      canvas.height = el.offsetHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, el.offsetWidth, el.offsetHeight);
      gradient.addColorStop(0, "#059669");
      gradient.addColorStop(1, "#047857");
      ctx.fillStyle = gradient;
      ctx.roundRect(0, 0, el.offsetWidth, el.offsetHeight, 16);
      ctx.fill();

      // Decorative circles
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(el.offsetWidth - 30, 30, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(30, el.offsetHeight - 30, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Platform name
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 14px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("سوق أبو حمص", el.offsetWidth / 2, 35);

      // Shop name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px 'Segoe UI', sans-serif";
      ctx.fillText(shop.name, el.offsetWidth / 2, 72);

      // Welcome message  
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "16px 'Segoe UI', sans-serif";
      ctx.fillText("يمكنك الطلب منا الآن أونلاين!", el.offsetWidth / 2, 100);

      // QR Code - white background rounded rect
      const qrSize = 140;
      const qrX = (el.offsetWidth - qrSize - 24) / 2;
      const qrY = 120;
      ctx.fillStyle = "#ffffff";
      ctx.roundRect(qrX, qrY, qrSize + 24, qrSize + 24, 12);
      ctx.fill();

      // Draw QR code SVG onto canvas
      const svgElement = el.querySelector("svg");
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, qrX + 12, qrY + 12, qrSize, qrSize);
            URL.revokeObjectURL(svgUrl);
            resolve();
          };
          img.src = svgUrl;
        });
      }

      // "Scan to order" text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Segoe UI', sans-serif";
      ctx.fillText("امسح الكود للطلب", el.offsetWidth / 2, qrY + qrSize + 52);

      // URL at bottom
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "11px 'Segoe UI', sans-serif";
      ctx.fillText(shopUrl.replace(/^https?:\/\//, ""), el.offsetWidth / 2, el.offsetHeight - 16);

      // Download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${shop.name}-promo.png`;
          a.click();
          URL.revokeObjectURL(url);
          notify.success("تم تحميل الصورة!");
        }
      }, "image/png");
    } catch (error) {
      console.error("Download error:", error);
      notify.error("فشل تحميل الصورة");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="rounded-xl shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3 px-4 md:px-6">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Share2 className="w-3.5 h-3.5 text-primary" />
          </div>
          شارك متجرك
        </CardTitle>
        <CardDescription>انشر رابط متجرك على منصات التواصل الاجتماعي</CardDescription>
      </CardHeader>
      <CardContent className="px-4 md:px-6 pb-5 space-y-4">
        {/* Promotional Image Preview */}
        <div
          ref={promoRef}
          className="relative rounded-xl overflow-hidden p-6 text-center text-white"
          style={{
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            minHeight: "320px",
          }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-8 -translate-x-8" />

          {/* Platform */}
          <p className="text-white/80 text-sm font-medium relative z-10">
            سوق أبو حمص
          </p>

          {/* Shop name */}
          <h2 className="text-2xl font-bold mt-1 relative z-10">
            {shop.name}
          </h2>

          {/* Welcome text */}
          <p className="text-white/90 text-sm mt-1 relative z-10">
            يمكنك الطلب منا الآن أونلاين!
          </p>

          {/* QR Code */}
          <div className="mt-4 inline-block p-3 bg-white rounded-xl relative z-10">
            <QRCode
              value={shopUrl}
              size={140}
              level="H"
              bgColor="#ffffff"
              fgColor="#059669"
            />
          </div>

          {/* Scan text */}
          <p className="text-white font-bold text-sm mt-3 relative z-10">
            📱 امسح الكود للطلب
          </p>

          {/* URL */}
          <p className="text-white/50 text-[10px] mt-2 relative z-10 font-mono" dir="ltr">
            {shopUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>

        {/* Download button */}
        <Button
          onClick={handleDownloadImage}
          disabled={isDownloading}
          className="w-full gap-2"
          variant="default"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? "جاري التحميل..." : "تحميل الصورة للمشاركة"}
        </Button>

        {/* Link Copy */}
        <div className="flex items-center gap-2 p-2 bg-muted/60 rounded-lg">
          <div className="flex-1 text-xs text-muted-foreground font-mono truncate" dir="ltr" style={{ textAlign: 'left' }}>
            {shopUrl}
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs flex-shrink-0" onClick={handleCopyLink}>
            <Copy className="w-3 h-3" />
            نسخ
          </Button>
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
            onClick={shareToWhatsApp}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            واتساب
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
            onClick={shareToFacebook}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            فيسبوك
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700"
            onClick={shareToTwitter}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            تويتر
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
