"use client";

import { useRef, useState } from "react";

// کراپ دستی کاور در مرورگر (بدون کتابخانه خارجی):
// - از روی پیش‌نمایش یا فایل انتخابی، فریم دلخواه (مثلاً حذف نوار PS5 بالای بوکس‌آرت)
//   را با موس/لمس انتخاب می‌کنی؛ خروجی WebP/JPEG جایگزین همان فایل انتخابی می‌شود و
//   موقع ذخیره بازی مثل قبل در جدول covers ذخیره می‌شود.
// - دکمه «حذف نوار بالای کاور» هم همان کراپ را خودکار می‌زند (۱۰٪ بالا حذف می‌شود).
// - cancel/✕ بدون تغییر برمی‌گردد.

type Props = {
  imageSrc: string;
  onApply: (file: File) => void;
  onClose: () => void;
};

const AUTO_TOP_TRIM = 0.1;

export default function CoverCropper({ imageSrc, onApply, onClose }: Props) {
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [sel, setSel] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const [dragging, setDragging] = useState(false);
  const [applying, setApplying] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  function clampSel(s: { x: number; y: number; w: number; h: number }) {
    const x = Math.min(1, Math.max(0, s.x));
    const y = Math.min(1, Math.max(0, s.y));
    const w = Math.min(1 - x, Math.max(0.05, s.w));
    const h = Math.min(1 - y, Math.max(0.05, s.h));
    return { x, y, w, h };
  }

  function posFromEvent(e: React.MouseEvent | React.TouchEvent) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return null;
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : (e as React.MouseEvent).clientY;
    return {
      x: Math.min(1, Math.max(0, (clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (clientY - box.top) / box.height)),
    };
  }

  function onStart(e: React.MouseEvent | React.TouchEvent) {
    const p = posFromEvent(e);
    if (!p) return;
    setDragging(true);
    setSel({ x: p.x, y: p.y, w: 0.01, h: 0.01 });
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (!dragging) return;
    const p = posFromEvent(e);
    if (!p) return;
    setSel((prev) => clampSel({ x: Math.min(prev.x, p.x), y: Math.min(prev.y, p.y), w: Math.abs(p.x - prev.x), h: Math.abs(p.y - prev.y) }));
  }

  function onEnd() {
    setDragging(false);
  }

  function autoTrimTop() {
    setSel(clampSel({ x: 0, y: AUTO_TOP_TRIM, w: 1, h: 1 - AUTO_TOP_TRIM }));
  }

  async function apply() {
    if (applying) return;
    setApplying(true);
    try {
      const img = imgRef.current;
      if (!img || !img.naturalWidth) {
        onClose();
        return;
      }
      const sx = Math.round(sel.x * img.naturalWidth);
      const sy = Math.round(sel.y * img.naturalHeight);
      const sw = Math.max(1, Math.round(sel.w * img.naturalWidth));
      const sh = Math.max(1, Math.round(sel.h * img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onClose();
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const supported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
      const mime = supported ? "image/webp" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.9));
      if (!blob || blob.size === 0) {
        onClose();
        return;
      }
      onApply(new File([blob], "cover-crop.webp", { type: mime }));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="crop-modal" dir="rtl">
      <div className="crop-box">
        <div className="crop-head">
          <strong>برش کاور</strong>
          <button className="button ghost small" type="button" onClick={onClose}>✕</button>
        </div>
        <p className="crop-hint">با موس یا انگشت روی عکس بکش تا فریم برش انتخاب شود.</p>
        <div
          ref={boxRef}
          className="crop-stage"
          onMouseDown={onStart}
          onMouseMove={onMove}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="برش کاور"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
              setSel({ x: 0, y: 0, w: 1, h: 1 });
            }}
          />
          <div
            className="crop-sel"
            style={{
              left: `${sel.x * 100}%`,
              top: `${sel.y * 100}%`,
              width: `${sel.w * 100}%`,
              height: `${sel.h * 100}%`,
            }}
          />
        </div>
        {imgSize.w > 0 ? (
          <p className="crop-hint">{`ابعاد: ${imgSize.w}×${imgSize.h} — انتخاب: ${Math.round(sel.x * imgSize.w)}،${Math.round(sel.y * imgSize.h)} ${Math.round(sel.w * imgSize.w)}×${Math.round(sel.h * imgSize.h)}`}</p>
        ) : null}
        <div className="crop-actions">
          <button className="button ghost small" type="button" onClick={autoTrimTop}>✂ حذف نوار بالای کاور</button>
          <button className="button ghost small" type="button" onClick={() => setSel({ x: 0, y: 0, w: 1, h: 1 })}>↺ کل عکس</button>
          <span className="crop-spacer" />
          <button className="button ghost small" type="button" onClick={onClose}>انصراف</button>
          <button className="button small" type="button" onClick={apply} disabled={applying}>
            {applying ? "در حال برش…" : "اعمال برش"}
          </button>
        </div>
      </div>
    </div>
  );
}
