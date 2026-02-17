import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import {
  PageContainer,
  PageHeader,
  TabContainer as SharedTabContainer,
  Tab as SharedTab,
  Section as SharedSection,
  SectionTitle as SharedSectionTitle,
  PrimaryButton,
  SecondaryButton,
  colors,
  borderRadius
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const Container = styled(PageContainer)`
  padding: 20px;
  box-sizing: border-box;

  ${mediaQuery('tablet')} {
    padding: 15px;
  }

  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const Header = styled(PageHeader)`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
`;

const Title = styled.h1`
  color: ${colors.textPrimary};
  font-size: 2rem;
  margin: 0;
  display: flex;
  align-items: center;
  font-family: var(--font-display);

  i {
    margin-right: 15px;
    font-size: 1.8rem;
    color: #2563eb;
  }
`;

const TabContainer = styled(SharedTabContainer)`
  .tabs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    border-bottom: 2px solid ${colors.borderLight};
    padding-bottom: 10px;
  }
`;

const Tab = styled(SharedTab)``;

const Section = styled(SharedSection)``;
const SectionTitle = styled(SharedSectionTitle)``;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  margin-bottom: 8px;
  color: ${colors.textPrimary};
  font-size: 0.9rem;
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.small};
  font-size: 1rem;
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};

  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  background: ${colors.cardBackground};
`;

const TimetableTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 840px;

  th,
  td {
    padding: 12px;
    border-bottom: 1px solid ${colors.borderLight};
    text-align: left;
    vertical-align: top;
    color: ${colors.textPrimary};
  }

  th {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${colors.textSecondary};
    background: 'transparent';
  }
`;

const CellBadge = styled.div`
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  background: ${(p) =>
    p.kind === 'break'
      ? 'rgba(245, 158, 11, 0.12)'
      : p.kind === 'free'
        ? 'rgba(148, 163, 184, 0.18)'
        : 'rgba(59, 130, 246, 0.12)'};
  color: ${(p) =>
    p.kind === 'break'
      ? '#b45309'
      : p.kind === 'free'
        ? '#334155'
        : '#1d4ed8'};
