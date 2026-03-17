import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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

const TEMPLATE_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TEMPLATE_MIN_ROWS = 14;

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
  border: 1px solid #d1d5db;
  border-radius: ${borderRadius.small};
  background: #f3f4f6;
  padding: 12px;
`;

const TemplateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  gap: 12px;
`;

const TemplateTitle = styled.h2`
  margin: 0;
  color: #111827;
  font-size: 2rem;
  font-weight: 800;
`;

const NameLine = styled.div`
  margin-top: 4px;
  font-size: 1rem;
  color: #111827;
  font-weight: 700;
`;

const TimetableTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
  border: 2px solid #111827;
  table-layout: fixed;

  th,
  td {
    padding: 10px 8px;
    border: 1px solid #374151;
    text-align: center;
    vertical-align: middle;
    color: ${colors.textPrimary};
    white-space: pre-line;
    word-break: break-word;
  }

  th {
    font-size: 1.05rem;
    text-transform: none;
    letter-spacing: normal;
    color: #111827;
    font-weight: 800;
  }

  tbody td {
    min-height: 48px;
    height: 48px;
    font-size: 0.86rem;
  }

  th:first-child,
  td:first-child {
    width: 170px;
    border-right: 3px solid #111827;
    font-weight: 700;
    background: #ffffff;
  }

  thead th {
    border-bottom: 2px solid #111827;
  }
