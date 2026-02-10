declare module 'jspdf' {
  export class jsPDF {
    constructor(
      orientation?: 'p' | 'portrait' | 'l' | 'landscape',
      unit?: string,
      format?: string,
    );
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    addImage(...args: unknown[]): void;
    addPage(): void;
    save(filename: string): void;
  }
}

declare module 'html2canvas' {
  type Html2CanvasOptions = {
    scale?: number;
    backgroundColor?: string | null;
    useCORS?: boolean;
    windowWidth?: number;
    windowHeight?: number;
  };

  export default function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions,
  ): Promise<HTMLCanvasElement>;
}
