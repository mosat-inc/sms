import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaIdCard, FaSchool, FaUserGraduate, FaKey } from 'react-icons/fa';
import { toast } from 'react-toastify';
import parentApi from '../services/parentHttp';
import { getParentMustChangePassword } from '../utils/parentAuth';

const Wrap = styled.div`
  display: grid;
  gap: 16px;
`;

const Hero = styled.div`
  border-radius: 24px;
  padding: 18px 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.14) 0%, rgba(124, 58, 237, 0.12) 50%, rgba(219, 39, 119, 0.10) 100%);
`;

const HeroTitle = styled.div`
  font-size: 1.3rem;
  font-weight: 900;
  color: #0f172a;
`;

const HeroSub = styled.div`
  margin-top: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.74);
  line-height: 1.5;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 14px;
`;

const Card = styled.div`
  grid-column: span 12;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  overflow: hidden;

  @media (min-width: 900px) {
    grid-column: span 6;
  }
`;

const CardHeader = styled.div`
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const CardTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
  color: #0f172a;
`;

const CardBody = styled.div`
  padding: 14px 16px 16px;
  display: grid;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`;

const Label = styled.div`
  font-size: 0.85rem;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.65);
`;

const Value = styled.div`
  font-size: 0.95rem;
  font-weight: 900;
  color: #0f172a;
  text-align: right;
`;

const Button = styled.button`
  border: none;
  cursor: pointer;
  border-radius: 16px;
  padding: 12px 14px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);
  box-shadow: 0 18px 55px rgba(99, 102, 241, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 80px rgba(99, 102, 241, 0.28);
  }
`;

const ParentProfile = () => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);

  const mustChange = getParentMustChangePassword();

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await parentApi.get('/api/parent/student');
        setStudent(res.data?.data || null);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load profile');
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return (
      <Wrap>
        <Hero>
          <HeroTitle>Parent Profile</HeroTitle>
          <HeroSub>Loading your profile…</HeroSub>
        </Hero>
      </Wrap>
    );
  }

  if (!student) {
    return (
      <Wrap>
        <Hero>
          <HeroTitle>Parent Profile</HeroTitle>
          <HeroSub>We could not load your profile details right now. Please refresh and try again.</HeroSub>
        </Hero>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Hero>
        <HeroTitle>Parent Profile</HeroTitle>
        <HeroSub>
          You are viewing information for <strong>{student.first_name} {student.last_name}</strong>.{' '}
          {mustChange ? 'Please update your password for security.' : 'Your account is active.'}
        </HeroSub>
      </Hero>

      <Grid>
        <Card>
          <CardHeader>
            <CardTitle>
              <FaUserGraduate />
              Student Details
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Label>Student Name</Label>
              <Value>{student.first_name} {student.last_name}</Value>
            </Row>
            <Row>
              <Label>Admission No</Label>
              <Value>{student.admission_number}</Value>
            </Row>
            <Row>
              <Label>Student ID</Label>
              <Value>{student.student_id}</Value>
            </Row>
            <Row>
              <Label>Status</Label>
              <Value>{student.status}</Value>
            </Row>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <FaSchool />
              Class & School
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Label>Class</Label>
              <Value>{student.class_name || '—'}</Value>
            </Row>
            <Row>
              <Label>Level</Label>
              <Value>{student.class_level || '—'}</Value>
            </Row>
            <Row>
              <Label>Gender</Label>
              <Value>{student.gender || '—'}</Value>
            </Row>
            <Row>
              <Label>Date of Birth</Label>
              <Value>{student.date_of_birth ? String(student.date_of_birth).slice(0, 10) : '—'}</Value>
            </Row>
          </CardBody>
        </Card>

        <Card style={{ gridColumn: 'span 12' }}>
          <CardHeader>
            <CardTitle>
              <FaIdCard />
              Security
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Label>Password</Label>
              <Value>{mustChange ? 'Update required' : 'Up to date'}</Value>
            </Row>
            <Button
              type="button"
              onClick={() => {
                window.location.href = '/parent/change-password';
              }}
            >
              <FaKey style={{ marginRight: 10 }} />
              Change Password
            </Button>
          </CardBody>
        </Card>
      </Grid>
    </Wrap>
  );
};

export default ParentProfile;

