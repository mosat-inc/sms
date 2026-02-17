import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { setParentMustChangePassword, setParentToken } from '../utils/parentAuth';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top, #e5f0ff 0, #f3f4f6 45%, #f9fafb 100%);
`;

const Shell = styled.div`
  width: 100%;
  max-width: 980px;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
  display: grid;
  grid-template-columns: 1.05fr 1fr;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Left = styled.div`
  padding: 36px 36px 30px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 35%, #6366f1 70%, #a855f7 100%);
  color: #fff;
  position: relative;

  @media (max-width: 900px) {
    padding: 30px 20px 24px;
  }
`;

const Right = styled.div`
  padding: 0;
  /* Match the illustration dominant color so any letterboxing doesn't show as white */
  background: #7c3aed;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  position: relative;
  overflow: hidden;

  @media (max-width: 900px) {
    display: none;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
`;

const BrandText = styled.div`
  h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  p {
    margin: 4px 0 0;
    opacity: 0.9;
    font-size: 0.92rem;
  }
`;

const Tabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 18px 0 18px;
`;

const TabButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: ${(p) => (p.$active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)')};
  color: #fff;
  padding: 12px 12px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 800;
  letter-spacing: 0.02em;
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.55);
  }
`;

const Title = styled.h2`
  margin: 4px 0 8px;
  font-size: 2rem;
  font-weight: 900;
`;

const Subtitle = styled.p`
  margin: 0 0 18px;
  opacity: 0.92;
  line-height: 1.6;
`;

const Form = styled.form`
  display: grid;
  gap: 14px;
  margin-top: 16px;
`;

const Field = styled.div``;

const Label = styled.label`
  display: block;
  font-weight: 700;
  margin-bottom: 7px;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.92);
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.75);
  }

  &:focus {
    border-color: rgba(255, 255, 255, 0.55);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.16);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  color: #0f172a;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 22px 60px rgba(15, 23, 42, 0.32);
  }

  &:disabled {
    opacity: 0.75;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const FooterLinks = styled.div`
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 0.92rem;
  display: grid;
  gap: 8px;

  a {
    color: rgba(255, 255, 255, 0.95);
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Illustration = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
  background: #7c3aed;
  border: none;
  overflow: hidden;
`;

const IllustrationImg = styled.img`
  width: 100%;
  height: 100%;
  /* Use cover so the image fills the panel with no top/bottom gaps */
  object-fit: cover;
  object-position: center;
  display: block;
  background: #7c3aed;
`;

const normalizeMode = (mode) => (mode === 'parent' ? 'parent' : 'teacher');

const Login = ({ initialMode = 'teacher' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState(normalizeMode(initialMode));
  const [loading, setLoading] = useState(false);

  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const [admissionNumber, setAdmissionNumber] = useState('');
  const [parentPassword, setParentPassword] = useState('');

  useEffect(() => {
    const requested = location.state?.loginMode;
    if (requested) setMode(normalizeMode(requested));
  }, [location.state]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);

      if (mode === 'teacher') {
        if (!teacherEmail || !teacherPassword) {
          toast.error('Please enter email and password');
          return;
        }

        const result = await login(teacherEmail, teacherPassword);
        if (result.success) {
          if (result.must_change_password) {
            toast.info(result.message || 'Please change your temporary password');
            navigate('/first-time-password-change', {
              state: {
                tempToken: result.token,
                user: result.user,
              },
            });
            return;
          }

          toast.success('Welcome! Login successful!');
          navigate('/dashboard');
          return;
        }

        toast.error(result.message || 'Login failed');
        return;
      }

      // Parent / Guardian login
      if (!admissionNumber || !parentPassword) {
        toast.error('Please enter admission number and password');
        return;
      }

      const res = await axios.post(
        '/api/parent/login',
        {
          admission_number: admissionNumber.trim(),
          password: parentPassword,
        },
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.data?.token) {
        setParentToken(res.data.data.token);
        setParentMustChangePassword(Boolean(res.data?.data?.must_change_password));
        toast.success('Logged in');
        if (res.data?.data?.must_change_password) {
          toast.info('Please update your password to continue.');
          navigate('/parent/change-password');
        } else {
          navigate('/parent/portal');
        }
        return;
      }

      toast.error(res.data?.message || 'Login failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goRegister = () => navigate('/register');

  return (
    <Page>
      <Shell>
        <Left>
          <Brand>
            <BrandText>
              <h1>UBUNIFU SEC</h1>
              <p>School Management System</p>
            </BrandText>
          </Brand>

          <Tabs>
            <TabButton type="button" $active={mode === 'teacher'} onClick={() => setMode('teacher')}>
              Teacher / Staff
            </TabButton>
            <TabButton type="button" $active={mode === 'parent'} onClick={() => setMode('parent')}>
              Parent / Guardian
            </TabButton>
          </Tabs>

          <Title>Welcome Back</Title>
          <Subtitle>
            {mode === 'teacher'
              ? 'Sign in with your school email and password.'
              : 'Sign in with the Admission Number and password provided by the school.'}
          </Subtitle>

          <Form onSubmit={submit}>
            {mode === 'teacher' ? (
              <>
                <Field>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="teacher@school.com"
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </Field>
                <Field>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field>
                  <Label>Admission Number</Label>
                  <Input
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="AD/2026/00001"
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </Field>
                <Field>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </Field>
              </>
            )}

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </PrimaryButton>
          </Form>

          <FooterLinks>
            <div>
              New user? <a onClick={goRegister}>Register here</a>
            </div>
          </FooterLinks>
        </Left>

        <Right>
          <Illustration>
            <IllustrationImg src="/illustration.png" alt="" />
          </Illustration>
        </Right>
      </Shell>
    </Page>
  );
};

export default Login;
