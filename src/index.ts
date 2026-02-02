import EventEmitter from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import bluebird from 'bluebird';
import { deleteAsync } from 'del';
import range from 'lodash/range.js';
import mkdirp from 'make-dir';
import { findImages } from './image-finder.js';
import log from './log.js';
import ProcessAdaptor from './process-adaptor.js';
import createReport from './report.js';

type CompareResult = {
  passed: boolean;
  image: string;
};

type ImageOverride = {
  matchingThreshold?: number;
  thresholdRate?: number;
  thresholdPixel?: number;
};

type ImageOverridesOption = { [key: string]: ImageOverride };

type RegParams = {
  actualDir: string;
  expectedDir: string;
  diffDir: string;
  report?: string;
  junitReport?: string;
  json?: string;
  update?: boolean;
  extendedErrors?: boolean;
  urlPrefix?: string;
  matchingThreshold?: number;
  threshold?: number; // alias to thresholdRate.
  thresholdRate?: number;
  thresholdPixel?: number;
  concurrency?: number;
  enableAntialias?: boolean;
  enableClientAdditionalDetection?: boolean;
  imageOverrides?: ImageOverridesOption;
};

type CopyImagesOptions = {
  expectedDir: string;
  actualDir: string;
};

const copyImages = (
  actualImages: Array<string>,
  { expectedDir, actualDir }: CopyImagesOptions,
) => {
  return Promise.all(
    actualImages.map(
      (image) =>
        new Promise((resolve, reject) => {
          try {
            mkdirp.sync(path.dirname(path.join(expectedDir, image)));
            const writeStream = fs.createWriteStream(
              path.join(expectedDir, image),
            );
            fs.createReadStream(path.join(actualDir, image)).pipe(writeStream);
            writeStream.on('finish', (err) => {
              if (err) reject(err);
              resolve(image);
            });
          } catch (err) {
            reject(err);
          }
        }),
    ),
  );
};

type CompareImagesOptions = {
  expectedImages: Array<string>;
  actualImages: Array<string>;
  dirs: {
    actualDir: string;
    expectedDir: string;
    diffDir: string;
  };
  matchingThreshold: number;
  thresholdPixel: number | undefined;
  thresholdRate: number | undefined;
  concurrency: number;
  enableAntialias: boolean;
  imageOverrides?: ImageOverridesOption;
};

type CompareEvents = {
  start: [];
  compare: [val: { type: 'new' | 'deleted'; path: string }];
  update: [];
  error: [val: Error | string];
};

const compareImages = (
  emitter: EventEmitter<CompareEvents>,
  {
    expectedImages,
    actualImages,
    dirs,
    matchingThreshold,
    thresholdPixel,
    thresholdRate,
    concurrency,
    enableAntialias,
    imageOverrides,
  }: CompareImagesOptions,
): Promise<CompareResult[]> => {
  const images = actualImages.filter((actualImage) =>
    expectedImages.includes(actualImage),
  );
  concurrency = images.length < 20 ? 1 : concurrency || 4;
  const processes = range(concurrency).map(() => new ProcessAdaptor(emitter));
  return bluebird
    .map(
      images,
      (image) => {
        const p = processes.find((p) => !p.isRunning());
        if (p) {
          // Get per-image overrides if they exist
          const override = imageOverrides?.[image];
          const imageMatchingThreshold =
            override?.matchingThreshold ?? matchingThreshold;
          const imageThresholdRate = override?.thresholdRate ?? thresholdRate;
          const imageThresholdPixel =
            override?.thresholdPixel ?? thresholdPixel;

          return p.run({
            ...dirs,
            image,
            matchingThreshold: imageMatchingThreshold,
            thresholdRate: imageThresholdRate,
            thresholdPixel: imageThresholdPixel,
            enableAntialias,
          });
        }
      },
      { concurrency },
    )
    .then((result) => {
      processes.forEach((p) => {
        p.close();
      });
      return result;
    })
    .filter((r) => !!r);
};

