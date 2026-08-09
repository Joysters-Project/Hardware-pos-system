import React from 'react';
import { Shield, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';

/**
 * WarrantyHandlingSection — modular component.
 * Shown ONLY when action is REPAIR or EXCHANGE.
 * Never shown during sales or billing.
 */
export default function WarrantyHandlingSection({ item, onChangeField, calculateCustomerPayment }) {
  const actionLabel = item.action === 'REPAIR' ? 'Repair' : 'Exchange';

  const handleAnswerSelect = (answer) => {
    onChangeField('has_warranty_answer', answer);
    if (answer === 'NO') {
      onChangeField('warranty_status', null);
      onChangeField('discount_percentage', 0);
    } else if (answer === 'YES') {
      const today = new Date().toISOString().split('T')[0];
      const isExpired = item.warranty_expiry_date && item.warranty_expiry_date < today;
      const status = isExpired ? 'EXPIRED' : (item.warranty_status || 'VALID');
      onChangeField('warranty_status', status);
      onChangeField('discount_percentage', status === 'VALID' ? 100 : 0);
    }
  };

  const handleStatusToggle = (status) => {
    onChangeField('warranty_status', status);
    onChangeField('discount_percentage', status === 'VALID' ? 100 : 0);
  };

  const handleExpiryDateChange = (dateVal) => {
    onChangeField('warranty_expiry_date', dateVal);
    if (dateVal) {
      const today = new Date().toISOString().split('T')[0];
      const newStatus = dateVal < today ? 'EXPIRED' : 'VALID';
      onChangeField('warranty_status', newStatus);
      onChangeField('discount_percentage', newStatus === 'VALID' ? 100 : 0);
    }
  };

  const customerPayment = calculateCustomerPayment();

  return (
    <div className="span-full ret-warranty-block">
      <div className="ret-warranty-header">
        <span className="ret-warranty-title">
          <Shield size={15} /> Warranty Verification — {actionLabel}
        </span>
        {item.has_warranty_answer && (
          <button type="button" className="ret-warranty-change-btn" onClick={() => handleAnswerSelect(null)}>
            Change
          </button>
        )}
      </div>

      {!item.has_warranty_answer ? (
        /* ── Question ── */
        <div className="ret-warranty-question">
          <div className="ret-warranty-q-text">
            <HelpCircle size={15} /> Does this product have a warranty?
          </div>
          <div className="ret-warranty-q-btns">
            <button type="button" className="ret-wq-btn yes" onClick={() => handleAnswerSelect('YES')}>
              ✓ Yes
            </button>
            <button type="button" className="ret-wq-btn no" onClick={() => handleAnswerSelect('NO')}>
              ✕ No
            </button>
          </div>
        </div>
      ) : item.has_warranty_answer === 'NO' ? (
        /* ── No Warranty ── */
        <div className="ret-warranty-fields">
          <div className="ret-warranty-status-note nowarranty">
            ℹ️ No Warranty — Customer pays {actionLabel.toLowerCase()} charges.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <div>
              <label>Supplier {actionLabel} Charge (LKR)</label>
              <input id="0_00" name="0_00"
                type="number"
                min="0"
                placeholder="0.00"
                value={item.repair_cost || ''}
                onChange={(e) => onChangeField('repair_cost', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label>Customer Payment</label>
              <div className="ret-readonly-field">LKR {customerPayment.toFixed(2)}</div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Has Warranty ── */
        <div className="ret-warranty-fields">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label>Warranty Card No. (Optional)</label>
              <input id="e_g_wc_88219" name="e_g_wc_88219"
                type="text"
                placeholder="e.g. WC-88219"
                value={item.warranty_card_no || ''}
                onChange={(e) => onChangeField('warranty_card_no', e.target.value)}
              />
            </div>
            <div>
              <label>Warranty Expiry Date</label>
              <input id="date_field" name="date_field"
                type="date"
                value={item.warranty_expiry_date || ''}
                onChange={(e) => handleExpiryDateChange(e.target.value)}
              />
            </div>
            <div>
              <label>Warranty Status</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button
                  type="button"
                  className={`ret-wstatus-btn valid ${item.warranty_status === 'VALID' ? 'active' : ''}`}
                  onClick={() => handleStatusToggle('VALID')}
                >
                  ✓ Valid
                </button>
                <button
                  type="button"
                  className={`ret-wstatus-btn expired ${item.warranty_status === 'EXPIRED' ? 'active' : ''}`}
                  onClick={() => handleStatusToggle('EXPIRED')}
                >
                  ✕ Expired
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label>Supplier {actionLabel} Charge (LKR)</label>
              <input id="0_00" name="0_00"
                type="number"
                min="0"
                placeholder="0.00"
                disabled={item.warranty_status === 'VALID'}
                value={item.warranty_status === 'VALID' ? 0 : (item.repair_cost || '')}
                onChange={(e) => onChangeField('repair_cost', parseFloat(e.target.value) || 0)}
                style={{ background: item.warranty_status === 'VALID' ? '#f1f5f9' : 'white' }}
              />
            </div>
            <div>
              <label>Customer Payment</label>
              <div className={`ret-readonly-field ${item.warranty_status === 'VALID' ? 'free' : ''}`}>
                {item.warranty_status === 'VALID' ? '🎉 FREE' : `LKR ${customerPayment.toFixed(2)}`}
              </div>
            </div>
          </div>

          <div className={`ret-warranty-status-note ${item.warranty_status === 'VALID' ? 'valid' : 'expired'}`}>
            {item.warranty_status === 'VALID' ? (
              <><CheckCircle2 size={13} /> Warranty Valid — Supplier {actionLabel} is FREE.</>
            ) : (
              <><ShieldAlert size={13} /> Warranty Expired — Customer pays {actionLabel.toLowerCase()} charges.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