`;

function groupByDayAndSlot(entries) {
  const map = new Map();
  for (const e of entries || []) {
    const day = e.day_of_week ?? 0;
    if (!map.has(day)) map.set(day, new Map());
    map.get(day).set(e.slot_key, e);
  }
  return map;
}

function buildTimetableCellText({ slotKey, cell }) {
  const kind = cell?.kind || (slotKey === 'BREAK' || slotKey === 'FOOD' ? 'break' : 'free');
  if (kind === 'break') return slotKey === 'FOOD' ? 'FOOD' : 'BREAK';
  if (kind === 'free') return '';
  const subject = cell?.subject_name || 'SUBJECT';
  const teacher = cell?.teacher_name ? `\n${cell.teacher_name}` : '';
  return `${subject}${teacher}`;
}

const Timetable = () => {
  const { api, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const [activeTab, setActiveTab] = useState('teaching');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [data, setData] = useState(null);

  const downloadPDF = useCallback(() => {
    const meta = data?.meta;
    const slots = meta?.slots || [];
    const days = meta?.days || [];
    const entries = data?.entries || [];

    if (!slots.length || !days.length) {
      toast.error('No timetable data to export yet');
      return;
    }

    const byDay = groupByDayAndSlot(entries);

    const title = activeTab === 'exam' ? 'Exam Timetable' : 'Teaching Timetable';
    const className =
      (classes || []).find((c) => String(c.id) === String(selectedClass))?.name ||
      `Class ${selectedClass || ''}`.trim();
    const year = selectedYear || 'Academic Year';

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text('Timetable', 14, 18);

    doc.setFontSize(14);
    doc.text('UBUNIFU SECONDARY SCHOOL', pageWidth - 14, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Student Management System', pageWidth - 14, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text('Name:', 14, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`${className}`, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`${title} • ${year}`, 14, 38);

    // Match the provided template: columns are days; rows are time/period.
    const head = [['Time / period', ...days.map((d) => d.label)]];
    const body = slots.map((slot) => {
      const start = slot.start_time?.slice(0, 5);
      const end = slot.end_time?.slice(0, 5);
      const range = start && end ? `${start}-${end}` : '';

      let left = slot.label || range || slot.slot_key;

      // Avoid repeating the same time twice (e.g. "08:00-09:00" on two lines).
      if (slot.slot_key === 'FOOD') {
        // Keep the time column strictly as time/period (no labels like "FOOD").
        left = range || slot.label || 'FOOD';
      } else if (range) {
        const normalizedLabel = String(slot.label || '').replace(/\s+/g, '').toLowerCase();
        const normalizedRange = range.replace(/\s+/g, '').toLowerCase();
        if (normalizedLabel && !normalizedLabel.includes(normalizedRange)) {
          left = `${range}\n${slot.label}`;
        } else {
          left = slot.label || range;
        }
      }

      return [
        left,
        ...days.map((d) => {
          const row = byDay.get(d.key) || new Map();
          return buildTimetableCellText({ slotKey: slot.slot_key, cell: row.get(slot.slot_key) });
        }),
      ];
    });

    const dayHeaderColors = [
      [147, 197, 253], // Monday - light blue
      [163, 230, 53], // Tuesday - lime
      [253, 224, 71], // Wednesday - yellow
      [253, 164, 175], // Thursday - pink
      [196, 181, 253], // Friday - purple
    ];

    autoTable(doc, {
      startY: 44,
      head,
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        valign: 'top',
        textColor: [15, 23, 42],
        lineColor: [0, 0, 0],
        lineWidth: 0.6,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.8,
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold' },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'head') {
          // Color day headers like the reference image.
          if (hookData.column.index === 0) return;
          const idx = hookData.column.index - 1;
          hookData.cell.styles.fillColor = dayHeaderColors[idx] || [229, 231, 235];
          hookData.cell.styles.textColor = [0, 0, 0];
          hookData.cell.styles.halign = 'center';
          hookData.cell.styles.valign = 'middle';
          hookData.cell.styles.fontStyle = 'bold';
          return;
        }

        if (hookData.section !== 'body') return;

        if (hookData.column.index === 0) {
          hookData.cell.styles.halign = 'center';
          hookData.cell.styles.valign = 'middle';
          return;
        }

        const raw = String(hookData.cell.raw || '');
        if (raw === 'BREAK') {
          hookData.cell.styles.fillColor = [255, 255, 255];
          hookData.cell.styles.textColor = [0, 0, 0];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.halign = 'center';
          hookData.cell.styles.valign = 'middle';
        } else if (raw === 'FOOD') {
          hookData.cell.styles.fillColor = [220, 252, 231];
          hookData.cell.styles.textColor = [0, 0, 0];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.halign = 'center';
          hookData.cell.styles.valign = 'middle';
        } else if (!raw) {
          hookData.cell.styles.fillColor = [255, 255, 255];
        } else {
          hookData.cell.styles.fillColor = [255, 255, 255];
          hookData.cell.styles.textColor = [15, 23, 42];
        }
      },
      didDrawPage: (hookData) => {
        // Outer border for a "drafted" look.
        const x = hookData.settings.margin.left;
        const y = hookData.table?.startY;
        const w = hookData.table?.width;
        const h = hookData.table?.height;
        if (y && w && h) {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1.2);
          doc.rect(x, y, w, h);
        }
      },
    });

    const filename = `timetable-${activeTab}-${String(className).replaceAll(' ', '-')}-${year}.pdf`.replaceAll(
      '/',
      '-'
    );
    doc.save(filename);
  }, [activeTab, classes, data, selectedClass, selectedYear]);

  const fetchClasses = useCallback(async () => {
    try {
      if (isTeacher) {
        const res = await api.get('/api/classes/my-classes');
        if (res.data.success) {
          setClasses(
            (res.data.data || []).map((c) => ({
              id: c.id,
              name: c.class_name || c.name,
              level: c.level,
              academic_year: c.academic_year
            }))
          );
        }
        return;
      }

      if (isAdmin) {
        const res = await api.get('/api/classes');
        if (res.data.success) setClasses(res.data.data || []);
      }
    } catch (e) {
      console.error('Error fetching classes:', e);
      toast.error('Failed to load classes');
    }
  }, [api, isAdmin, isTeacher]);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await api.get('/api/students/academic-years');
      if (res.data.success) {
        setAcademicYears(res.data.data || []);
        const current = (res.data.data || []).find((y) => y.is_current);
        if (current?.year_name && !selectedYear) setSelectedYear(current.year_name);
      }
    } catch (e) {
      console.error('Error fetching academic years:', e);
    }
  }, [api, selectedYear]);

  const fetchTimetable = useCallback(async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('class_id', selectedClass);
      if (selectedYear) params.set('academic_year', selectedYear);

      const endpoint = activeTab === 'exam' ? '/api/timetables/exam' : '/api/timetables/teaching';
      const res = await api.get(`${endpoint}?${params.toString()}`);
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error('Error fetching timetable:', e);
      toast.error(e.response?.data?.message || 'Failed to load timetable');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, api, selectedClass, selectedYear]);

  const generateTimetable = useCallback(async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const endpoint =
        activeTab === 'exam' ? '/api/timetables/exam/generate' : '/api/timetables/teaching/generate';
      const res = await api.post(endpoint, { class_id: Number(selectedClass), academic_year: selectedYear });
      if (res.data.success) {
        toast.success(res.data.message || 'Generated');
        await fetchTimetable();
      }
    } catch (e) {
      console.error('Error generating timetable:', e);
      toast.error(e.response?.data?.message || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  }, [activeTab, api, fetchTimetable, selectedClass, selectedYear]);

  useEffect(() => {
    fetchClasses();
    fetchAcademicYears();
  }, [fetchAcademicYears, fetchClasses]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(String(classes[0].id));
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const meta = data?.meta;
  const slots = meta?.slots || [];
  const days = meta?.days || [];

  const byDay = useMemo(() => groupByDayAndSlot(data?.entries || []), [data?.entries]);

  return (
    <Container>
      <Header>
        <Title>
          <i className="fas fa-calendar-alt" />
          Timetable
        </Title>
      </Header>

      <TabContainer>
        <div className="tabs">
          <Tab $active={activeTab === 'teaching'} onClick={() => setActiveTab('teaching')}>
            Teaching Timetable
          </Tab>
          <Tab $active={activeTab === 'exam'} onClick={() => setActiveTab('exam')}>
            Exam Timetable
          </Tab>
        </div>
      </TabContainer>

      <Section>
        <SectionTitle>Filters</SectionTitle>

        <FormRow>
          <FormGroup>
            <Label>Class</Label>
            <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.class_name || `Class ${c.id}`}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Academic Year</Label>
            <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {(academicYears || []).map((y) => (
                <option key={y.year_name} value={y.year_name}>
                  {y.year_name} {y.is_current ? '(Current)' : ''}
                </option>
              ))}
              {academicYears.length === 0 && (
                <option value={selectedYear || ''}>{selectedYear || '2024-2025'}</option>
              )}
            </Select>
          </FormGroup>
          <FormGroup style={{ alignSelf: 'flex-end' }}>
            <SecondaryButton type="button" onClick={fetchTimetable} disabled={loading || !selectedClass}>
              Refresh
            </SecondaryButton>
          </FormGroup>
          <FormGroup style={{ alignSelf: 'flex-end' }}>
            <SecondaryButton
              type="button"
              onClick={downloadPDF}
              disabled={loading || !selectedClass || !(data?.meta?.slots || []).length}
              title="Download as PDF"
            >
              Download PDF
            </SecondaryButton>
          </FormGroup>
          <FormGroup style={{ alignSelf: 'flex-end' }}>
            {(isAdmin || false) && (
              <PrimaryButton type="button" onClick={generateTimetable} disabled={loading || !selectedClass}>
                {loading ? 'Generating...' : 'Generate'}
              </PrimaryButton>
            )}
          </FormGroup>
        </FormRow>

        {!isAdmin && (isTeacher ? (
          <div style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10 }}>
            Ask Admin to generate timetables if you don’t see one yet.
          </div>
        ) : null)}

        {loading ? (
          <div style={{ color: colors.textSecondary }}>Loading...</div>
        ) : (
          <TableWrap>
            <TimetableTable>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Day</th>
                  {slots.map((s) => (
                    <th key={s.slot_key}>
                      {s.label}
                      <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'none' }}>
                        {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const row = byDay.get(d.key) || new Map();
                  return (
                    <tr key={d.key}>
                      <td style={{ fontWeight: 700 }}>{d.label}</td>
                      {slots.map((s) => {
                        const cell = row.get(s.slot_key);
                        const kind =
                          cell?.kind ||
                          (s.slot_key === 'BREAK' || s.slot_key === 'FOOD' ? 'break' : 'free');
                        const title =
                          kind === 'break'
                            ? s.slot_key === 'FOOD'
                              ? 'FOOD'
                              : 'BREAK'
                            : kind === 'free'
                              ? 'FREE'
                              : cell?.subject_name || 'SUBJECT';
                        const sub =
                          kind === 'subject' && cell?.teacher_name ? `Teacher: ${cell.teacher_name}` : '';
                        return (
                          <td key={`${d.key}-${s.slot_key}`}>
                            <CellBadge kind={kind}>{title}</CellBadge>
                            {sub && (
                              <div style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary }}>
                                {sub}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {days.length === 0 && (
                  <tr>
                    <td colSpan={1 + slots.length} style={{ padding: 14, color: colors.textSecondary }}>
                      No timetable meta available.
                    </td>
                  </tr>
                )}
              </tbody>
            </TimetableTable>
          </TableWrap>
        )}
      </Section>
    </Container>
  );
};

export default Timetable;
