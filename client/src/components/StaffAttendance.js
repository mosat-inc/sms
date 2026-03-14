import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaChevronDown, FaFingerprint, FaRegCalendarAlt, FaSearch, FaSyncAlt, FaUserTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  Card,
  PageContainer,
  SecondaryButton,
  colors,
  borderRadius,
} from './shared/StyledComponents';

const Wrapper = styled(PageContainer)`
  padding: 24px;
  background: radial-gradient(circle at 15% 20%, rgba(167, 191, 255, 0.28), rgba(243, 246, 255, 0.92) 42%),
    linear-gradient(135deg, #ebefff, #f6f8ff);
  min-height: calc(100vh - 72px);
  ${mediaQuery('tablet')} {
    padding: 16px;
  }
  ${mediaQuery('mobile')} {
    padding: 14px;
  }
`;

const TopBar = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  ${mediaQuery('mobile')} {
    flex-direction: column;
  }
`;

const TitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PageTitle = styled.h1`
  margin: 0;
  color: #2f3f74;
  font-size: clamp(30px, 4.2vw, 44px);
  line-height: 1;
  letter-spacing: -0.02em;
`;

const SubTitle = styled.p`
  margin: 0;
  color: #506093;
  font-size: 31px;
  font-weight: 500;
  letter-spacing: 0.01em;
  ${mediaQuery('mobile')} {
    font-size: 20px;
  }
`;

const SearchBar = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 290px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(119, 138, 187, 0.2);
  padding: 10px 14px;
  color: #6474a7;
  box-shadow: 0 10px 26px rgba(75, 94, 155, 0.12);
  ${mediaQuery('mobile')} {
    width: 100%;
    min-width: 0;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  color: #455684;
  font-size: 20px;
  font-weight: 500;
  &::placeholder {
    color: #7d8eb7;
  }
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 14px;
  margin-bottom: 16px;
  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled(Card)`
  background: rgba(255, 255, 255, 0.67);
  border: 1px solid rgba(130, 147, 195, 0.24);
  border-radius: 24px;
  padding: 18px 20px;
  box-shadow: 0 16px 30px rgba(84, 103, 156, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SummaryMeta = styled.div`
  display: grid;
  gap: 8px;
`;

const SummaryLabel = styled.div`
  color: #415588;
  font-weight: 700;
  font-size: 20px;
`;

const SummaryValue = styled.div`
  color: #2c3d71;
  font-size: 44px;
  line-height: 1;
  font-weight: 800;
`;

const SummarySub = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #516292;
  font-size: 29px;
`;

const StatusText = styled.div`
  color: ${(p) => (p.$status === 'absent' ? '#d86176' : '#3c9d67')};
  font-size: 44px;
  line-height: 1;
  font-weight: 800;
`;

const StatusPercent = styled.div`
  color: #7d8eb7;
  font-size: 31px;
`;

const StatusIconWrap = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: rgba(235, 215, 229, 0.6);
  display: grid;
  place-items: center;
  color: #d86176;
  font-size: 36px;
`;

const RecordsCard = styled(Card)`
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(132, 150, 194, 0.26);
  border-radius: 28px;
  padding: 18px;
  box-shadow: 0 18px 36px rgba(96, 113, 168, 0.15);
  display: grid;
  gap: 14px;
`;

const RecordsHeader = styled.div`
  display: grid;
  gap: 10px;
`;

const RecordsTitle = styled.h2`
  margin: 0;
  color: #2f4275;
  font-size: 20px;
  font-weight: 800;
`;

const FilterPill = styled.button`
  border: 1px solid rgba(121, 140, 191, 0.24);
  background: rgba(236, 241, 255, 0.85);
  color: #3f5388;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  width: fit-content;
  min-width: 230px;
  font-size: 22px;
  font-weight: 600;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const RecordsTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: #33477d;
  min-width: 760px;
  th {
    text-align: left;
    padding: 12px 14px;
    background: rgba(232, 237, 255, 0.95);
    font-size: 18px;
    color: #405488;
    font-weight: 700;
    border-bottom: 1px solid rgba(178, 192, 229, 0.28);
  }
  th:first-child {
    border-top-left-radius: 12px;
  }
  th:last-child {
    border-top-right-radius: 12px;
  }
  td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(177, 191, 227, 0.3);
    font-size: 18px;
    color: #3b4f82;
  }
`;

const NameCell = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Avatar = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #8cb4ff, #6278c7);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
`;

const StatusTag = styled.span`
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  background: ${(p) => (p.$status === 'present' ? 'rgba(82, 177, 124, 0.22)' : 'rgba(216, 97, 118, 0.18)')};
  color: ${(p) => (p.$status === 'present' ? '#2f8257' : '#c2556d')};
`;

const TableFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  color: #6173a5;
  font-size: 18px;
`;

const TakeButton = styled.button`
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #6da0ff, #4d70da);
  color: #fff;
  padding: 11px 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 10px 20px rgba(84, 108, 188, 0.24);
  cursor: pointer;
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

const fmtTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return String(value);
  }
};

const formatDateHuman = (d) =>
  new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

const formatWeekday = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long' });

const calcHours = (inAt, outAt) => {
  if (!inAt || !outAt) return '--';
  const start = new Date(inAt).getTime();
  const end = new Date(outAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return '--';
  const minutes = Math.round((end - start) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const FACE_API_SCRIPT_ID = 'face-api-js-runtime';
const DEFAULT_FACE_API_SCRIPT = '/vendor/face-api.min.js';
const DEFAULT_FACE_MODELS_URI = '/models';
const FACE_MODEL_TIMEOUT_MS = 120000;

const withTimeout = (promise, ms, label) =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds.`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });

