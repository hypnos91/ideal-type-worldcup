import path from "node:path";
import sharp from "sharp";
import type { FaceBox } from "@/lib/face";

// 사진에서 얼굴 위치 찾기(SSD MobileNet, TensorFlow.js wasm 백엔드). 네이티브 모듈 없이 Node 에서 돈다.
// 모델은 처음 쓸 때 한 번만 읽는다. 찾지 못하거나 실패하면 null(아바타는 위쪽 가운데로 자른다).
/* eslint-disable @typescript-eslint/no-require-imports -- tfjs·face-api 의 Node 빌드는 CommonJS 다 */
type FaceApi = typeof import("@vladmandic/face-api");
let ready: Promise<{ tf: typeof import("@tensorflow/tfjs"); faceapi: FaceApi }> | null = null;

function load() {
  ready ??= (async () => {
    const tf = require("@tensorflow/tfjs") as typeof import("@tensorflow/tfjs");
    const wasm = require("@tensorflow/tfjs-backend-wasm") as typeof import("@tensorflow/tfjs-backend-wasm");
    const faceapi = require("@vladmandic/face-api/dist/face-api.node-wasm.js") as FaceApi;
    wasm.setWasmPaths(path.join(process.cwd(), "node_modules/@tensorflow/tfjs-backend-wasm/dist") + path.sep);
    await tf.setBackend("wasm");
    await tf.ready();
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(path.join(process.cwd(), "node_modules/@vladmandic/face-api/model"));
    return { tf, faceapi };
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
/* eslint-enable @typescript-eslint/no-require-imports */

export async function detectFace(image: Buffer): Promise<FaceBox | null> {
  try {
    const { tf, faceapi } = await load();
    const { data, info } = await sharp(image).rotate().resize({ width: 512, height: 512, fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const input = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
    try {
      const found = await faceapi.detectAllFaces(input as never, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }));
      if (found.length === 0) return null;
      // 여러 얼굴이면 크고 확실한 쪽
      const best = found.reduce((a, b) => (b.score * b.box.area > a.score * a.box.area ? b : a));
      const W = info.width, H = info.height;
      const r = (n: number) => Math.round(n * 1000) / 1000;
      const x = Math.max(0, best.box.x) / W, y = Math.max(0, best.box.y) / H;
      return [r(x), r(y), r(Math.min(best.box.width / W, 1 - x)), r(Math.min(best.box.height / H, 1 - y)), r(W / H)];
    } finally {
      input.dispose();
    }
  } catch (e) {
    console.error("얼굴 찾기 실패", e);
    return null;
  }
}
