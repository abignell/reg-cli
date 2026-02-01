import path from 'node:path';
import { imgDiff } from 'img-diff-js';
import md5File from 'md5-file';

export type DiffCreatorParams = {
  actualDir: string;
  expectedDir: string;
  diffDir: string;
  image: string;
  matchingThreshold: number;
  thresholdRate?: number;
  thresholdPixel?: number;
  enableAntialias: boolean;
};

export type DiffResult = {
  image: string;
  passed: boolean;
};

const getMD5 = (filename: string) => md5File(filename);

const isPassed = ({
  width,
  height,
  diffCount,
  thresholdPixel,
  thresholdRate,
}: {
  width: number;
  height: number;
  diffCount: number;
  thresholdPixel?: number;
  thresholdRate?: number;
}) => {
  if (typeof thresholdPixel === 'number') {
    return diffCount <= thresholdPixel;
  } else if (typeof thresholdRate === 'number') {
    const totalPixel = width * height;
    const ratio = diffCount / totalPixel;
    return ratio <= thresholdRate;
  }
  return diffCount === 0;
};

const createDiff = async ({
  actualDir,
  expectedDir,
  diffDir,
  image,
  matchingThreshold,
  thresholdRate,
  thresholdPixel,
  enableAntialias,
}: DiffCreatorParams) => {
  const actualHash = await getMD5(path.join(actualDir, image));
  const expectedHash = await getMD5(path.join(expectedDir, image));

  if (actualHash === expectedHash) {
    if (!process || !process.send) return;
    return process.send({ passed: true, image });
  }

  const diffImage = image.replace(/\.[^.]+$/, '.png');
  const { width, height, diffCount } = await imgDiff({
    actualFilename: path.join(actualDir, image),
    expectedFilename: path.join(expectedDir, image),
    diffFilename: path.join(diffDir, diffImage),
    options: {
      threshold: matchingThreshold,
      includeAA: !enableAntialias,
    },
  });

  const passed = isPassed({
    width,
    height,
    diffCount,
    thresholdPixel,
    thresholdRate,
  });
  if (!process || !process.send) return;
  process.send({ passed, image });
};

process.on('message', (data: DiffCreatorParams) => {
  createDiff(data);
});
