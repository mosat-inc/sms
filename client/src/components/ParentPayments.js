import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaFilter,
  FaInfoCircle,
  FaMoneyBillWave,
  FaSyncAlt,
  FaSpinner,
  FaReceipt,
  FaRegCommentDots,
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import parentApi from '../services/parentHttp';

const Money = (value) =>
  new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const categoryLabel = (cat) =>
  ({
    food: 'Food',
    guards: 'School Guards',
    emergency: 'Emergency',
    graduation: 'Graduation',
    sports_trips: 'Sports / Trips',
    fare: 'Fare',
    condolence: 'Condolence',
  }[cat] || cat);

const parseDateSafe = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatISODate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const normalizePaymentStatus = (raw) => {
  const status = String(raw || '').toLowerCase();
  if (!status) return 'pending';
  if (['paid', 'success', 'completed'].some((s) => status.includes(s))) return 'paid';
  if (['partial'].some((s) => status.includes(s))) return 'partial';
  if (['cancel', 'failed', 'declined', 'error'].some((s) => status.includes(s))) return 'failed';
  if (['overdue'].some((s) => status.includes(s))) return 'overdue';
  return 'pending';
};

const badgeStyle = (status) => {
  const s = normalizePaymentStatus(status);
  if (s === 'paid') return 'bg-emerald-500/15 text-emerald-800 border-emerald-500/20';
  if (s === 'partial') return 'bg-amber-500/15 text-amber-800 border-amber-500/20';
  if (s === 'overdue') return 'bg-rose-500/15 text-rose-800 border-rose-500/20';
  if (s === 'failed') return 'bg-slate-900/5 text-slate-700 border-slate-900/10';
  return 'bg-indigo-500/10 text-indigo-800 border-indigo-500/20';
};

const Badge = ({ status, label }) => (
  <span
    className={[
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold tracking-wide',
      badgeStyle(status),
    ].join(' ')}
  >
    {normalizePaymentStatus(status) === 'paid' ? <FaCheckCircle className="text-[11px]" /> : null}
    {normalizePaymentStatus(status) === 'partial' ? <FaClock className="text-[11px]" /> : null}
    {normalizePaymentStatus(status) === 'overdue' ? <FaExclamationTriangle className="text-[11px]" /> : null}
    {label || String(status || 'Pending')}
  </span>
);

