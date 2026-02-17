import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import parentApi from '../services/parentHttp';
import { getParentToken, setParentMustChangePassword, setParentToken } from '../utils/parentAuth';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top, #e5f0ff 0, #f3f4f6 45%, #f9fafb 100%);
`;

const Card = styled.div`
  width: 100%;
  max-width: 560px;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 22px 22px 18px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 35%, #6366f1 70%, #a855f7 100%);
  color: #fff;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  margin: 10px 0 0;
  opacity: 0.92;
  line-height: 1.55;
  font-weight: 600;
`;

const Body = styled.div`
  padding: 18px 22px 22px;
`;

const Form = styled.form`
  display: grid;
  gap: 14px;
  margin-top: 12px;
`;

const Label = styled.label`
  display: block;
  font-weight: 800;
  font-size: 0.9rem;
  margin-bottom: 7px;
  color: rgba(15, 23, 42, 0.88);
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #0f172a;
  font-size: 1rem;
  outline: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;

  &:focus {
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
  }
`;

const Hint = styled.div`
  margin-top: -4px;
  font-size: 0.86rem;
  color: rgba(15, 23, 42, 0.7);
  font-weight: 600;
  line-height: 1.45;
`;

const ErrorBox = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(244, 63, 94, 0.2);
  background: rgba(244, 63, 94, 0.08);
  color: rgb(136, 19, 55);
  padding: 12px 12px;
  font-weight: 800;
  font-size: 0.92rem;
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);
  box-shadow: 0 18px 55px rgba(99, 102, 241, 0.24);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 24px 80px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const SecondaryButton = styled.button`
  width: 100%;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: rgba(15, 23, 42, 0.9);
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: rgba(15, 23, 42, 0.03);
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
  }
`;

const Row = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 12px;
`;

const ParentChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasToken = useMemo(() => Boolean(getParentToken()), []);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!hasToken) {
      toast.warning('Please login again.');
      window.location.href = '/login';
      return;
    }

    if (!currentPassword || !newPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await parentApi.post('/api/parent/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.data?.success && res.data?.data?.token) {
        setParentToken(res.data.data.token);
        setParentMustChangePassword(false);
        toast.success('Password updated successfully');
        window.location.href = '/parent/portal?menu=profile';
        return;
      }

      setError(res.data?.message || 'Failed to update password.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Card>
        <Header>
          <Title>Update Parent Password</Title>
          <Subtitle>
            For security, please change the temporary password provided by the school. Your new password must include at least
            one letter and one number.
          </Subtitle>
        </Header>
        <Body>
          {error ? <ErrorBox>{error}</ErrorBox> : null}
          <Form onSubmit={submit}>
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a new password"
                autoComplete="new-password"
                disabled={loading}
              />
              <Hint>Minimum 8 characters, include letters and numbers.</Hint>
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <Row>
              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                disabled={loading}
                onClick={() => {
                  window.location.href = '/parent/portal';
                }}
              >
                Back to Parent Dashboard
              </SecondaryButton>
            </Row>
          </Form>
        </Body>
      </Card>
    </Page>
  );
};

export default ParentChangePassword;

