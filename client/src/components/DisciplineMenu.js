import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { FaExclamationTriangle, FaGavel, FaPlus, FaSearch, FaSyncAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  Card,
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
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

const TopBar = styled(Card)`
  padding: 14px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: ${shadows.card};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 999px;
  padding: 10px 12px;
  min-width: 240px;
  flex: 1;

  svg {
    color: rgba(15, 23, 42, 0.55);
  }

  input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    font-weight: 850;
    color: ${colors.textPrimary};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 14px;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
  }
`;

const TableCard = styled(Card)`
  padding: 14px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${shadows.card};
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;

  th,
  td {
    text-align: left;
    padding: 12px 10px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    vertical-align: top;
  }

  th {
    font-weight: 950;
    color: ${colors.textPrimary};
    background: rgba(99, 102, 241, 0.06);
  }

  td {
    color: ${colors.textSecondary};
    font-weight: 850;
  }

  tr:hover td {
    background: rgba(99, 102, 241, 0.05);
    cursor: pointer;
  }
`;

const ScrollX = styled.div`
  overflow: auto;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(15, 23, 42, 0.06);
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: ${(p) =>
    p.$tone === 'urgent'
      ? 'rgba(239, 68, 68, 0.15)'
      : p.$tone === 'high'
        ? 'rgba(250, 204, 21, 0.2)'
        : p.$tone === 'ok'
          ? 'rgba(34, 197, 94, 0.14)'
          : 'rgba(148, 163, 184, 0.18)'};
  color: ${colors.textPrimary};
`;

const FormCard = styled(Card)`
  padding: 14px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${shadows.card};
  display: grid;
  gap: 10px;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;

  label {
    font-weight: 950;
    color: ${colors.textPrimary};
    font-size: 0.92rem;
  }

  input,
  select,
  textarea {
    border: 1px solid rgba(15, 23, 42, 0.14);
    border-radius: 12px;
    padding: 10px 12px;
    outline: none;
    background: rgba(255, 255, 255, 0.95);
    color: ${colors.textPrimary};
    font-weight: 850;
  }

  textarea {
    min-height: 120px;
    resize: vertical;
  }
`;

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const DisciplineMenu = () => {
  const { api } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const [form, setForm] = useState({
    student_id: '',
    occurred_at: new Date().toISOString().slice(0, 16),
    category: 'Behavior',
    severity: 'minor',
    description: '',
    witnesses: '',
  });

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/discipline/incidents');
      setIncidents(res.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return incidents;
    return incidents.filter((i) => {
      const hay = [
        i.student_name,
        i.admission_number,
        i.class_name,
        i.category,
        i.severity,
        i.status,
        i.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [incidents, q]);

  const severityTone = (sev) => (sev === 'severe' ? 'urgent' : sev === 'moderate' ? 'high' : 'neutral');
  const statusTone = (st) => (st === 'resolved' ? 'ok' : st === 'under_review' ? 'high' : 'neutral');

  const submit = async () => {
    try {
      if (!form.student_id || !form.description.trim() || !form.category.trim()) {
        toast.warning('Student ID, category, and description are required.');
        return;
      }
      await api.post('/api/discipline/incidents', {
        student_id: Number(form.student_id),
        occurred_at: new Date(form.occurred_at),
        category: form.category,
        severity: form.severity,
        description: form.description,
        witnesses: form.witnesses || null,
      });
      toast.success('Incident recorded.');
      setForm((p) => ({ ...p, description: '', witnesses: '' }));
      await fetchIncidents();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to record incident.');
    }
  };

  return (
    <Wrapper>
      <PageHeader>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaGavel /> Discipline & Behavior
        </h1>
        <p style={{ color: colors.textSecondary, fontWeight: 800, lineHeight: 1.6 }}>
          Record incidents with clear details. Moderate/severe incidents trigger parent alerts automatically.
        </p>
      </PageHeader>

      <TopBar>
        <SearchWrap>
          <FaSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search incidents (student, class, severity, status)..." />
        </SearchWrap>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <SecondaryButton onClick={fetchIncidents} disabled={loading} style={{ borderRadius: 999 }}>
            <FaSyncAlt /> Refresh
          </SecondaryButton>
        </div>
      </TopBar>

      <Grid>
        <TableCard>
          <SectionTitle style={{ marginBottom: 12 }}>
            <FaExclamationTriangle /> Incidents ({filtered.length})
          </SectionTitle>
          <ScrollX>
            <Table>
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.slice(0, 200).map((i) => (
                    <tr key={i.id} title={i.description || ''}>
                      <td>{formatDateTime(i.occurred_at)}</td>
                      <td style={{ color: colors.textPrimary, fontWeight: 950 }}>
                        {i.student_name || '—'}
                        <div style={{ fontWeight: 850, color: colors.textSecondary, fontSize: 12 }}>
                          {i.admission_number || '—'}
                        </div>
                      </td>
                      <td>{i.class_name || '—'}</td>
                      <td>{i.category}</td>
                      <td>
                        <Badge $tone={severityTone(i.severity)}>{String(i.severity).toUpperCase()}</Badge>
                      </td>
                      <td>
                        <Badge $tone={statusTone(i.status)}>{String(i.status).toUpperCase()}</Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 22 }}>
                      No incidents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </ScrollX>
        </TableCard>

        <FormCard>
          <SectionTitle style={{ marginBottom: 0 }}>
            <FaPlus /> Record New Incident
          </SectionTitle>

          <Field>
            <label>Student ID (Database ID)</label>
            <input value={form.student_id} onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))} placeholder="e.g. 12" />
          </Field>

          <Field>
            <label>Occurred At</label>
            <input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm((p) => ({ ...p, occurred_at: e.target.value }))} />
          </Field>

          <Field>
            <label>Category</label>
            <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          </Field>

          <Field>
            <label>Severity</label>
            <select value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </Field>

          <Field>
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Write the full incident details clearly..." />
          </Field>

          <Field>
            <label>Witnesses (optional)</label>
            <input value={form.witnesses} onChange={(e) => setForm((p) => ({ ...p, witnesses: e.target.value }))} placeholder="Names or notes" />
          </Field>

          <PrimaryButton onClick={submit} style={{ borderRadius: 999, justifyContent: 'center' }}>
            <FaGavel /> Save Incident
          </PrimaryButton>
        </FormCard>
      </Grid>
    </Wrapper>
  );
};

export default DisciplineMenu;
