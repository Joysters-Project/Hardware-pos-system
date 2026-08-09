import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  Search, CheckCircle, Package, Wrench, AlertTriangle,
  ArrowRight, Printer, ClipboardList, RotateCcw
} from 'lucide-react';
import '../../styles/Returns.css';
import { printWithTemplate } from '../../utils/printTemplate';
import WarrantyHandlingSection from '../../components/returns/WarrantyHandlingSection';
import {
  CONDITIONS,
  ACTIONS,
  getValidActions,
  getRecommendation,
  getValidationHint,
  getStockMovement,
  getConditionLabel,
  getActionLabel,
  mapActionToBackend,
  calcCustomerPayment,
  requiresWarranty,
  requiresManagerApproval,
} from '../../utils/returnWorkflowLogic';

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ currentStep }) {
  const steps = [
    { n: 1, label: 'Select Invoice' },
    { n: 2, label: 'Select Products' },
    { n: 3, label: 'Inspect & Action' },
    { n: 4, label: 'Confirm' },
  ];
  return (
    <div className="ret-step-bar">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className={`ret-step ${currentStep === s.n ? 'active' : currentStep > s.n ? 'done' : ''}`}>
            <div className="ret-step-circle">{currentStep > s.n ? '✓' : s.n}</div>
            <span className="ret-step-label">{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`ret-step-line ${currentStep > s.n + 1 || (currentStep > s.n) ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Recommendation Panel ────────────────────────────────────────────────────
function RecommendationPanel({ condition, currentAction, onSelect }) {
  if (!condition) return null;
  const { recommended, alternative } = getRecommendation(condition);
  return (
    <div className="ret-recommendation-panel">
      <div className="ret-rec-title">💡 Suggested Action</div>
      <div className="ret-rec-row">
        <div
          className={`ret-rec-chip recommended ${currentAction === recommended ? 'selected' : ''}`}
          onClick={() => onSelect(recommended)}
        >
          ✓ {getActionLabel(recommended)}
          <span className="ret-rec-badge">Recommended</span>
        </div>
        {alternative && (
          <div
            className={`ret-rec-chip alternative ${currentAction === alternative ? 'selected' : ''}`}
            onClick={() => onSelect(alternative)}
          >
            {getActionLabel(alternative)}
            <span className="ret-rec-badge alt">Alternative</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Validation Hint ─────────────────────────────────────────────────────────
function ValidationHint({ condition, action }) {
  const hint = getValidationHint(condition, action);
  const needsApproval = requiresManagerApproval(condition, action);
  if (!hint && !needsApproval) return null;
  return (
    <div className={`ret-validation-hint ${needsApproval ? 'approval' : 'info'}`}>
      {needsApproval && <strong>⚠️ Manager Approval Required. </strong>}
      {hint}
    </div>
  );
}

// ─── Return Item Card ────────────────────────────────────────────────────────
function ReturnItemCard({ item, onToggle, onFieldChange, calcPayment }) {
  const validActions = getValidActions(item.condition);
  const hint = getValidationHint(item.condition, item.action);
  const needsApproval = requiresManagerApproval(item.condition, item.action);

  // Keep action in sync when condition changes and current action is no longer valid
  const handleConditionChange = (newCondition) => {
    onFieldChange('condition', newCondition);
    const newValid = getValidActions(newCondition);
    const rec = getRecommendation(newCondition);
    if (!newValid.includes(item.action)) {
      onFieldChange('action', rec.recommended);
    }
    // Reset warranty on condition change
    onFieldChange('has_warranty_answer', null);
    onFieldChange('repair_cost', 0);
    onFieldChange('discount_percentage', 0);
  };

  const handleActionChange = (newAction) => {
    onFieldChange('action', newAction);
    // Reset warranty fields if action is no longer repair/exchange
    if (!requiresWarranty(newAction)) {
      onFieldChange('has_warranty_answer', null);
      onFieldChange('repair_cost', 0);
      onFieldChange('discount_percentage', 0);
    }
  };

  return (
    <div className={`ret-item-card ${item.selected ? 'selected' : ''}`}>
      {/* ── Header row ── */}
      <div className="ret-item-header" onClick={onToggle}>
        <input id="checkbox_field" name="checkbox_field"
          type="checkbox"
          checked={item.selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
        <div style={{ flex: 1 }}>
          <div className="ret-item-name">{item.product_name}</div>
          <div className="ret-item-meta">
            Billed Price: LKR {item.price_per_unit.toFixed(2)} &nbsp;|&nbsp; Billed Qty: {item.max_quantity}
          </div>
        </div>
        {item.selected && item.action && (
          <div className="ret-item-action-badge">
            {getActionLabel(item.action)}
          </div>
        )}
      </div>

      {/* ── Expanded fields ── */}
      {item.selected && (
        <div className="ret-item-fields">

          {/* Step 2: Quantity */}
          <div>
            <label>Return Quantity</label>
            <input id="return_quantity" name="return_quantity"
              type="number"
              min="1"
              max={item.max_quantity}
              value={item.return_quantity}
              onChange={(e) =>
                onFieldChange('return_quantity',
                  Math.min(item.max_quantity, Math.max(1, parseInt(e.target.value) || 1))
                )
              }
            />
            {item.return_quantity > item.max_quantity && (
              <div className="ret-field-error">⚠️ Cannot exceed billed quantity ({item.max_quantity})</div>
            )}
          </div>

          {/* Return Reason */}
          <div className="span-full">
            <label>Return Reason <span style={{ color: '#c00' }}>*</span></label>
            <select id="select_field" name="select_field"
              value={item.return_reason || ''}
              onChange={(e) => {
                onFieldChange('return_reason', e.target.value);
                if (e.target.value !== 'Other') onFieldChange('inspection_notes', '');
              }}
              style={{ borderColor: !item.return_reason ? '#e57373' : undefined }}
            >
              <option value="">— Select a reason —</option>
              <option value="Defective Product">Defective Product</option>
              <option value="Physically Damaged">Physically Damaged</option>
              <option value="Wrong Product Delivered">Wrong Product Delivered</option>
              <option value="Warranty Claim">Warranty Claim</option>
              <option value="Customer Changed Mind">Customer Changed Mind</option>
              <option value="Quality Issue">Quality Issue</option>
              <option value="Missing Accessories">Missing Accessories</option>
              <option value="Not As Described">Not As Described</option>
              <option value="Other">Other (please specify)</option>
            </select>
            {!item.return_reason && (
              <div className="ret-field-error">⚠️ Please select a return reason</div>
            )}
          </div>

          {/* Other — mandatory notes */}
          {item.return_reason === 'Other' && (
            <div className="span-full">
              <label>Please Describe the Reason <span style={{ color: '#c00' }}>*</span></label>
              <input id="describe_the_specific_reason_for_return" name="describe_the_specific_reason_for_return"
                type="text"
                placeholder="Describe the specific reason for return…"
                value={item.inspection_notes || ''}
                onChange={(e) => onFieldChange('inspection_notes', e.target.value)}
                style={{ borderColor: !item.inspection_notes?.trim() ? '#e57373' : undefined }}
              />
              {!item.inspection_notes?.trim() && (
                <div className="ret-field-error">⚠️ Description is required when reason is "Other"</div>
              )}
            </div>
          )}

          {/* Step 3: Product Condition */}
          <div>
            <label>Product Condition</label>
            <select id="condition" name="condition" value={item.condition} onChange={(e) => handleConditionChange(e.target.value)}>
              {CONDITIONS.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          {/* Step 4: Requested Return Action */}
          <div className="span-full">
            <label>Requested Return Action</label>
            <select id="action" name="action" value={item.action} onChange={(e) => handleActionChange(e.target.value)}>
              {validActions.map(key => (
                <option key={key} value={key}>{getActionLabel(key)}</option>
              ))}
            </select>
          </div>

          {/* Validation hint */}
          {(hint || needsApproval) && (
            <div className="span-full">
              <ValidationHint condition={item.condition} action={item.action} />
            </div>
          )}

          {/* Step 5: Warranty — only for REPAIR / EXCHANGE */}
          {requiresWarranty(item.action) && (
            <WarrantyHandlingSection
              item={item}
              onChangeField={onFieldChange}
              calculateCustomerPayment={() => calcPayment(item)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary Panel ────────────────────────────────────────────────────────────
function SummaryPanel({ selectedItems, globalDecision, onGlobalDecisionChange, suppliers, globalSupplierId, onSupplierChange, onSubmit, submitting, bill }) {
  const total = selectedItems.length;
  const refundItems = selectedItems.filter(i => ['REFUND', 'PARTIAL_REFUND', 'STOCK'].includes(i.action));
  const supplierItems = selectedItems.filter(i => ['REPAIR', 'EXCHANGE', 'SUPPLIER_CLAIM'].includes(i.action));
  const grossRefund = refundItems.reduce((s, i) => s + (i.price_per_unit * i.return_quantity), 0);
  const totalRepair = selectedItems.reduce((s, i) => s + calcCustomerPayment(i), 0);
  const needsSupplier = supplierItems.length > 0;

  // Compute paid amount and balance from bill payments
  const billPayments = bill?.payments || [];
  const amountPaid = billPayments
    .filter(p => parseFloat(p.amount_paid) > 0)
    .reduce((s, p) => s + parseFloat(p.amount_paid), 0);
  const balanceDue = parseFloat(bill?.balance_due) || 0;
  // Actual cash refund = min(grossRefund, what customer already paid)
  // If balance_due > 0, the refund first offsets the balance, then cash is returned
  const effectivePaid = Math.max(0, amountPaid - balanceDue);
  const actualCashRefund = grossRefund > 0 ? Math.min(grossRefund, effectivePaid) : 0;
  const deductedFromBalance = Math.min(grossRefund, balanceDue);

  return (
    <div className="ret-right">
      <h3>Return Summary</h3>

      {total === 0 ? (
        <p style={{ color: '#aaa', fontSize: '14px', marginTop: '8px' }}>
          Select items on the left to see a summary here.
        </p>
      ) : (
        <>
          {/* Per-item breakdown */}
          {selectedItems.map(item => (
            <div key={item.product_id} className="ret-summary-item-block">
              <div className="ret-summary-item-name">{item.product_name}</div>
              <div className="ret-summary-item-row">
                <span>Condition</span>
                <span>{getConditionLabel(item.condition)}</span>
              </div>
              <div className="ret-summary-item-row">
                <span>Requested Action</span>
                <span className="ret-summary-action-tag">{getActionLabel(item.action)}</span>
              </div>
              <div className="ret-summary-item-row">
                <span>Stock Movement</span>
                <span style={{ fontSize: '12px' }}>{getStockMovement(item.action)}</span>
              </div>
              {requiresWarranty(item.action) && item.has_warranty_answer && (
                <div className="ret-summary-item-row">
                  <span>Warranty</span>
                  <span className={`ret-summary-warranty ${item.warranty_status === 'VALID' ? 'valid' : 'expired'}`}>
                    {item.has_warranty_answer === 'YES'
                      ? (item.warranty_status === 'VALID' ? '✓ Valid' : '✕ Expired')
                      : 'No Warranty'}
                  </span>
                </div>
              )}
            </div>
          ))}



          {/* Supplier picker — only when supplier action exists */}
          {needsSupplier && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
                Preferred Supplier for Service:
              </label>
              <select id="globalSupplierId" name="globalSupplierId"
                value={globalSupplierId}
                onChange={(e) => onSupplierChange(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }}
              >
                <option value="">Select Supplier…</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
          )}

          <hr className="ret-divider" />

          <div className="ret-summary-row">
            <span>Items to Process:</span>
            <span>{total}</span>
          </div>

          {grossRefund > 0 && (
            <>
              <div className="ret-summary-row">
                <span>Gross Return Value:</span>
                <span style={{ color: '#555', fontWeight: 500 }}>LKR {grossRefund.toFixed(2)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="ret-summary-row">
                  <span>Applied to Balance Due:</span>
                  <span style={{ color: '#b45309', fontWeight: 500 }}>- LKR {deductedFromBalance.toFixed(2)}</span>
                </div>
              )}
              <div className="ret-summary-row">
                <span style={{ fontWeight: 'bold' }}>Actual Cash Refund:</span>
                <span style={{ color: '#166534', fontWeight: 'bold' }}>LKR {actualCashRefund.toFixed(2)}</span>
              </div>
              {actualCashRefund === 0 && grossRefund > 0 && (
                <div style={{ fontSize: '11px', color: '#b45309', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px', marginBottom: '6px' }}>
                  ⚠️ No cash refund — full return value offsets the outstanding balance.
                </div>
              )}
            </>
          )}

          {totalRepair > 0 && (
            <div className="ret-summary-row">
              <span>Repair / Service Charge:</span>
              <span style={{ color: '#800000', fontWeight: 'bold' }}>LKR {totalRepair.toFixed(2)}</span>
            </div>
          )}

          <hr className="ret-divider" />

          <button
            className="ret-confirm-btn"
            disabled={total === 0 || submitting}
            onClick={onSubmit}
          >
            {submitting ? 'Processing…' : 'Confirm & Process Return'}
          </button>
        </>
      )}
    </div>
  );
}




// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ result, bill, onReset, onGoToHistory, onGoToRepair }) {
  const handlePrintReceipt = () => {
    const contentHtml = `
      <table class="tpl-table">
        <tr><td>Return ID</td><td>RET-${result.return_id}</td></tr>
        <tr><td>Invoice</td><td>${bill?.bill_no || `INV-${bill?.bill_id}`}</td></tr>
        <tr><td>Items Processed</td><td>${result.items_count}</td></tr>
        <tr><td>Gross Return Value</td><td>LKR ${(result.gross_refund || 0).toFixed(2)}</td></tr>
        <tr><td>Customer Refund</td><td>LKR ${(result.total_refund || 0).toFixed(2)}</td></tr>
        <tr><td>Repair Charge</td><td>LKR ${(result.customer_payment || 0).toFixed(2)}</td></tr>
        <tr><td>Status</td><td>Completed</td></tr>
      </table>
    `;

    const opened = printWithTemplate({
      title: 'Return Receipt',
      subtitle: 'Return Successfully Processed',
      contentHtml,
    });

    if (!opened) toast.error('Allow pop-ups to print this receipt.');
  };

  return (
    <div className="ret-success">
      <div className="ret-success-card">
        <CheckCircle size={64} style={{ color: '#166534', marginBottom: '16px' }} />
        <h2>Return Successfully Processed</h2>
        <p style={{ color: '#777', marginBottom: '24px' }}>All operations completed.</p>

        <div className="ret-success-details">
          <div className="ret-success-detail-row">
            <span>Return ID</span>
            <strong>RET-{result.return_id}</strong>
          </div>
          <div className="ret-success-detail-row">
            <span>Invoice</span>
            <strong>{bill?.bill_no || `INV-${bill?.bill_id}`}</strong>
          </div>
          <div className="ret-success-detail-row">
            <span>Items Processed</span>
            <strong>{result.items_count} item{result.items_count !== 1 ? 's' : ''}</strong>
          </div>
          {(result.total_refund > 0 || result.gross_refund > 0) && (
            <>
              {result.gross_refund > 0 && result.gross_refund !== result.total_refund && (
                <div className="ret-success-detail-row">
                  <span>Gross Return Value</span>
                  <strong style={{ color: '#555' }}>LKR {result.gross_refund.toFixed(2)}</strong>
                </div>
              )}
              <div className="ret-success-detail-row">
                <span>Cash Refund to Customer</span>
                <strong style={{ color: '#166534' }}>LKR {(result.total_refund || 0).toFixed(2)}</strong>
              </div>
            </>
          )}
          {result.customer_payment > 0 && (
            <div className="ret-success-detail-row">
              <span>Repair Charge</span>
              <strong style={{ color: '#800000' }}>LKR {result.customer_payment.toFixed(2)}</strong>
            </div>
          )}
          <div className="ret-success-detail-row">
            <span>Stock Movement</span>
            <strong style={{ color: '#166534' }}>✓ Completed</strong>
          </div>
        </div>

        <div className="ret-success-actions">
          <button className="ret-success-btn secondary" onClick={onGoToHistory}>
            <ClipboardList size={16} /> Return History
          </button>
          {result.has_supplier_action && (
            <button className="ret-success-btn secondary" onClick={onGoToRepair}>
              <Wrench size={16} /> Supplier Queue
            </button>
          )}
          <button className="ret-success-btn secondary" onClick={handlePrintReceipt}>
            <Printer size={16} /> Print Receipt
          </button>
          <button className="ret-success-btn primary" onClick={onReset}>
            <RotateCcw size={16} /> Process Another Return
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProcessReturn() {
  const [searchType, setSearchType] = useState('bill');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [billsList, setBillsList] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  // selectedItems: Map<productId, itemState>
  const [selectedItems, setSelectedItems] = useState({});
  const [globalDecision, setGlobalDecision] = useState('Defective');
  const [globalSupplierId, setGlobalSupplierId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // Determine current step for progress indicator
  const selectedList = Object.values(selectedItems).filter(i => i.selected);
  const currentStep = !selectedBill ? 1 : selectedList.length === 0 ? 2 : 3;

  useEffect(() => {
    api.get('/suppliers')
      .then(res => {
        const data = res.data;
        setSuppliers(Array.isArray(data) ? data : (data.data || []));
      })
      .catch(() => {});
  }, []);

  // ── Bill search ──
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) { toast.error('Enter a bill number or customer phone'); return; }

    try {
      setLoading(true);
      setSelectedBill(null);
      setSuccessResult(null);
      const params = searchType === 'bill'
        ? { bill_no: searchTerm.trim() }
        : { phone: searchTerm.trim() };
      const res = await api.get('/returns/lookup-bill', { params });
      const data = res.data;
      if (data.success && data.data?.length > 0) {
        setBillsList(data.data);
        if (data.data.length === 1) selectBill(data.data[0]);
      } else {
        toast.error(data.error || 'No matching bill found');
        setBillsList([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to lookup bill');
    } finally {
      setLoading(false);
    }
  };

  // ── Bill selection ──
  const selectBill = async (bill) => {
    setSelectedBill(bill);
    const init = {};
    for (const item of bill.bill_items || []) {
      const prodId = item.product_id;
      const defaultCondition = 'DEFECTIVE';
      const defaultAction = getRecommendation(defaultCondition).recommended;
      init[prodId] = {
        selected: false,
        product_id: prodId,
        product_name: item.product?.product_name || `Product #${prodId}`,
        price_per_unit: parseFloat(item.price_per_unit) || 0,
        max_quantity: item.quantity,
        return_quantity: 1,
        condition: defaultCondition,
        action: defaultAction,
        return_reason: '',
        inspection_notes: '',
        has_warranty_answer: null,
        warranty_card_no: '',
        warranty_expiry_date: '',
        warranty_status: 'VALID',
        repair_cost: 0,
        discount_percentage: 0,
      };
    }
    setSelectedItems(init);
  };

  // ── Item state helpers ──
  const toggleItem = (prodId) =>
    setSelectedItems(prev => ({
      ...prev,
      [prodId]: { ...prev[prodId], selected: !prev[prodId].selected }
    }));

  const changeItemField = (prodId, field, value) =>
    setSelectedItems(prev => ({ ...prev, [prodId]: { ...prev[prodId], [field]: value } }));

  // ── Toggle all ──
  const allSelected = Object.values(selectedItems).every(i => i.selected);
  const toggleAll = () =>
    setSelectedItems(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], selected: !allSelected }; });
      return updated;
    });

  // ── Submit ──
  const handleSubmit = async () => {
    if (selectedList.length === 0) { toast.error('Select at least one product to return'); return; }

    // Warranty validation
    const missingWarranty = selectedList.filter(i => requiresWarranty(i.action) && !i.has_warranty_answer);
    if (missingWarranty.length > 0) {
      toast.error(`Answer the warranty question for: ${missingWarranty.map(i => i.product_name).join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);
      const hasSupplierAction = selectedList.some(i => ['REPAIR', 'EXCHANGE', 'SUPPLIER_CLAIM'].includes(i.action));

      const payload = {
        bill_id: selectedBill.bill_id,
        customer_id: selectedBill.customer_id || null,
        return_type: hasSupplierAction ? 'REPAIR' : 'REFUND',
        reason: globalDecision,
        supplier_id: globalSupplierId || null,
        items: selectedList.map(item => {
          const { backend, destination } = mapActionToBackend(item.action);
          const isValidWarranty = item.has_warranty_answer === 'YES' && item.warranty_status === 'VALID';
          return {
            product_id: item.product_id,
            return_quantity: Number(item.return_quantity),
            quantity: Number(item.return_quantity),
            condition: (() => {
              // Map extended conditions to backend-accepted ENUM values
              const map = {
                BRAND_NEW: 'GOOD', OPENED_UNUSED: 'GOOD', DEFECTIVE: 'DEFECTIVE',
                MINOR_DAMAGE: 'DAMAGED', MAJOR_DAMAGE: 'DAMAGED',
                MISSING_ACCESSORIES: 'DAMAGED', USED: 'DEFECTIVE'
              };
              return map[item.condition] || 'DEFECTIVE';
            })(),
            action: backend,
            destination,
            return_reason: item.return_reason === 'Other'
                ? (item.inspection_notes || globalDecision)
                : (item.return_reason || globalDecision),
            repair_cost: isValidWarranty ? 0 : (parseFloat(item.repair_cost) || 0),
            discount_percentage: isValidWarranty ? 100 : (parseFloat(item.discount_percentage) || 0),
            has_warranty: requiresWarranty(item.action) ? (item.has_warranty_answer === 'YES') : null,
            warranty_card_no: item.warranty_card_no || null,
            warranty_expiry_date: item.warranty_expiry_date || null,
            warranty_status: requiresWarranty(item.action) ? (item.warranty_status || null) : null,
          };
        }),
      };

      const res = await api.post('/returns', payload);
      const data = res.data;

      if (data.success) {
        toast.success('Return processed successfully!');
        const grossRefund = selectedList.reduce((s, i) =>
          ['REFUND', 'PARTIAL_REFUND', 'STOCK'].includes(i.action)
            ? s + i.price_per_unit * i.return_quantity : s, 0);
        const billPayments = selectedBill?.payments || [];
        const amountPaid = billPayments
          .filter(p => parseFloat(p.amount_paid) > 0)
          .reduce((s, p) => s + parseFloat(p.amount_paid), 0);
        const balanceDue = parseFloat(selectedBill?.balance_due) || 0;
        const effectivePaid = Math.max(0, amountPaid - balanceDue);
        const actualCashRefund = grossRefund > 0 ? Math.min(grossRefund, effectivePaid) : 0;
        const customerPayment = selectedList.reduce((s, i) => s + calcCustomerPayment(i), 0);
        setSuccessResult({
          return_id: data.data?.return_id,
          gross_refund: grossRefund,
          total_refund: actualCashRefund,
          customer_payment: customerPayment,
          items_count: selectedList.length,
          has_supplier_action: hasSupplierAction,
        });
      } else {
        toast.error(data.error || 'Failed to process return');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error processing return');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessResult(null);
    setSelectedBill(null);
    setSearchTerm('');
    setBillsList([]);
    setSelectedItems({});
    setGlobalDecision('Defective');
    setGlobalSupplierId('');
  };

  // ── Success screen ──
  if (successResult) {
    return (
      <SuccessScreen
        result={successResult}
        bill={selectedBill}
        onReset={handleReset}
        onGoToHistory={() => window.location.hash = '#/returns/history'}
        onGoToRepair={() => window.location.hash = '#/returns/supplier-service'}
      />
    );
  }

  // ── Main UI ──
  return (
    <div style={{ marginTop: '16px' }}>
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step 1: Invoice Lookup */}
      {!selectedBill ? (
        <div className="ret-search-card">
          <h2>Step 1: Lookup Customer Invoice</h2>

          <div className="ret-radio-row">
            <label>
              <input type="radio" name="stype" value="bill"
                checked={searchType === 'bill'} onChange={() => setSearchType('bill')} />
              Search by Invoice No (e.g. INV-1024)
            </label>
            <label>
              <input type="radio" name="stype" value="phone"
                checked={searchType === 'phone'} onChange={() => setSearchType('phone')} />
              Search by Customer Phone
            </label>
          </div>

          <form onSubmit={handleSearch} className="ret-search-box">
            <input id="searchTerm" name="searchTerm"
              type="text"
              placeholder={searchType === 'bill' ? 'Enter Invoice / Bill No…' : 'Enter Customer Phone Number…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              <Search size={16} style={{ display: 'inline', marginRight: 6 }} />
              {loading ? 'Searching…' : 'Lookup Invoice'}
            </button>
          </form>

          {billsList.length > 1 && (
            <div className="ret-bill-results">
              <h3 style={{ fontSize: '14px', color: '#555', margin: '0 0 10px' }}>Select an Invoice:</h3>
              {billsList.map(bill => (
                <div key={bill.bill_id} className="ret-bill-result-item" onClick={() => selectBill(bill)}>
                  <div>
                    <div className="bill-no">{bill.bill_no || `INV-${bill.bill_id}`}</div>
                    <div className="bill-date">
                      {new Date(bill.bill_date).toLocaleDateString()} — {bill.customer?.customer_name || 'Walk-in Customer'}
                    </div>
                  </div>
                  <div className="bill-total">LKR {parseFloat(bill.total_amount || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Steps 2-4 */
        <div>
          {/* Invoice bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <button className="ret-back-btn" onClick={() => setSelectedBill(null)}>
              ← Different Invoice
            </button>
            <div style={{ fontSize: '15px', color: '#333' }}>
              Invoice:&nbsp;
              <strong style={{ color: '#800000' }}>
                {selectedBill.bill_no || `INV-${selectedBill.bill_id}`}
              </strong>
              &nbsp;({new Date(selectedBill.bill_date).toLocaleDateString()})
              {selectedBill.customer?.customer_name &&
                <> &mdash; {selectedBill.customer.customer_name}</>}
            </div>
          </div>

          {/* Payment Info Bar */}
          {(() => {
            const bPayments = selectedBill?.payments || [];
            const paid = bPayments.filter(p => parseFloat(p.amount_paid) > 0).reduce((s, p) => s + parseFloat(p.amount_paid), 0);
            const balance = parseFloat(selectedBill?.balance_due) || 0;
            const total = parseFloat(selectedBill?.total_amount) || 0;
            return (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 14px', fontSize: '12px' }}>
                  <span style={{ color: '#888' }}>Bill Total: </span>
                  <strong>LKR {total.toFixed(2)}</strong>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 14px', fontSize: '12px' }}>
                  <span style={{ color: '#166534' }}>Paid: </span>
                  <strong style={{ color: '#166534' }}>LKR {paid.toFixed(2)}</strong>
                </div>
                {balance > 0 ? (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', padding: '6px 14px', fontSize: '12px' }}>
                    <span style={{ color: '#c2410c' }}>Balance Due: </span>
                    <strong style={{ color: '#c2410c' }}>LKR {balance.toFixed(2)}</strong>
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', color: '#166534' }}>
                    ✓ Fully Paid
                  </div>
                )}
              </div>
            );
          })()}

          <div className="ret-content">
            {/* ── Left: item cards ── */}
            <div className="ret-left">
              <div className="ret-section-header">
                <h2>Step 2 &amp; 3: Select Products &amp; Inspect</h2>
                <button className="ret-select-all-btn" onClick={toggleAll}>
                  {allSelected ? 'Deselect All' : 'Select All Items'}
                </button>
              </div>

              {Object.values(selectedItems).map(item => (
                <ReturnItemCard
                  key={item.product_id}
                  item={item}
                  onToggle={() => toggleItem(item.product_id)}
                  onFieldChange={(f, v) => changeItemField(item.product_id, f, v)}
                  calcPayment={calcCustomerPayment}
                />
              ))}
            </div>

            {/* ── Right: summary panel ── */}
            <SummaryPanel
              selectedItems={selectedList}
              globalDecision={globalDecision}
              onGlobalDecisionChange={setGlobalDecision}
              suppliers={suppliers}
              globalSupplierId={globalSupplierId}
              onSupplierChange={setGlobalSupplierId}
              onSubmit={handleSubmit}
              submitting={submitting}
              bill={selectedBill}
            />
          </div>
        </div>
      )}
    </div>
  );
}
