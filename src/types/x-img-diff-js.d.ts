declare module 'x-img-diff-js' {
  type MatchingRegion = {
    bounding: Rect;
    center: Rect;
    diffMarkers: Rect[];
  };

  type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  type Image = {
    width: number;
    height: number;
    data: Uint8Array;
  };

  export interface DiffConfig {
    actual: string;
    expected: string;
    out: string;
    [key: string]: unknown;
  }

  export interface DetectDiffResult {
    matches: Array<MatchingRegion>;
    strayingRects: Array<Array<Rect>>;
  }

  export function detectDiff(
    img1: Image,
    img2: Image,
    config?: DiffConfig,
  ): Promise<DetectDiffResult>;

  export function getBrowserJsPath(): string;
  export function getBrowserWasmPath(): string;
}