const cleanupExpectedDir = (
  expectedDir: string,
  changedFiles: Array<string>,
) => {
  const paths = changedFiles.map((image) => {
    const directories = expectedDir.split('\\');
    return escapeGlob(path.posix.join(...directories, image));
  });
  // force: true needed to allow deleting outside working directory
  return deleteAsync(paths, { force: true });
};

const escapeGlob = (fileName: string) => {
  return fileName
    .replace(/(\*)/g, '[$1]')
    .replace(/(\*)/g, '[$1]')
    .replace(/(\?)/g, '[$1]')
    .replace(/(\[)/g, '[$1]')
    .replace(/(\])/g, '[$1]')
    .replace(/(\{)/g, '[$1]')
    .replace(/(\})/g, '[$1]')
    .replace(/(\))/g, '[$1]')
    .replace(/(\()/g, '[$1]')
    .replace(/(!)/g, '[$1]');
};

const aggregate = (result: Array<CompareResult>) => {
  const passed = result.filter((r) => r.passed).map((r) => r.image);
  const failed = result.filter((r) => !r.passed).map((r) => r.image);
  const diffItems = failed.map((image) => image.replace(/\.[^.]+$/, '.png'));
  return { passed, failed, diffItems };
};

type UpdateExpectedOptions = {
  actualDir: string;
  expectedDir: string;
  deletedImages: Array<string>;
  newImages: Array<string>;
  diffItems: Array<string>;
};

const updateExpected = ({
  actualDir,
  expectedDir,
  deletedImages,
  newImages,
  diffItems,
}: UpdateExpectedOptions) => {
  return cleanupExpectedDir(expectedDir, [...deletedImages, ...diffItems])
    .then(() =>
      copyImages([...newImages, ...diffItems], {
        actualDir,
        expectedDir,
      }),
    )
    .then(() => {
      log.success(`\nAll images are updated. `);
    });
};

export default (params: RegParams) => {
  const {
    actualDir,
    expectedDir,
    diffDir,
    json,
    concurrency = 4,
    update,
    report,
    junitReport,
    extendedErrors,
    urlPrefix,
    threshold,
    matchingThreshold = 0,
    thresholdRate,
    thresholdPixel,
    enableAntialias,
    enableClientAdditionalDetection,
    imageOverrides,
  } = params;
  const dirs = { actualDir, expectedDir, diffDir };
  const emitter = new EventEmitter();

  const { expectedImages, actualImages, deletedImages, newImages } = findImages(
    expectedDir,
    actualDir,
  );

  mkdirp.sync(expectedDir);
  mkdirp.sync(diffDir);

  setImmediate(() => emitter.emit('start'));
  compareImages(emitter, {
    expectedImages,
    actualImages,
    dirs,
    matchingThreshold,
    thresholdRate: thresholdRate || threshold,
    thresholdPixel,
    concurrency,
    enableAntialias: !!enableAntialias,
    imageOverrides,
  })
    .then((result) => aggregate(result))
    .then(({ passed, failed, diffItems }) => {
      return createReport({
        passedItems: passed,
        failedItems: failed,
        newItems: newImages,
        deletedItems: deletedImages,
        expectedItems: update ? actualImages : expectedImages,
        actualItems: actualImages,
        diffItems,
        json: json || './reg.json',
        actualDir,
        expectedDir,
        diffDir,
        report: report || '',
        junitReport: junitReport || '',
        extendedErrors: !!extendedErrors,
        urlPrefix: urlPrefix || '',
        enableClientAdditionalDetection: !!enableClientAdditionalDetection,
      });
    })
    .then((result) => {
      deletedImages.forEach((image) => {
        emitter.emit('compare', { type: 'delete', path: image });
      });
      newImages.forEach((image) => {
        emitter.emit('compare', { type: 'new', path: image });
      });
      if (update) {
        return updateExpected({
          actualDir,
          expectedDir,
          deletedImages,
          newImages,
          diffItems: result.diffItems,
        }).then(() => {
          emitter.emit('update');
          return result;
        });
      }
      return result;
    })
    .then((result) => emitter.emit('complete', result))
    .catch((err) => emitter.emit('error', err));

  return emitter;
};