const GlassCard = ({ className = '', children }) => (
  <div
    className={[
      'rounded-2xl border border-slate-900/10 bg-white/85 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-md',
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

const SkeletonCard = () => (
  <div className="h-28 rounded-2xl border border-slate-900/10 bg-white/60 backdrop-blur-md">
    <div className="h-full w-full animate-pulse rounded-2xl bg-gradient-to-br from-slate-200/70 to-slate-100/30" />
  </div>
);

const PrimaryPayButton = ({ loading, disabled, children, className = '', ...props }) => {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={[
          'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-200 px-7 py-3.5 text-sm font-black text-slate-500 shadow-sm',
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? <FaSpinner className="animate-spin text-[13px]" /> : null}
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={[
        'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-black text-white transition',
        'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-[0_18px_55px_rgba(99,102,241,0.24)]',
        'hover:-translate-y-0.5 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 hover:shadow-[0_24px_80px_rgba(99,102,241,0.30)]',
        'active:translate-y-0 active:shadow-[0_16px_55px_rgba(99,102,241,0.22)]',
        'focus:outline-none focus:ring-4 focus:ring-violet-500/25',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? <FaSpinner className="animate-spin text-[13px]" /> : null}
      {children}
    </button>
  );
};

const SoftActionButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={[
      'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-slate-900/15 bg-white px-7 py-3.5 text-sm font-black text-slate-900 shadow-sm transition',
      'hover:-translate-y-0.5 hover:border-slate-900/20 hover:bg-slate-50 hover:shadow-md',
      'focus:outline-none focus:ring-4 focus:ring-violet-500/15',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </button>
);

const DarkActionButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={[
      'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-black text-white shadow-sm transition',
      'bg-slate-900 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md',
      'focus:outline-none focus:ring-4 focus:ring-slate-900/20',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </button>
);

const ParentPayments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [payingKey, setPayingKey] = useState(null);
  const [payDialog, setPayDialog] = useState(null);
  const [payCooldownUntil, setPayCooldownUntil] = useState(0);

  const [filters, setFilters] = useState({
    term: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await parentApi.get('/api/parent/payments');
      setData(res.data?.data || null);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to load payments';
      setError(msg);
      setData(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const onFocus = () => fetchPayments();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(fetchPayments, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paying = Boolean(payingKey);

  const pay = async ({ purpose, amount, category, key }) => {
    try {
      if (payingKey) {
        toast.info('Please wait… finishing the current payment redirect.');
        return;
      }
      if (Date.now() < payCooldownUntil) {
        const secs = Math.max(1, Math.ceil((payCooldownUntil - Date.now()) / 1000));
        toast.info(`Payment service is busy. Try again in ${secs}s.`);
        return;
      }
      if (!amount || Number(amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      setPayingKey(key || `${purpose}:${category || 'all'}`);
      const res = await parentApi.post('/api/parent/payments/pesapal/initiate', {
        purpose,
        amount: Number(amount),
        category: category || null,
        currency: 'TZS',
      });
      const redirectUrl = res.data?.data?.redirect_url;
      if (!redirectUrl) {
        toast.error('Payment gateway did not return a redirect URL');
        return;
      }
      setPayDialog(null);
      window.location.href = redirectUrl;
    } catch (e) {
      const payload = e.response?.data || null;
      const retryAfterHeader = e.response?.headers?.['retry-after'];
      const retryAfterSeconds =
        Number(payload?.details?.retry_after_seconds) ||
        (retryAfterHeader ? Number(retryAfterHeader) : 0) ||
        0;
      // eslint-disable-next-line no-console
      console.error('Payment initiate error:', payload ? JSON.stringify(payload, null, 2) : e);
      const derivedCode = payload?.details?.derived_code || payload?.details?.error?.code || payload?.details?.code || '';
      const context = payload?.details?.context || '';
      if (derivedCode === 'amount_exceeds_default_limit') {
        const msg = 'Payment amount exceeds the gateway limit. Please pay in smaller parts.';
        toast.error(msg);
        setPayDialog((s) => (s ? { ...s, error: msg } : s));
        return;
      }
      if (payload?.details?.code === 'ETIMEDOUT' || derivedCode === 'PESAPAL_UNAVAILABLE' || e.response?.status === 503) {
        const msg =
          context === 'requestToken'
            ? 'Payment gateway is currently unreachable (network timeout). Please check your internet connection and try again shortly.'
            : 'Payment service is temporarily unavailable. Please try again shortly.';
        toast.error(msg);
        const waitMs = Math.max(10_000, (retryAfterSeconds || 30) * 1000);
        const waitSecs = Math.max(1, Math.ceil(waitMs / 1000));
        const fullMsg = `${msg} (Try again in ${waitSecs}s)`;
        setPayDialog((s) => (s ? { ...s, error: fullMsg } : s));
        setPayCooldownUntil(Date.now() + waitMs);
        return;
      }
      const msg = payload?.message || 'Failed to start payment';
      toast.error(msg);
      setPayDialog((s) => (s ? { ...s, error: msg } : s));
      if ((payload?.details?.status == null && payload?.details?.code) || e.response?.status === 503) {
        const waitMs = Math.max(10_000, (retryAfterSeconds || 20) * 1000);
        setPayCooldownUntil(Date.now() + waitMs);
      }
    } finally {
      setPayingKey(null);
    }
  };

  const openPayDialog = ({ title, purpose, category, maxAmount, key }) => {
    const max = Math.max(0, Number(maxAmount || 0));
    const suggested = Math.min(max || 0, 20000);
    setPayDialog({
      title,
      purpose,
      category: category || null,
      key: key || `${purpose}:${category || 'all'}`,
      maxAmount: max,
      amount: String(suggested > 0 ? suggested : max || ''),
      error: '',
    });
  };

  const derived = useMemo(() => {
    if (!data) return null;

    const student = data.student || {};
    const academicYear = data.academic_year || {};
    const combined = data.combined_summary || {};
    const fees = data.fees || {};
    const contributions = data.contributions || [];
    const pending = data.pending_payments || [];

    const total = Number(combined.total_required ?? 0);
    const paid = Number(combined.total_paid ?? 0);
    const balance = Number(combined.outstanding_total ?? 0);

    const dueDate = academicYear.end_date ? parseDateSafe(academicYear.end_date) : null;
    const now = new Date();
    const isOverdue = Boolean(balance > 0 && dueDate && dueDate.getTime() < now.getTime());
    const status = balance <= 0 ? 'paid' : isOverdue || academicYear.deadline_soon ? 'overdue' : paid > 0 ? 'partial' : 'pending';

    const feeItem = {
      name: 'School Fee',
      amount: Number(fees.total_required ?? 75000),
      paid: Number(fees.total_paid ?? 0),
      balance: Number(
        fees.outstanding_balance ??
          Math.max(0, Number(fees.total_required ?? 75000) - Number(fees.total_paid ?? 0))
      ),
      status: fees.status || (Number(fees.outstanding_balance || 0) <= 0 ? 'paid' : Number(fees.total_paid || 0) > 0 ? 'partial' : 'pending'),
      kind: 'fee',
      category: null,
    };

    const contributionItems = contributions.map((c) => ({
      name: categoryLabel(c.category),
      amount: Number(c.required_amount ?? 20000),
      paid: Number(c.paid_amount ?? 0),
      balance: Number(c.outstanding_amount ?? 0),
      status:
        c.status || (Number(c.outstanding_amount || 0) <= 0 ? 'paid' : Number(c.paid_amount || 0) > 0 ? 'partial' : 'pending'),
      kind: 'contribution',
      category: c.category,
    }));

    const feeHistory = (fees.payments || []).map((p) => ({
      id: `fee_${p.id}`,
      date: p.payment_date,
      receiptNo: p.receipt_number || '',
      method: p.payment_method || '—',
      amount: Number(p.amount || 0),
      status: p.status || 'Pending',
      reference: p.reference_number || p.receipt_number || p.id || '',
      term: p.term || '—',
    }));

    const pendingHistory = pending.map((p) => ({
      id: `intent_${p.id}`,
      date: p.created_at,
      receiptNo: '',
      method: 'Pesapal',
      amount: Number(p.amount || 0),
      status: p.status || 'Pending',
      reference: p.order_tracking_id || p.merchant_reference || '',
      term: '—',
    }));

    const paymentHistory = [...pendingHistory, ...feeHistory].sort((a, b) => {
      const da = parseDateSafe(a.date)?.getTime() || 0;
      const db = parseDateSafe(b.date)?.getTime() || 0;
      return db - da;
    });

    const terms = Array.from(new Set(feeHistory.map((p) => p.term).filter((t) => t && t !== '—'))).sort();

    return {
      student: {
        name: student.name || [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || 'Student',
        admissionNo: student.admission_number || student.admissionNo || '—',
        className: [student.class_level, student.class_name].filter(Boolean).join(' ').trim() || student.class_name || '—',
      },
      termSummary: {
        total,
        paid,
        balance,
        dueDate: academicYear.end_date || null,
        status,
        yearName: academicYear.year_name || '—',
        deadlineSoon: Boolean(academicYear.deadline_soon),
        paymentStartSoon: Boolean(academicYear.payment_start_soon),
      },
      feeItems: [feeItem, ...contributionItems],
      paymentHistory,
      terms,
      actions: {
        canPayOnline: true,
        receiptDownloadUrl: '',
        statementDownloadUrl: '',
      },
    };
  }, [data]);

  const filteredHistory = useMemo(() => {
    if (!derived) return [];
    const start = filters.startDate ? parseDateSafe(filters.startDate) : null;
    const end = filters.endDate ? parseDateSafe(filters.endDate) : null;

    return derived.paymentHistory.filter((p) => {
      const status = normalizePaymentStatus(p.status);
      if (filters.status !== 'all' && status !== filters.status) return false;
      if (filters.term !== 'all' && String(p.term || '—') !== filters.term) return false;

      const d = parseDateSafe(p.date);
      if (!d) return true;
      if (start && d.getTime() < start.getTime()) return false;
      if (end) {
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        if (d.getTime() > endInclusive.getTime()) return false;
      }
      return true;
    });
  }, [derived, filters]);

  const urgentMessage = useMemo(() => {
    if (!derived) return null;
    if (derived.termSummary.balance <= 0) return { tone: 'success', text: 'All payments are cleared. Congratulations!' };
    if (derived.termSummary.deadlineSoon || normalizePaymentStatus(derived.termSummary.status) === 'overdue') {
      return { tone: 'warn', text: 'Payment deadline is near. Please clear the remaining balance on time.' };
    }
    if (derived.termSummary.paymentStartSoon) {
      return { tone: 'info', text: 'Payment period starts soon. You can plan early to avoid last-minute stress.' };
    }
    return { tone: 'info', text: 'Track fee status and payments here. Online payments update automatically once confirmed.' };
  }, [derived]);

  const exportStatementPdf = () => {
    if (!derived) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Payment Statement', 40, 50);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const lines = [
      `Student: ${derived.student.name}`,
      `Admission No: ${derived.student.admissionNo}`,
      `Class: ${derived.student.className}`,
      `Academic Year: ${derived.termSummary.yearName}`,
      `Total: ${Money(derived.termSummary.total)}   Paid: ${Money(derived.termSummary.paid)}   Balance: ${Money(
        derived.termSummary.balance
      )}`,
    ];
    lines.forEach((t, idx) => doc.text(t, 40, 78 + idx * 16));

    const rows = filteredHistory.map((p) => [
      formatISODate(p.date) || String(p.date || '—'),
      p.term || '—',
      String(p.method || '—'),
      Money(p.amount),
      String(p.status || '—'),
      String(p.reference || '—'),
    ]);

    autoTable(doc, {
      startY: 170,
      head: [['Date', 'Term', 'Method', 'Amount', 'Status', 'Reference']],
      body: rows.length ? rows : [['—', '—', '—', '—', '—', '—']],
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 247, 251] },
      margin: { left: 40, right: 40 },
    });

    doc.save(`statement_${derived.student.admissionNo || 'student'}.pdf`);
  };

  const exportReceiptPdf = (payment) => {
    if (!derived || !payment) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Payment Receipt', 40, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const details = [
      `Student: ${derived.student.name}`,
      `Admission No: ${derived.student.admissionNo}`,
      `Class: ${derived.student.className}`,
      `Date: ${formatISODate(payment.date) || String(payment.date || '—')}`,
      `Amount: ${Money(payment.amount)}`,
      `Method: ${payment.method || '—'}`,
      `Status: ${payment.status || '—'}`,
      `Reference: ${payment.reference || '—'}`,
      payment.receiptNo ? `Receipt No: ${payment.receiptNo}` : null,
    ].filter(Boolean);
    details.forEach((t, i) => doc.text(String(t), 40, 85 + i * 16));

    doc.save(`receipt_${payment.receiptNo || payment.reference || derived.student.admissionNo || 'payment'}.pdf`);
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-[1px]">
          <div className="rounded-3xl bg-white/88 p-5 backdrop-blur-md">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 animate-pulse rounded bg-slate-200/70" />
                <div className="h-4 w-72 animate-pulse rounded bg-slate-200/60" />
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-44 animate-pulse rounded-full bg-slate-200/70" />
                <div className="h-10 w-44 animate-pulse rounded-full bg-slate-200/60" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <GlassCard className="p-5">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200/60" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200/50" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200/50" />
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!derived) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Payments</div>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              {error || 'Unable to load payment information right now.'}
            </div>
          </div>
          <SoftActionButton onClick={fetchPayments} className="min-h-[44px] px-5 py-2 text-sm">
            Retry
          </SoftActionButton>
        </div>
      </GlassCard>
    );
  }

  const { student, termSummary, feeItems, actions } = derived;
  const canPayOnline = Boolean(actions.canPayOnline);

  return (
    <div className="grid gap-4">
      {payDialog ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-[1px]">
              <div className="bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-700">Pay Online</div>
                    <div className="mt-1 text-xl font-black tracking-tight text-slate-900">{payDialog.title}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">
                      Student: <span className="font-black text-slate-900">{student.name}</span> • Admission No:{' '}
                      <span className="font-black text-slate-900">{student.admissionNo}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayDialog(null)}
                    className="rounded-2xl border border-slate-900/10 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-slate-900/10 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-extrabold text-slate-700">Outstanding balance</div>
                  <div className="text-lg font-black text-slate-900">{Money(payDialog.maxAmount)}</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-600">
                  If the gateway rejects a large amount, pay in smaller parts until the balance is cleared.
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Amount to pay (TZS)</label>
                <input
                  inputMode="numeric"
                  value={payDialog.amount}
                  onChange={(e) => setPayDialog((s) => ({ ...s, amount: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-900/15 bg-white px-4 py-3 text-base font-black text-slate-900 shadow-sm outline-none transition focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/15"
                  placeholder="Enter amount"
                  disabled={Boolean(payingKey)}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {[5000, 10000, 15000, 20000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPayDialog((s) => ({ ...s, amount: String(Math.min(s.maxAmount, v)) }))}
                      className="rounded-2xl border border-slate-900/10 bg-white px-4 py-2 text-xs font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-900/15 hover:bg-slate-50 hover:shadow-md"
                      disabled={v > payDialog.maxAmount || Boolean(payingKey)}
                    >
                      {Money(v)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPayDialog((s) => ({ ...s, amount: String(s.maxAmount) }))}
                    className="rounded-2xl border border-slate-900/10 bg-white px-4 py-2 text-xs font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-900/15 hover:bg-slate-50 hover:shadow-md"
                    disabled={Boolean(payingKey)}
                  >
                    Max
                  </button>
                </div>
              </div>

              {payDialog.error ? (
                <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-bold text-rose-900">
                  {payDialog.error}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <SoftActionButton onClick={() => setPayDialog(null)} className="w-full sm:w-auto">
                  Cancel
                </SoftActionButton>
                <PrimaryPayButton
                  disabled={
                    !canPayOnline ||
                    Boolean(payingKey) ||
                    Date.now() < payCooldownUntil ||
                    !Number(payDialog.amount || 0) ||
                    Number(payDialog.amount || 0) <= 0 ||
                    Number(payDialog.amount || 0) > payDialog.maxAmount
                  }
                  loading={payingKey === payDialog.key}
                  onClick={() =>
                    pay({
                      purpose: payDialog.purpose,
                      amount: Number(payDialog.amount || 0),
                      category: payDialog.category,
                      key: payDialog.key,
                    })
                  }
                  className="w-full sm:w-auto"
                >
                  {Date.now() < payCooldownUntil
                    ? `Try again in ${Math.max(1, Math.ceil((payCooldownUntil - Date.now()) / 1000))}s`
                    : payingKey === payDialog.key
                      ? 'Redirecting…'
                      : 'Continue to Payment'}
                </PrimaryPayButton>
              </div>

              {Number(payDialog.amount || 0) > payDialog.maxAmount ? (
                <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-bold text-rose-900">
                  Amount cannot exceed the outstanding balance.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-[1px]">
        <div className="rounded-3xl bg-white/88 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900/80">
                <FaFileInvoiceDollar />
                Parent Portal • Payments
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">Payments</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                Student: <span className="font-extrabold text-slate-900">{student.name}</span> • Admission No:{' '}
                <span className="font-extrabold text-slate-900">{student.admissionNo}</span> • Class:{' '}
                <span className="font-extrabold text-slate-900">{student.className}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
              <SoftActionButton onClick={() => fetchPayments()}>
                <FaSyncAlt className="text-[12px] opacity-70" />
                Refresh
              </SoftActionButton>
              <DarkActionButton onClick={exportStatementPdf}>
                <FaDownload className="text-[12px]" />
                Download Statement (PDF)
              </DarkActionButton>
              <SoftActionButton
                onClick={() =>
                  toast.info('A message feature can be connected here (accountant/school). For now, please contact the school.')
                }
              >
                <FaRegCommentDots className="text-[12px]" />
                Request Clarification
              </SoftActionButton>
              <PrimaryPayButton
                disabled={!canPayOnline || termSummary.balance <= 0 || Boolean(payingKey) || Date.now() < payCooldownUntil}
                loading={payingKey === 'pay_all'}
                onClick={() =>
                  openPayDialog({
                    title: 'Pay total outstanding balance',
                    purpose: 'fee',
                    category: 'all',
                    maxAmount: termSummary.balance,
                    key: 'pay_all',
                  })
                }
              >
                Pay Now {termSummary.balance > 0 ? `(${Money(termSummary.balance)})` : ''}
              </PrimaryPayButton>
            </div>
          </div>

          {urgentMessage ? (
            <div
              className={[
                'mt-4 flex items-start gap-3 rounded-2xl border p-4',
                urgentMessage.tone === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900'
                  : urgentMessage.tone === 'warn'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-900'
                    : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-900',
              ].join(' ')}
            >
              <div className="mt-0.5">
                {urgentMessage.tone === 'success' ? <FaCheckCircle /> : null}
                {urgentMessage.tone === 'warn' ? <FaExclamationTriangle /> : null}
                {urgentMessage.tone === 'info' ? <FaInfoCircle /> : null}
              </div>
              <div className="text-sm font-bold leading-relaxed">{urgentMessage.text}</div>
            </div>
          ) : null}

          {Date.now() < payCooldownUntil ? (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-900/10 bg-white/70 p-4 text-slate-900">
              <div className="mt-0.5 text-slate-700">
                <FaClock />
              </div>
              <div className="text-sm font-bold leading-relaxed">
                Payment service is temporarily unavailable. Try again in{' '}
                <span className="font-black">
                  {Math.max(1, Math.ceil((payCooldownUntil - Date.now()) / 1000))}s
                </span>
                .
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Total</div>
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-700">
              <FaMoneyBillWave />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{Money(termSummary.total)}</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">Fees + required contributions</div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Paid</div>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-700">
              <FaCheckCircle />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{Money(termSummary.paid)}</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">Confirmed payments</div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Balance</div>
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-700">
              <FaExclamationTriangle />
            </div>
          </div>
          <div
            className={[
              'mt-3 text-2xl font-black tracking-tight',
              termSummary.balance > 0 ? 'text-rose-700' : 'text-slate-900',
            ].join(' ')}
          >
            {Money(termSummary.balance)}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-600">Amount remaining</div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Due date</div>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-700">
              <FaCalendarAlt />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            {termSummary.dueDate ? formatISODate(termSummary.dueDate) : '—'}
          </div>
          <div className="mt-2">
            <Badge
              status={termSummary.status}
              label={
                normalizePaymentStatus(termSummary.status) === 'paid'
                  ? 'Paid'
                  : normalizePaymentStatus(termSummary.status) === 'partial'
                    ? 'Partial'
                    : normalizePaymentStatus(termSummary.status) === 'overdue'
                      ? 'Overdue'
                      : 'Pending'
              }
            />
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <GlassCard className="xl:col-span-7">
          <div className="border-b border-slate-900/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black tracking-tight text-slate-900">Fee Breakdown</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">Clear status for each required payment item</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-extrabold text-slate-700">
                  Currency: TZS
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {feeItems?.length ? (
              <div className="grid gap-3">
                {feeItems.map((item) => (
                  <div
                    key={`${item.kind}_${item.category || 'fee'}`}
                    className={[
                      'flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between',
                      item.balance > 0 ? 'border-slate-900/10 bg-white' : 'border-emerald-500/15 bg-emerald-500/5',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-900">{item.name}</div>
                        <Badge
                          status={item.status}
                          label={
                            normalizePaymentStatus(item.status) === 'paid'
                              ? 'Paid'
                              : normalizePaymentStatus(item.status) === 'partial'
                                ? 'Partial'
                                : normalizePaymentStatus(item.status) === 'overdue'
                                  ? 'Overdue'
                                  : 'Pending'
                          }
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-700 md:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total</div>
                          <div className="font-black text-slate-900">{Money(item.amount)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Paid</div>
                          <div className="font-black text-slate-900">{Money(item.paid)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Balance</div>
                          <div className={['font-black', item.balance > 0 ? 'text-rose-700' : 'text-slate-900'].join(' ')}>
                            {Money(item.balance)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {item.balance <= 0 ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-extrabold text-emerald-800">
                          <FaCheckCircle className="text-[12px]" />
                          Congratulations
                        </div>
                      ) : (
                        <PrimaryPayButton
                          disabled={!canPayOnline || Boolean(payingKey) || Date.now() < payCooldownUntil}
                          loading={payingKey === `${item.kind}:${item.category || 'fee'}`}
                          onClick={() =>
                            openPayDialog({
                              title: `Pay: ${item.name}`,
                              purpose: item.kind === 'contribution' ? 'contribution' : 'fee',
                              category: item.kind === 'contribution' ? item.category : null,
                              maxAmount: item.balance,
                              key: `${item.kind}:${item.category || 'fee'}`,
                            })
                          }
                        >
                          Pay Now ({Money(item.balance)})
                        </PrimaryPayButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-900/10 bg-white p-6 text-center">
                <div className="text-lg font-black text-slate-900">No payment items yet</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">The school has not configured fees for this term.</div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="xl:col-span-5">
          <div className="border-b border-slate-900/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black tracking-tight text-slate-900">Payment History</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">Filter and download receipts</div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-extrabold text-slate-700">
                <FaFilter className="text-[11px]" />
                Filters
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                Term
                <select
                  value={filters.term}
                  onChange={(e) => setFilters((s) => ({ ...s, term: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500/40"
                >
                  <option value="all">All terms</option>
                  {(derived.terms || []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                Status
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500/40"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                Start date
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((s) => ({ ...s, startDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500/40"
                />
              </label>

              <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                End date
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((s) => ({ ...s, endDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500/40"
                />
              </label>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-900/10 bg-white">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 backdrop-blur-md">
                    <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/5">
                    {filteredHistory.length ? (
                      filteredHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-indigo-500/5">
                          <td className="px-4 py-3">
                            <div className="font-extrabold text-slate-900">{formatISODate(p.date) || '—'}</div>
                            <div className="text-xs font-semibold text-slate-500">{p.method || '—'}</div>
                          </td>
                          <td className="px-4 py-3 font-black text-slate-900">{Money(p.amount)}</td>
                          <td className="px-4 py-3">
                            <Badge
                              status={p.status}
                              label={
                                normalizePaymentStatus(p.status) === 'paid'
                                  ? 'Paid'
                                  : normalizePaymentStatus(p.status) === 'partial'
                                    ? 'Partial'
                                    : normalizePaymentStatus(p.status) === 'overdue'
                                      ? 'Overdue'
                                      : normalizePaymentStatus(p.status) === 'failed'
                                        ? 'Failed'
                                        : 'Pending'
                              }
                            />
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              Ref: {String(p.reference || '—').slice(0, 28)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={!p.receiptNo}
                              onClick={() => exportReceiptPdf(p)}
                              className={[
                                'inline-flex min-h-[40px] items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black shadow-sm transition focus:outline-none focus:ring-4 focus:ring-blue-500/15',
                                p.receiptNo
                                  ? 'bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800'
                                  : 'cursor-not-allowed bg-slate-200 text-slate-500',
                              ].join(' ')}
                            >
                              <FaReceipt className="text-[11px]" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center">
                          <div className="text-base font-black text-slate-900">No payments found</div>
                          <div className="mt-1 text-sm font-semibold text-slate-600">
                            Try clearing filters, or check again later.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-600">
                Showing <span className="font-black text-slate-900">{filteredHistory.length}</span> record(s)
              </div>
              <DarkActionButton onClick={exportStatementPdf} className="min-h-[40px] px-5 py-2 text-xs">
                <FaDownload className="text-[11px]" />
                Download Statement (PDF)
              </DarkActionButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ParentPayments;
