declare module "heic-decode" {
  /** HEIC 첫 이미지를 RGBA 로 푼다 */
  export default function decode(input: { buffer: ArrayBufferLike | Uint8Array }): Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
}
