import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
} from '@aws-sdk/client-rekognition';

type SafeStartResult = {
  sessionId: string;
  expiresInSeconds: number;
};

type SafeLivenessResult = {
  sessionId: string;
  status: string;
  confidence: number | null;
  livenessPassed: boolean;
  failureReason: string | null;
};

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const sessionToken = process.env.AWS_SESSION_TOKEN || '';
const threshold = Number(process.env.AWS_REKOGNITION_LIVENESS_THRESHOLD || 80);
const sessionTtlSeconds = Number(process.env.AWS_REKOGNITION_LIVENESS_EXPIRES_SECONDS || 180);

const missingCreds = !accessKeyId || !secretAccessKey;

const client = new RekognitionClient({
  region,
  ...(missingCreds
    ? {}
    : {
        credentials: {
          accessKeyId,
          secretAccessKey,
          ...(sessionToken ? { sessionToken } : {}),
        },
      }),
});

export async function createFaceLivenessSession(): Promise<SafeStartResult> {
  const response = await client.send(new CreateFaceLivenessSessionCommand({}));
  if (!response.SessionId) {
    throw new Error('AWS Rekognition did not return a liveness session id');
  }

  return {
    sessionId: response.SessionId,
    expiresInSeconds: sessionTtlSeconds,
  };
}

export async function getFaceLivenessSessionResults(sessionId: string): Promise<SafeLivenessResult> {
  const response = await client.send(new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }));
  const status = String(response.Status || 'UNKNOWN');
  const confidence = typeof response.Confidence === 'number' ? Number(response.Confidence.toFixed(4)) : null;

  // Only trust AWS-computed status + confidence, never return image bytes/audit images to client.
  const livenessPassed = status === 'SUCCEEDED' && confidence !== null && confidence >= threshold;

  return {
    sessionId,
    status,
    confidence,
    livenessPassed,
    failureReason: livenessPassed ? null : status,
  };
}
