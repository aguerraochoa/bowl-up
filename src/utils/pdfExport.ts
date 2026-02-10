type JsPdfCtor = new (
  orientation?: 'p' | 'portrait' | 'l' | 'landscape',
  unit?: string,
  format?: string,
) => {
  internal: {
    pageSize: {
      getWidth(): number;
      getHeight(): number;
    };
  };
  addImage(...args: unknown[]): void;
  output(type: 'blob'): Blob;
};

type Html2CanvasFn = (
  element: HTMLElement,
  options?: {
    scale?: number;
    backgroundColor?: string | null;
    useCORS?: boolean;
    windowWidth?: number;
    windowHeight?: number;
  },
) => Promise<HTMLCanvasElement>;

type RenderPdfOptions = {
  html: string;
  selector?: string;
  orientation?: 'p' | 'portrait' | 'l' | 'landscape';
  format?: string;
  marginMm?: number;
  windowWidth?: number;
  minWindowHeight?: number;
  scale?: number;
};

const scriptPromises = new Map<string, Promise<void>>();

const loadScript = (src: string): Promise<void> => {
  const cached = scriptPromises.get(src);
  if (cached) return cached;

  const existing = document.querySelector(`script[data-pdf-lib-src="${src}"]`) as HTMLScriptElement | null;
  if (existing) {
    const ready = new Promise<void>((resolve, reject) => {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    });
    scriptPromises.set(src, ready);
    return ready;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.pdfLibSrc = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
};

const loadPdfLibs = async (): Promise<{ jsPDF: JsPdfCtor; html2canvas: Html2CanvasFn }> => {
  await Promise.all([
    loadScript('/vendor/jspdf.umd.min.js'),
    loadScript('/vendor/html2canvas.min.js'),
  ]);

  const globalWindow = window as unknown as {
    jspdf?: { jsPDF?: JsPdfCtor };
    html2canvas?: Html2CanvasFn;
  };

  const jsPDF = globalWindow.jspdf?.jsPDF;
  const html2canvas = globalWindow.html2canvas;

  if (!jsPDF || !html2canvas) {
    throw new Error('PDF libraries did not load correctly');
  }

  return { jsPDF, html2canvas };
};

export const isMobileDevice = (): boolean => {
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const renderPdfBlobFromHtml = async ({
  html,
  selector = '.wrap',
  orientation = 'p',
  format = 'a4',
  marginMm = 7,
  windowWidth = 1200,
  minWindowHeight = 1700,
  scale = 2,
}: RenderPdfOptions): Promise<Blob> => {
  const { jsPDF, html2canvas } = await loadPdfLibs();

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${windowWidth}px`;
  iframe.style.height = `${minWindowHeight}px`;
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  try {
    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc) {
      throw new Error('Could not access export frame document');
    }

    const loaded = new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
    });

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    await loaded;
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    const target = frameDoc.querySelector(selector) as HTMLElement | null;
    if (!target) {
      throw new Error('Could not find report content for PDF export');
    }

    const canvas = await html2canvas(target, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth,
      windowHeight: Math.max(minWindowHeight, target.scrollHeight + 40),
    });

    const pdf = new jsPDF(orientation, 'mm', format);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginMm * 2;
    const maxHeight = pageHeight - marginMm * 2;

    const imageRatio = canvas.width / canvas.height;
    let renderWidth = maxWidth;
    let renderHeight = renderWidth / imageRatio;

    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = renderHeight * imageRatio;
    }

    const offsetX = (pageWidth - renderWidth) / 2;
    const offsetY = marginMm;
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');

    return pdf.output('blob');
  } finally {
    cleanup();
  }
};

export const downloadOrSharePdf = async (
  blob: Blob,
  fileName: string,
  title: string,
): Promise<void> => {
  const mobile = isMobileDevice();

  if (mobile && 'share' in navigator && 'canShare' in navigator) {
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
        });
        return;
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') {
        return;
      }
      console.warn('Share API failed, falling back to direct download:', error);
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 1200);
};
