import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { setParentToken } from '../utils/parentAuth';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  padding: 20px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
`;

const Title = styled.h1`
  margin: 0 0 6px 0;
  font-size: 1.9rem;
  color: #0f172a;
`;

const Sub = styled.p`
  margin: 0 0 18px 0;
  color: #475569;
`;

const Form = styled.form`
  display: grid;
  gap: 14px;
`;

const Label = styled.label`
  display: block;
  font-weight: 700;
  color: #0f172a;
  font-size: 0.9rem;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Hint = styled.div`
  margin-top: 14px;
  font-size: 0.9rem;
  color: #64748b;
`;

const ParentLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post('/api/parent/login', {
        admission_number: admissionNumber.trim(),
        password,
      });

      if (res.data?.success && res.data?.data?.token) {
        setParentToken(res.data.data.token);
        toast.success('Logged in');
        navigate('/parent/portal');
        return;
      }

      toast.error(res.data?.message || 'Login failed');
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        (Array.isArray(err?.errors) ? err.errors.join(', ') : null) ||
        'Login failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Card>
        <Title>Parent / Guardian Login</Title>
        <Sub>Use the Admission Number and Password provided by the school.</Sub>

        <Form onSubmit={submit}>
          <div>
            <Label>Admission Number</Label>
            <Input
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              placeholder="AD/2026/00001"
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </Form>

        <Hint>Parents do not register accounts. If you lost the password, contact the school to reset it.</Hint>
      </Card>
    </Page>
  );
};

export default ParentLogin;
