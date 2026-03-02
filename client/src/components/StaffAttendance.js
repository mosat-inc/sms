import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { FaClock, FaDoorOpen, FaDoorClosed, FaSyncAlt, FaUserCheck } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  Card,
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  SectionTitle,
  StatsGrid,
  StatCard,
  colors,
  borderRadius,
  shadows,
} from './shared/StyledComponents';

const Wrapper = styled(PageContainer)`
  padding: 20px;
  ${mediaQuery('tablet')} {
    padding: 16px;
  }
  ${mediaQuery('mobile')} {
    padding: 12px;
  }
`;

const Hero = styled(Card)`
  padding: 18px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(99, 102, 241, 0.22);
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.12), rgba(99, 102, 241, 0.1), rgba(255, 255, 255, 0.88));
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 12px;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.9);
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  font-weight: 950;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: ${(p) =>
    p.$status === 'present'
      ? 'rgba(34, 197, 94, 0.14)'
      : p.$status === 'late'
        ? 'rgba(250, 204, 21, 0.18)'
        : 'rgba(239, 68, 68, 0.14)'};
  color: ${colors.textPrimary};
`;

const SessionCard = styled(Card)`
  padding: 16px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: ${shadows.card};
  display: grid;
  gap: 10px;
`;

const FaceModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  padding: 16px;
`;

const FaceModalCard = styled(Card)`
  width: 100%;
  max-width: 780px;
  border-radius: ${borderRadius.large};
  padding: 16px;
  display: grid;
  gap: 12px;
`;

const CameraView = styled.video`
  width: 100%;
  max-height: 420px;
  border-radius: ${borderRadius.medium};
  border: 1px solid ${colors.border};
  background: #000;
  object-fit: cover;
`;

const FaceStateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  font-weight: 850;
  font-size: 12px;
  background: ${(p) =>
    p.$state === 'success'
      ? 'rgba(34, 197, 94, 0.15)'
      : p.$state === 'failed'
        ? 'rgba(239, 68, 68, 0.14)'
        : 'rgba(59, 130, 246, 0.14)'};
`;

const formatDateLong = (d) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const fmtTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return String(value);
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const FACE_API_SCRIPT_ID = 'face-api-js-runtime';