`;

const dayHeaderColors = [
  { web: '#93c5fd', pdf: [147, 197, 253] }, // Monday
  { web: '#a3e635', pdf: [163, 230, 53] }, // Tuesday
  { web: '#fde047', pdf: [253, 224, 71] }, // Wednesday
  { web: '#fda4af', pdf: [253, 164, 175] }, // Thursday
  { web: '#c4b5fd', pdf: [196, 181, 253] }, // Friday
];

function groupByDayAndSlot(entries) {
  const map = new Map();
  for (const e of entries || []) {
    const day = Number(e.day_of_week);
    const dayIndex = Number.isFinite(day) ? (day >= 1 && day <= 5 ? day - 1 : day >= 0 && day <= 4 ? day : null) : null;
    if (dayIndex === null) continue;
    if (!map.has(dayIndex)) map.set(dayIndex, new Map());
    map.get(dayIndex).set(e.slot_key, e);
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

function buildTimePeriodLabel(slot) {
  const start = slot.start_time?.slice(0, 5);
  const end = slot.end_time?.slice(0, 5);
  const range = start && end ? `${start}-${end}` : '';

  let left = slot.label || range || slot.slot_key;

  if (slot.slot_key === 'FOOD') {
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

  return left;
}

function getDayIndexFromMetaDay(day) {
  const label = String(day?.label || '').trim().toLowerCase();
  const labelIndex = TEMPLATE_WEEKDAYS.findIndex((d) => d.toLowerCase() === label);
  if (labelIndex !== -1) return labelIndex;

  const key = Number(day?.key);
  if (Number.isFinite(key)) {
    if (key >= 1 && key <= 5) return key - 1;
    if (key >= 0 && key <= 4) return key;
  }
  return null;
}

function normalizeTemplateDays(days) {
  const normalized = TEMPLATE_WEEKDAYS.map((label, index) => ({ key: index, label, index }));
  for (const day of days || []) {
    const index = getDayIndexFromMetaDay(day);
    if (index === null) continue;
    normalized[index] = {
      ...day,
      key: index,
      label: TEMPLATE_WEEKDAYS[index],
      index,
    };
  }
  return normalized;
}

const Timetable = () => {
  const { classId: routeClassId } = useParams();
  const { api, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const [activeTab, setActiveTab] = useState('teaching');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState(routeClassId ? String(routeClassId) : '');
  const [selectedYear, setSelectedYear] = useState('');
  const [data, setData] = useState(null);

  const downloadPDF = useCallback(() => {
    const meta = data?.meta;
    const slots = meta?.slots || [];
    const days = normalizeTemplateDays(meta?.days || []);
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text('Timetable', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text('Name:', 14, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`${className}`, 30, 30);

    // Match the provided template: columns are days; rows are time/period.
    const head = [['Time / period', ...days.map((d) => d.label)]];
    const slotRows = slots.map((slot) => ({
      slotKey: slot.slot_key,
      left: buildTimePeriodLabel(slot),
    }));
    const emptyRows = Array.from({ length: Math.max(0, TEMPLATE_MIN_ROWS - slotRows.length) }, (_, idx) => ({
      slotKey: `__blank-${idx}`,
      left: '',
    }));
    const rows = [...slotRows, ...emptyRows];

    const body = rows.map((row) => {
      return [
        row.left,
        ...days.map((d) => {
          if (String(row.slotKey).startsWith('__blank-')) return '';
          const dayRow = byDay.get(d.index) || new Map();
          return buildTimetableCellText({ slotKey: row.slotKey, cell: dayRow.get(row.slotKey) });
        }),
      ];
    });

    autoTable(doc, {
      startY: 36,
      head,
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        valign: 'middle',
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
          hookData.cell.styles.fillColor = dayHeaderColors[idx]?.pdf || [229, 231, 235];
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

        hookData.cell.styles.fillColor = [255, 255, 255];
        hookData.cell.styles.textColor = [15, 23, 42];
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

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated timetable • ${title} • ${year}`, 14, 204);

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
    if (routeClassId) {
      setSelectedClass(String(routeClassId));
      return;
    }
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(String(classes[0].id));
    }
  }, [classes, routeClassId, selectedClass]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const meta = data?.meta;
  const slots = useMemo(() => meta?.slots || [], [meta?.slots]);
  const days = useMemo(() => normalizeTemplateDays(meta?.days || []), [meta?.days]);
  const className =
    (classes || []).find((c) => String(c.id) === String(selectedClass))?.name ||
    `Class ${selectedClass || ''}`.trim();

  const byDay = useMemo(() => groupByDayAndSlot(data?.entries || []), [data?.entries]);
  const visibleRows = useMemo(() => {
    const base = slots.map((slot) => ({ slotKey: slot.slot_key, left: buildTimePeriodLabel(slot) }));
    const blanks = Array.from({ length: Math.max(0, TEMPLATE_MIN_ROWS - base.length) }, (_, idx) => ({
      slotKey: `__blank-${idx}`,
      left: '',
    }));
    return [...base, ...blanks];
  }, [slots]);

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
            <TemplateHeader>
              <div>
                <TemplateTitle>Timetable</TemplateTitle>
                <NameLine>Name: {className}</NameLine>
              </div>
            </TemplateHeader>
            <TimetableTable>
              <thead>
                <tr>
                  <th>Time / period</th>
                  {days.map((d, index) => (
                    <th key={d.key} style={{ background: dayHeaderColors[index]?.web || '#e5e7eb' }}>
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((rowDef) => {
                  return (
                    <tr key={rowDef.slotKey}>
                      <td>{rowDef.left}</td>
                      {days.map((d) => {
                        if (String(rowDef.slotKey).startsWith('__blank-')) {
                          return (
                            <td key={`${rowDef.slotKey}-${d.key}`} />
                          );
                        }
                        const dayRow = byDay.get(d.index) || new Map();
                        const cell = dayRow.get(rowDef.slotKey);
                        const title = buildTimetableCellText({ slotKey: rowDef.slotKey, cell });
                        return (
                          <td key={`${rowDef.slotKey}-${d.key}`}>{title}</td>
                        );
                      })}
                    </tr>
                  );
                })}
                {(days.length === 0 || visibleRows.length === 0) && (
                  <tr>
                    <td colSpan={1 + Math.max(days.length, 1)} style={{ padding: 14, color: colors.textSecondary }}>
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
