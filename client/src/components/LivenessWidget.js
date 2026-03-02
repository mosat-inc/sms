import React from 'react';
import styled from 'styled-components';
import { colors, borderRadius, PrimaryButton, SecondaryButton } from './shared/StyledComponents';

const Wrapper = styled.div`
  display: grid;
  gap: 14px;
`;

const SessionMeta = styled.div`
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  background: ${colors.cardBackground};
  padding: 12px;
  font-size: 0.92rem;
  color: ${colors.textSecondary};

  code {
    color: ${colors.textPrimary};
    word-break: break-all;
    font-size: 0.86rem;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const LivenessWidget = ({ sessionId, onComplete, onCancel, loading }) => {
  return (
    <Wrapper>
      <div>
        This is a placeholder liveness UI. No face matching is done in the browser.
      </div>

      <SessionMeta>
        <div><strong>Liveness Session</strong></div>
        <code>{sessionId}</code>
      </SessionMeta>

      <Actions>
        <PrimaryButton type="button" onClick={onComplete} disabled={loading || !sessionId}>
          {loading ? 'Completing...' : 'Complete Liveness'}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </SecondaryButton>
      </Actions>
    </Wrapper>
  );
};

export default LivenessWidget;