const StaffAttendance = () => {
  const { api, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [faceFlow, setFaceFlow] = useState({
    open: false,
    phase: 'idle',
    message: '',
    error: '',
    sessionId: '',
    challengeType: '',
    challengeParams: null,
    session: 'morning',
  });

  const [faceResultBySession, setFaceResultBySession] = useState({});

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const faceApiRef = useRef(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const morningDeadline = process.env.REACT_APP_STAFF_MORNING_DEADLINE || '08:00';
  const afternoonDeadline = process.env.REACT_APP_STAFF_AFTERNOON_DEADLINE || '15:00';
  const modelUri = process.env.REACT_APP_FACE_MODELS_URI || '/models';
  const faceApiCdn = process.env.REACT_APP_FACE_API_CDN || 'https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js';

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/staff-attendance/me', { params: { date: today } });
      setRows(res.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load staff attendance.');
    } finally {
      setLoading(false);
    }
  }, [api, today]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const checkIn = async (session) => {
    try {
      await api.post('/api/staff-attendance/check-in', { session });
      toast.success(`Check-in recorded (${session}).`);
      await fetchMe();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Check-in failed.');
    }
  };

  const checkOut = async (session) => {
    try {
      await api.post('/api/staff-attendance/check-out', { session });
      toast.success(`Check-out recorded (${session}).`);
      await fetchMe();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Check-out failed.');
    }
  };

  const bySession = useMemo(() => {
    const map = new Map(rows.map((r) => [r.session, r]));
    return {
      morning: map.get('morning') || null,
      afternoon: map.get('afternoon') || null,
    };
  }, [rows]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const setFaceMessage = useCallback((message) => {
    setFaceFlow((prev) => ({
      ...prev,
      message,
    }));
  }, []);

  const loadModelsOnDemand = useCallback(async () => {
    if (faceApiRef.current) return faceApiRef.current;

    let faceapi = window.faceapi;
    if (!faceapi) {
      const existing = document.getElementById(FACE_API_SCRIPT_ID);
      if (existing) {
        await new Promise((resolve, reject) => {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        });
      } else {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.id = FACE_API_SCRIPT_ID;
          script.src = faceApiCdn;
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load face-api.js runtime script.'));
          document.body.appendChild(script);
        });
      }
      faceapi = window.faceapi;
    }

    if (!faceapi) {
      throw new Error('face-api.js runtime is unavailable.');
    }

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUri),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelUri),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUri),
    ]);

    faceApiRef.current = faceapi;
    return faceapi;
  }, [faceApiCdn, modelUri]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera is not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  const eyeAspectRatio = (eye) => {
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const A = dist(eye[1], eye[5]);
    const B = dist(eye[2], eye[4]);
    const C = dist(eye[0], eye[3]);
    return (A + B) / (2 * C);
  };

  const runLivenessChallenge = useCallback(
    async (challengeType) => {
      const faceapi = faceApiRef.current;
      if (!faceapi) throw new Error('Face models are not loaded yet.');
      if (!videoRef.current) throw new Error('Camera video not available.');

      const detectorOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });
      const startedAt = Date.now();
      const timeoutMs = 6000;

      let blinkCount = 0;
      let wasClosed = false;
      let neutralNoseX = null;
      let sawLeft = false;

      const metrics = {
        blinkCount: 0,
        sawLeft: false,
        sawRight: false,
        elapsedMs: 0,
      };

      while (Date.now() - startedAt < timeoutMs) {
        const allFaces = await faceapi
          .detectAllFaces(videoRef.current, detectorOpts)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (allFaces.length !== 1) {
          await wait(80);
          continue;
        }

        const face = allFaces[0];
        const landmarks = face.landmarks;

        if (challengeType === 'BLINK_2X') {
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
          const closed = ear < 0.2;
          const open = ear > 0.24;

          if (closed) wasClosed = true;
          if (wasClosed && open) {
            blinkCount += 1;
            wasClosed = false;
          }

          metrics.blinkCount = blinkCount;
          metrics.elapsedMs = Date.now() - startedAt;

          setFaceMessage(`Blinks detected: ${blinkCount}/2`);

          if (blinkCount >= 2) {
            return { passed: true, type: 'BLINK_2X', metrics };
          }
        } else {
          const nose = landmarks.getNose();
          const jaw = landmarks.getJawOutline();
          if (!nose?.length || jaw.length < 17) {
            await wait(80);
            continue;
          }

          const noseTip = nose[Math.floor(nose.length / 2)];
          const faceWidth = Math.max(1, Math.abs(jaw[16].x - jaw[0].x));

          if (neutralNoseX === null) neutralNoseX = noseTip.x;
          const normalizedDelta = (noseTip.x - neutralNoseX) / faceWidth;

          if (!sawLeft && normalizedDelta < -0.08) {
            sawLeft = true;
            metrics.sawLeft = true;
          }
          if (sawLeft && normalizedDelta > 0.08) {
            metrics.sawRight = true;
            metrics.elapsedMs = Date.now() - startedAt;
            return { passed: true, type: 'TURN_HEAD_LR', metrics };
          }

          setFaceMessage(sawLeft ? 'Good. Now turn your head to the right.' : 'Turn your head to the left first.');
        }

        await wait(80);
      }

      return {
        passed: false,
        type: challengeType,
        metrics: {
          ...metrics,
          elapsedMs: Date.now() - startedAt,
        },
      };
    },
    []
  );

  const captureDescriptors = useCallback(async () => {
    const faceapi = faceApiRef.current;
    if (!faceapi || !videoRef.current) throw new Error('Capture not ready');

    const detectorOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });
    const descriptors = [];

    for (let i = 0; i < 5; i += 1) {
      const allFaces = await faceapi
        .detectAllFaces(videoRef.current, detectorOpts)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (allFaces.length !== 1) {
        throw new Error('Exactly one face must be visible during capture.');
      }

      descriptors.push(Array.from(allFaces[0].descriptor));
      await wait(400);
    }

    return descriptors;
  }, []);

  const buildDeviceHash = useCallback(async () => {
    const raw = `${navigator.userAgent}|${navigator.platform}|${navigator.language}`;
    if (window.crypto?.subtle) {
      const data = new TextEncoder().encode(raw);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return btoa(raw).slice(0, 64);
  }, []);

  const closeFaceFlow = useCallback(() => {
    stopCamera();
    setFaceFlow({
      open: false,
      phase: 'idle',
      message: '',
      error: '',
      sessionId: '',
      challengeType: '',
      challengeParams: null,
      session: 'morning',
    });
  }, [stopCamera]);

  const runFaceAttendance = useCallback(
    async (session) => {
      try {
        setFaceFlow({
          open: true,
          phase: 'starting',
          message: 'Starting face attendance session...',
          error: '',
          sessionId: '',
          challengeType: '',
          challengeParams: null,
          session,
        });

        const startRes = await api.post('/api/attendance/face/start', { userId: Number(user?.id) });
        const payload = startRes?.data?.data || {};
        if (!payload.sessionId || !payload.challengeType) {
          throw new Error('Invalid face session response from server.');
        }

        setFaceFlow((prev) => ({
          ...prev,
          phase: 'loading_models',
          message: 'Loading face models...',
          sessionId: payload.sessionId,
          challengeType: payload.challengeType,
          challengeParams: payload.challengeParams || null,
        }));

        await loadModelsOnDemand();

        setFaceFlow((prev) => ({ ...prev, phase: 'camera', message: 'Requesting camera permission...' }));
        await startCamera();

        setFaceFlow((prev) => ({
          ...prev,
          phase: 'liveness',
          message:
            payload.challengeType === 'BLINK_2X'
              ? 'Liveness challenge: Blink twice within 6 seconds.'
              : 'Liveness challenge: Turn head left then right within 6 seconds.',
        }));

        const liveness = await runLivenessChallenge(payload.challengeType);
        if (!liveness.passed) {
          throw new Error('Liveness challenge failed. Please retry.');
        }

        setFaceFlow((prev) => ({ ...prev, phase: 'capturing', message: 'Capturing face descriptors...' }));
        const descriptors = await captureDescriptors();

        const deviceHash = await buildDeviceHash();

        setFaceFlow((prev) => ({ ...prev, phase: 'verifying', message: 'Verifying with server...' }));

        const completeRes = await api.post('/api/attendance/face/complete', {
          sessionId: payload.sessionId,
          userId: Number(user?.id),
          liveness,
          descriptors,
          deviceHash,
          eventType: 'IN',
        });

        if (!completeRes?.data?.success) {
          throw new Error('Face attendance verification failed.');
        }

        setFaceResultBySession((prev) => ({
          ...prev,
          [session]: { state: 'success', message: 'Face attendance recorded.' },
        }));

        setFaceFlow((prev) => ({ ...prev, phase: 'success', message: 'Face attendance recorded successfully.' }));
        toast.success('Face attendance marked successfully.');

        stopCamera();
        await fetchMe();
      } catch (error) {
        const permissionDenied =
          error?.name === 'NotAllowedError' ||
          error?.name === 'PermissionDeniedError' ||
          String(error?.message || '').toLowerCase().includes('permission');

        const message = permissionDenied
          ? 'Camera permission denied. Please allow camera access and retry.'
          : error?.response?.data?.error?.message ||
            error?.response?.data?.message ||
            error?.message ||
            'Face attendance failed.';

        setFaceResultBySession((prev) => ({
          ...prev,
          [session]: { state: 'failed', message },
        }));

        setFaceFlow((prev) => ({ ...prev, phase: 'failed', error: message, message: '' }));
        stopCamera();
        toast.error(message);
      }
    },
    [
      api,
      buildDeviceHash,
      captureDescriptors,
      fetchMe,
      loadModelsOnDemand,
      runLivenessChallenge,
      setFaceMessage,
      startCamera,
      stopCamera,
      user?.id,
    ]
  );

  const retryFaceFlow = useCallback(() => {
    const session = faceFlow.session || 'morning';
    runFaceAttendance(session);
  }, [faceFlow.session, runFaceAttendance]);

  return (
    <Wrapper>
      <PageHeader>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaUserCheck /> Staff Attendance
        </h1>
        <p style={{ color: colors.textSecondary, fontWeight: 800, lineHeight: 1.6 }}>
          Record your daily presence. School policy deadlines: Morning by <strong>{morningDeadline}</strong>, Afternoon by{' '}
          <strong>{afternoonDeadline}</strong>. (Admins can override when necessary.)
        </p>
      </PageHeader>

      <Hero>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6, minWidth: 240 }}>
            <div style={{ fontWeight: 950, color: colors.textPrimary, fontSize: '1.1rem' }}>
              Today: {formatDateLong(today)}
            </div>
            <div style={{ color: colors.textSecondary, fontWeight: 850 }}>
              Staff: <strong>{user?.first_name || user?.firstName || '—'} {user?.last_name || user?.lastName || ''}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge>
              <FaClock /> Deadlines: {morningDeadline} / {afternoonDeadline}
            </Badge>
            <SecondaryButton onClick={fetchMe} disabled={loading} style={{ borderRadius: 999 }}>
              <FaSyncAlt /> Refresh
            </SecondaryButton>
          </div>
        </div>

        <ActionsRow>
          <PrimaryButton onClick={() => checkIn('morning')} style={{ borderRadius: 999 }}>
            <FaDoorOpen /> Check In (Morning)
          </PrimaryButton>
          <SecondaryButton onClick={() => checkOut('morning')} style={{ borderRadius: 999 }}>
            <FaDoorClosed /> Check Out (Morning)
          </SecondaryButton>
          <PrimaryButton onClick={() => checkIn('afternoon')} style={{ borderRadius: 999 }}>
            <FaDoorOpen /> Check In (Afternoon)
          </PrimaryButton>
          <SecondaryButton onClick={() => checkOut('afternoon')} style={{ borderRadius: 999 }}>
            <FaDoorClosed /> Check Out (Afternoon)
          </SecondaryButton>
        </ActionsRow>

        <ActionsRow>
          <PrimaryButton onClick={() => runFaceAttendance('morning')} style={{ borderRadius: 999 }}>
            <FaUserCheck /> Face Attendance (Morning)
          </PrimaryButton>
          <PrimaryButton onClick={() => runFaceAttendance('afternoon')} style={{ borderRadius: 999 }}>
            <FaUserCheck /> Face Attendance (Afternoon)
          </PrimaryButton>

          {faceResultBySession.morning && (
            <FaceStateBadge $state={faceResultBySession.morning.state}>
              Morning: {faceResultBySession.morning.message}
            </FaceStateBadge>
          )}
          {faceResultBySession.afternoon && (
            <FaceStateBadge $state={faceResultBySession.afternoon.state}>
              Afternoon: {faceResultBySession.afternoon.message}
            </FaceStateBadge>
          )}
        </ActionsRow>
      </Hero>

      <Section>
        <SectionTitle>Today Overview</SectionTitle>
        <StatsGrid>
          <StatCard>
            <div className="stat-icon">🌅</div>
            <div className="stat-meta">
              <div className="stat-number">
                <StatusPill $status={bySession.morning?.status || 'absent'}>
                  {(bySession.morning?.status || 'not recorded').toUpperCase()}
                </StatusPill>
              </div>
              <div className="stat-label">Morning Status</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">🌇</div>
            <div className="stat-meta">
              <div className="stat-number">
                <StatusPill $status={bySession.afternoon?.status || 'absent'}>
                  {(bySession.afternoon?.status || 'not recorded').toUpperCase()}
                </StatusPill>
              </div>
              <div className="stat-label">Afternoon Status</div>
            </div>
          </StatCard>
        </StatsGrid>
      </Section>

      <Section>
        <SectionTitle>Details</SectionTitle>
        <div style={{ display: 'grid', gap: 12 }}>
          <SessionCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 950 }}>Morning</div>
              <StatusPill $status={bySession.morning?.status || 'absent'}>
                {(bySession.morning?.status || 'not recorded').toUpperCase()}
              </StatusPill>
            </div>
            <div style={{ display: 'grid', gap: 6, color: colors.textSecondary, fontWeight: 850 }}>
              <div>
                <strong>Check-in:</strong> {fmtTime(bySession.morning?.check_in_at)}
              </div>
              <div>
                <strong>Check-out:</strong> {fmtTime(bySession.morning?.check_out_at)}
              </div>
              <div>
                <strong>Notes:</strong> {bySession.morning?.notes || '—'}
              </div>
            </div>
          </SessionCard>

          <SessionCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 950 }}>Afternoon</div>
              <StatusPill $status={bySession.afternoon?.status || 'absent'}>
                {(bySession.afternoon?.status || 'not recorded').toUpperCase()}
              </StatusPill>
            </div>
            <div style={{ display: 'grid', gap: 6, color: colors.textSecondary, fontWeight: 850 }}>
              <div>
                <strong>Check-in:</strong> {fmtTime(bySession.afternoon?.check_in_at)}
              </div>
              <div>
                <strong>Check-out:</strong> {fmtTime(bySession.afternoon?.check_out_at)}
              </div>
              <div>
                <strong>Notes:</strong> {bySession.afternoon?.notes || '—'}
              </div>
            </div>
          </SessionCard>
        </div>
      </Section>

      {faceFlow.open && (
        <FaceModalBackdrop>
          <FaceModalCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0 }}>Face Attendance</h3>
                <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                  Session: <strong>{faceFlow.session}</strong> • Challenge: <strong>{faceFlow.challengeType || 'starting...'}</strong>
                </div>
              </div>
              <SecondaryButton onClick={closeFaceFlow} type="button">
                Close
              </SecondaryButton>
            </div>

            <CameraView ref={videoRef} autoPlay playsInline muted />

            {faceFlow.message && (
              <FaceStateBadge $state="running">{faceFlow.message}</FaceStateBadge>
            )}

            {faceFlow.error && (
              <FaceStateBadge $state="failed">{faceFlow.error}</FaceStateBadge>
            )}

            {faceFlow.phase === 'failed' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <PrimaryButton type="button" onClick={retryFaceFlow}>
                  Retry
                </PrimaryButton>
                <SecondaryButton type="button" onClick={closeFaceFlow}>
                  Cancel
                </SecondaryButton>
              </div>
            )}

            {faceFlow.phase === 'success' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <PrimaryButton type="button" onClick={closeFaceFlow}>
                  Done
                </PrimaryButton>
              </div>
            )}
          </FaceModalCard>
        </FaceModalBackdrop>
      )}
    </Wrapper>
  );
};

export default StaffAttendance;
