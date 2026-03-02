export type LandmarkPoint = {
  x: number;
  y: number;
};

export type FaceLandmarksFrame = {
  timestampMs: number;
  leftEye: LandmarkPoint[];
  rightEye: LandmarkPoint[];
  noseTip: LandmarkPoint;
};

export type BlinkDetectorOptions = {
  closeThreshold?: number;
  openThreshold?: number;
  requiredBlinks?: number;
  debounceMs?: number;
};

export type HeadTurnDetectorOptions = {
  leftThreshold?: number;
  rightThreshold?: number;
  requireSequence?: boolean;
};

export type BlinkMetrics = {
  startedAtMs: number | null;
  lastUpdatedAtMs: number | null;
  currentEAR: number | null;
  blinkCount: number;
  blinkTimestampsMs: number[];
  eyesClosed: boolean;
  passed: boolean;
};

export type HeadTurnMetrics = {
  startedAtMs: number | null;
  lastUpdatedAtMs: number | null;
  normalizedNoseOffsetX: number | null;
  sawLeft: boolean;
  sawRight: boolean;
  sawLeftAtMs: number | null;
  sawRightAtMs: number | null;
  passed: boolean;
};

export type LivenessAuditMetrics = {
  timestampMs: number;
  ear: number;
  normalizedNoseOffsetX: number;
  blink: BlinkMetrics;
  headTurn: HeadTurnMetrics;
};

