import type { NextConfig } from "next";

// 얼굴 찾기(src/server/face.ts)는 모델·wasm 파일을 실행 중에 디스크에서 읽으므로 번들하지 않고, 배포 함수에 파일을 같이 넣는다.
const FACE_FILES = [
  "./node_modules/@vladmandic/face-api/model/ssd_mobilenetv1_model*",
  "./node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm",
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@vladmandic/face-api", "@tensorflow/tfjs", "@tensorflow/tfjs-backend-wasm"],
  outputFileTracingIncludes: {
    "/api/admin/photos": FACE_FILES,
    "/api/admin/faces": FACE_FILES,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
