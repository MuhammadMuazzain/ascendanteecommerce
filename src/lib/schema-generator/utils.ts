export function generateSegmentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `seg_${timestamp}_${random}`;
}