const StaffAttendance = () => {
  const { api, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
  const modelUri = process.env.REACT_APP_FACE_MODELS_URI || DEFAULT_FACE_MODELS_URI;
  const faceApiCdn = process.env.REACT_APP_FACE_API_CDN || DEFAULT_FACE_API_SCRIPT;

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

    setFaceMessage('Loading face detector model...');
    await withTimeout(faceapi.nets.tinyFaceDetector.loadFromUri(modelUri), 45000, 'Tiny face detector model');

    setFaceMessage('Loading face landmarks model...');
    await withTimeout(faceapi.nets.faceLandmark68Net.loadFromUri(modelUri), 60000, 'Face landmark model');

    setFaceMessage('Loading face recognition model...');
    await withTimeout(faceapi.nets.faceRecognitionNet.loadFromUri(modelUri), FACE_MODEL_TIMEOUT_MS, 'Face recognition model');

    faceApiRef.current = faceapi;
    return faceapi;
  }, [faceApiCdn, modelUri, setFaceMessage]);

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
    [setFaceMessage]
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
      startCamera,
      stopCamera,
      user?.id,
    ]
  );

  const retryFaceFlow = useCallback(() => {
    const session = faceFlow.session || 'morning';
    runFaceAttendance(session);
  }, [faceFlow.session, runFaceAttendance]);

  const overallStatus = useMemo(() => {
    const statuses = [bySession.morning?.status, bySession.afternoon?.status].filter(Boolean);
    const presentCount = statuses.filter((s) => String(s).toLowerCase() === 'present').length;
    const pct = statuses.length ? Math.round((presentCount / statuses.length) * 100) : 0;
    return {
      label: pct === 100 ? 'Present' : 'Absent',
      pct,
    };
  }, [bySession.afternoon?.status, bySession.morning?.status]);

  const nextFaceSession = useMemo(() => {
    const morningDone = String(bySession.morning?.status || '').toLowerCase() === 'present';
    return morningDone ? 'afternoon' : 'morning';
  }, [bySession.morning?.status]);

  const tableRows = useMemo(() => {
    const base = rows.map((r, idx) => ({
      key: `${r.session || 'session'}-${idx}`,
      serial: idx + 1,
      code: r.session === 'morning' ? 'M' : 'A',
      dateLabel: formatDateHuman(r.date || today),
      status: String(r.status || 'absent').toLowerCase(),
      checkIn: fmtTime(r.check_in_at),
      checkOut: fmtTime(r.check_out_at),
      hours: calcHours(r.check_in_at, r.check_out_at),
      note: r.session || '',
    }));
    const term = searchTerm.trim().toLowerCase();
    if (!term) return base;
    return base.filter((r) =>
      [r.dateLabel, r.status, r.checkIn, r.checkOut, r.hours, r.note, r.code].join(' ').toLowerCase().includes(term)
    );
  }, [rows, searchTerm, today]);

  return (
    <Wrapper>
      <TopBar>
        <TitleWrap>
          <PageTitle>Attendance</PageTitle>
          <SubTitle>View & Track Your Daily Attendance</SubTitle>
        </TitleWrap>
        <SearchBar>
          <FaSearch />
          <SearchInput
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search past records..."
          />
        </SearchBar>
      </TopBar>

      <SummaryRow>
        <SummaryCard>
          <SummaryMeta>
            <SummaryLabel>Today&apos;s Date</SummaryLabel>
            <SummaryValue>{formatDateHuman(today)}</SummaryValue>
            <SummarySub>
              <FaRegCalendarAlt /> {formatWeekday(today)}
            </SummarySub>
          </SummaryMeta>
        </SummaryCard>

        <SummaryCard>
          <SummaryMeta>
            <SummaryLabel>Your Status Today</SummaryLabel>
            <StatusText $status={overallStatus.label.toLowerCase()}>{overallStatus.label}</StatusText>
            <StatusPercent>({overallStatus.pct}%)</StatusPercent>
          </SummaryMeta>
          <StatusIconWrap>
            <FaUserTimes />
          </StatusIconWrap>
        </SummaryCard>
      </SummaryRow>

      <RecordsCard>
        <RecordsHeader>
          <RecordsTitle>Attendance Records</RecordsTitle>
          <FilterPill type="button">
            <FaCalendarAlt />
            {new Date(today).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            <FaChevronDown style={{ marginLeft: 'auto' }} />
          </FilterPill>
        </RecordsHeader>

        <TableWrap>
          <RecordsTable>
            <thead>
              <tr>
                <th>#</th>
                <th>#</th>
                <th>Date</th>
                <th>Status</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#7b8dbc', padding: '18px 12px' }}>
                    No attendance records found.
                  </td>
                </tr>
              )}
              {tableRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.serial}</td>
                  <td>
                    <NameCell>
                      <span style={{ color: '#7d8eb8', fontWeight: 700 }}>{row.code}</span>
                      <Avatar>
                        {(user?.first_name || user?.firstName || 'S').slice(0, 1).toUpperCase()}
                      </Avatar>
                    </NameCell>
                  </td>
                  <td>
                    <strong>{row.dateLabel}</strong>{' '}
                    <span style={{ color: '#7d8eb8', fontWeight: 600 }}>{row.serial === 1 ? 'Today' : row.note}</span>
                  </td>
                  <td>
                    <StatusTag $status={row.status}>{row.status === 'present' ? 'Present' : 'Absent'}</StatusTag>
                  </td>
                  <td>{row.checkIn}</td>
                  <td>{row.checkOut}</td>
                  <td>{row.hours}</td>
                </tr>
              ))}
            </tbody>
          </RecordsTable>
        </TableWrap>

        <TableFooter>
          <div>Showing 1 - {tableRows.length} of {tableRows.length}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SecondaryButton onClick={fetchMe} disabled={loading} style={{ borderRadius: 12 }}>
              <FaSyncAlt /> Refresh
            </SecondaryButton>
            <TakeButton type="button" onClick={() => runFaceAttendance(nextFaceSession)}>
              <FaFingerprint /> Take Attendance
            </TakeButton>
          </div>
        </TableFooter>

        {(faceResultBySession.morning || faceResultBySession.afternoon) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          </div>
        )}
      </RecordsCard>

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
                <TakeButton type="button" onClick={retryFaceFlow}>
                  Retry
                </TakeButton>
                <SecondaryButton type="button" onClick={closeFaceFlow}>
                  Cancel
                </SecondaryButton>
              </div>
            )}

            {faceFlow.phase === 'success' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <TakeButton type="button" onClick={closeFaceFlow}>
                  Done
                </TakeButton>
              </div>
            )}
          </FaceModalCard>
        </FaceModalBackdrop>
      )}
    </Wrapper>
  );
};

export default StaffAttendance;