const distance = (a: LandmarkPoint, b: LandmarkPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Compute Eye Aspect Ratio (EAR) from 6 eye landmarks.
 * Landmark order is expected to follow the common dlib/face-api style:
 * [p1, p2, p3, p4, p5, p6]
 */
export function computeEAR(eye: LandmarkPoint[]): number {
  if (!Array.isArray(eye) || eye.length < 6) {
    throw new Error('computeEAR expects 6 eye landmarks');
  }

  const p1 = eye[0];
  const p2 = eye[1];
  const p3 = eye[2];
  const p4 = eye[3];
  const p5 = eye[4];
  const p6 = eye[5];

  const verticalA = distance(p2, p6);
  const verticalB = distance(p3, p5);
  const horizontal = distance(p1, p4);

  if (horizontal <= 0) return 0;
  return (verticalA + verticalB) / (2 * horizontal);
}

export function createBlinkDetector(options: BlinkDetectorOptions = {}) {
  const closeThreshold = options.closeThreshold ?? 0.2;
  const openThreshold = options.openThreshold ?? 0.24;
  const requiredBlinks = options.requiredBlinks ?? 2;
  const debounceMs = options.debounceMs ?? 180;

  let startedAtMs: number | null = null;
  let lastUpdatedAtMs: number | null = null;
  let eyesClosed = false;
  let blinkCount = 0;
  let currentEAR: number | null = null;
  let lastBlinkAtMs = -Infinity;
  const blinkTimestampsMs: number[] = [];

  const getMetrics = (): BlinkMetrics => ({
    startedAtMs,
    lastUpdatedAtMs,
    currentEAR,
    blinkCount,
    blinkTimestampsMs: [...blinkTimestampsMs],
    eyesClosed,
    passed: blinkCount >= requiredBlinks,
  });

  const update = (ear: number, timestampMs: number): BlinkMetrics => {
    if (!Number.isFinite(ear)) {
      throw new Error('Blink detector requires finite EAR value');
    }

    if (!Number.isFinite(timestampMs)) {
      throw new Error('Blink detector requires finite timestampMs value');
    }

    if (startedAtMs === null) startedAtMs = timestampMs;
    lastUpdatedAtMs = timestampMs;
    currentEAR = ear;

    const isClosed = ear <= closeThreshold;
    const isOpen = ear >= openThreshold;

    if (isClosed) {
      eyesClosed = true;
    }

    // Count blink when we transition from closed to open and pass debounce window.
    if (eyesClosed && isOpen) {
      if (timestampMs - lastBlinkAtMs >= debounceMs) {
        blinkCount += 1;
        lastBlinkAtMs = timestampMs;
        blinkTimestampsMs.push(timestampMs);
      }
      eyesClosed = false;
    }

    return getMetrics();
  };

  const reset = () => {
    startedAtMs = null;
    lastUpdatedAtMs = null;
    eyesClosed = false;
    blinkCount = 0;
    currentEAR = null;
    lastBlinkAtMs = -Infinity;
    blinkTimestampsMs.length = 0;
  };

  return {
    update,
    getMetrics,
    reset,
  };
}

export function createHeadTurnDetector(options: HeadTurnDetectorOptions = {}) {
  const leftThreshold = options.leftThreshold ?? -0.08;
  const rightThreshold = options.rightThreshold ?? 0.08;
  const requireSequence = options.requireSequence ?? true;

  let startedAtMs: number | null = null;
  let lastUpdatedAtMs: number | null = null;
  let normalizedNoseOffsetX: number | null = null;
  let sawLeft = false;
  let sawRight = false;
  let sawLeftAtMs: number | null = null;
  let sawRightAtMs: number | null = null;

  const getMetrics = (): HeadTurnMetrics => {
    const passed = requireSequence ? sawLeft && sawRight : sawLeft || sawRight;
    return {
      startedAtMs,
      lastUpdatedAtMs,
      normalizedNoseOffsetX,
      sawLeft,
      sawRight,
      sawLeftAtMs,
      sawRightAtMs,
      passed,
    };
  };

  const update = (
    noseTipX: number,
    leftEyeOuterX: number,
    rightEyeOuterX: number,
    timestampMs: number
  ): HeadTurnMetrics => {
    if (!Number.isFinite(noseTipX) || !Number.isFinite(leftEyeOuterX) || !Number.isFinite(rightEyeOuterX)) {
      throw new Error('Head turn detector requires finite nose/eye x positions');
    }

    if (!Number.isFinite(timestampMs)) {
      throw new Error('Head turn detector requires finite timestampMs value');
    }

    if (startedAtMs === null) startedAtMs = timestampMs;
    lastUpdatedAtMs = timestampMs;

    const eyeMidX = (leftEyeOuterX + rightEyeOuterX) / 2;
    const eyeDistance = Math.max(1e-6, Math.abs(rightEyeOuterX - leftEyeOuterX));
    normalizedNoseOffsetX = (noseTipX - eyeMidX) / eyeDistance;

    if (!sawLeft && normalizedNoseOffsetX <= leftThreshold) {
      sawLeft = true;
      sawLeftAtMs = timestampMs;
    }

    if (sawLeft && !sawRight && normalizedNoseOffsetX >= rightThreshold) {
      sawRight = true;
      sawRightAtMs = timestampMs;
    }

    if (!requireSequence && !sawRight && normalizedNoseOffsetX >= rightThreshold) {
      sawRight = true;
      sawRightAtMs = timestampMs;
    }

    return getMetrics();
  };

  const reset = () => {
    startedAtMs = null;
    lastUpdatedAtMs = null;
    normalizedNoseOffsetX = null;
    sawLeft = false;
    sawRight = false;
    sawLeftAtMs = null;
    sawRightAtMs = null;
  };

  return {
    update,
    getMetrics,
    reset,
  };
}

/**
 * Convenience utility to process one frame and return audit-ready liveness metrics.
 */
export function evaluateLivenessFrame(
  frame: FaceLandmarksFrame,
  blinkDetector: ReturnType<typeof createBlinkDetector>,
  headTurnDetector: ReturnType<typeof createHeadTurnDetector>
): LivenessAuditMetrics {
  const leftEAR = computeEAR(frame.leftEye);
  const rightEAR = computeEAR(frame.rightEye);
  const ear = (leftEAR + rightEAR) / 2;

  const leftEyeOuter = frame.leftEye[0];
  const rightEyeOuter = frame.rightEye[3];

  const blink = blinkDetector.update(ear, frame.timestampMs);
  const headTurn = headTurnDetector.update(
    frame.noseTip.x,
    leftEyeOuter.x,
    rightEyeOuter.x,
    frame.timestampMs
  );

  return {
    timestampMs: frame.timestampMs,
    ear,
    normalizedNoseOffsetX: headTurn.normalizedNoseOffsetX ?? 0,
    blink,
    headTurn,
  };
}
