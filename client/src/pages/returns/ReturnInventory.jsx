import React, { useEffect, useMemo, useRef, useState } from "react";
import { Package, Wrench, Truck, AlertTriangle, Eye, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { escapeHtml, printWithTemplate } from "../../utils/printTemplate";
import "../../styles/Products.css";

const DESTINATION_META = {
  STOCK: {
    gradient: "linear-gradient(135deg, #2e7d32, #43a047)",
    light: "#e8f5e9",
    accent: "#2e7d32",
    description: "Returned products reintegrated into active sales stock.",
    icon: Package
  },
  REPAIR: {
    gradient: "linear-gradient(135deg, #e65100, #fb8c00)",
    light: "#fff3e0",
    accent: "#e65100",
    description: "Items flagged for repair, restoration, or testing.",
    icon: Wrench
  },
  SUPPLIER: {
    gradient: "linear-gradient(135deg, #1565c0, #1e88e5)",
    light: "#e8f4fd",
    accent: "#1565c0",
    description: "Defective items to be returned to suppliers for credit.",
    icon: Truck
  },
  DAMAGED_STOCK: {
    gradient: "linear-gradient(135deg, #8b3a3a, #c0504d)",
    light: "#fff0f0",
    accent: "#8b3a3a",
    description: "Unsalvageable damaged goods written off from inventory.",
    icon: AlertTriangle
  }
};

export default function ReturnInventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [allReturns, setAllReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    let active = true;
    const loadPageData = async () => {
      // Defer loading to avoid "react-hooks/set-state-in-effect" eslint error
      await Promise.resolve();
      if (!active) return;

      setLoading(true);
      try {
        const [productsRes, categoryRes, brandsRes, unitsRes, returnsRes, suppliersRes] = await Promise.all([
          api.get("/products"),
          api.get("/category"),
          api.get("/brands"),
          api.get("/units"),
          api.get("/returns").catch(() => ({ data: { data: [] } })),
          api.get("/suppliers").catch(() => ({ data: [] }))
        ]);
        if (!active) return;
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
        setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
        setUnits(Array.isArray(unitsRes.data) ? unitsRes.data : []);
        const supplierData = suppliersRes.data?.data ?? suppliersRes.data;
        setSuppliers(Array.isArray(supplierData) ? supplierData : []);
        const returnData = returnsRes.data?.data ?? returnsRes.data;
        const returnArr = Array.isArray(returnData) ? returnData : [];
        setReturns(returnArr);
        setAllReturns(returnArr);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load inventory data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPageData();
    return () => {
      active = false;
    };
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [Number(c.category_id), c.category_name])), [categories]);
  const brandMap    = useMemo(() => new Map(brands.map((b) => [Number(b.brand_id),    b.brand_name])),    [brands]);
  const unitMap     = useMemo(() => new Map(units.map((u) => [Number(u.unit_id),      u.unit_name])),     [units]);
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [Number(s.supplier_id), s.supplier_name])), [suppliers]);

  useEffect(() => {
    let active = true;
    const fetchFilteredReturns = async () => {
      if (!selectedDestination) {
        setReturns(allReturns);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get("/returns", { params: { destination: selectedDestination } });
        if (!active) return;
        const returnData = res.data?.data ?? res.data;
        setReturns(Array.isArray(returnData) ? returnData : []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load filtered return details");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (allReturns.length > 0 || selectedDestination !== null) {
      fetchFilteredReturns();
    }

    return () => {
      active = false;
    };
  }, [selectedDestination, allReturns]);

  const currentDestinationDetails = useMemo(() => {
    if (!selectedDestination) return { label: '', qty: 0, items: [] };

    const items = [];
    returns.forEach(ret => {
      if (ret.items) {
        ret.items.forEach(item => {
          if (item.destination === selectedDestination) {
            const existing = items.find(x => x.product_id === item.product_id);
            if (existing) {
              existing.quantity += item.return_quantity;
              if (item.return_reason && !existing.reasons.includes(item.return_reason)) {
                existing.reasons.push(item.return_reason);
              }
              if (selectedDestination === 'SUPPLIER' && ret.supplier_id) {
                const sid = Number(ret.supplier_id);
                if (!existing.supplier_ids.includes(sid)) existing.supplier_ids.push(sid);
              }
            } else {
              const supplierIds = (selectedDestination === 'SUPPLIER' && ret.supplier_id)
                ? [Number(ret.supplier_id)]
                : [];
              items.push({
                product_id: item.product_id,
                product_name: item.product?.product_name || products.find(p => p.product_id === item.product_id)?.product_name || `Product #${item.product_id}`,
                quantity: item.return_quantity,
                reasons: item.return_reason ? [item.return_reason] : [],
                supplier_ids: supplierIds
              });
            }
          }
        });
      }
    });

    const label = DESTINATION_META[selectedDestination]?.label || selectedDestination;
    const qty = items.reduce((sum, item) => sum + item.quantity, 0);

    return { label, qty, items };
  }, [returns, selectedDestination, products]);

  const productReturnDetails = useMemo(() => {
    if (!viewProduct) return [];
    const details = [];
    returns.forEach(ret => {
      if (ret.items) {
        ret.items.forEach(item => {
          if (item.product_id === viewProduct.product_id) {
            details.push({
              return_date: ret.return_date,
              bill_no: ret.bill?.bill_no || ret.bills?.bill_no || `Bill #${ret.bill_id}`,
              quantity: item.return_quantity,
              reason: item.return_reason,
              destination: item.destination,
              destination_note: item.destination_note,
              refund_amount: item.refund_amount,
              supplier_id: ret.supplier_id
            });
          }
        });
      }
    });
    return details.sort((a, b) => new Date(b.return_date) - new Date(a.return_date));
  }, [viewProduct, returns]);

  const aggregatedReturns = useMemo(() => {
    const dests = {
      STOCK: { key: 'STOCK', label: 'Back to Stock', count: 0, qty: 0, items: [] },
      REPAIR: { key: 'REPAIR', label: 'Send to Repair', count: 0, qty: 0, items: [] },
      SUPPLIER: { key: 'SUPPLIER', label: 'Send to Supplier', count: 0, qty: 0, items: [] },
      DAMAGED_STOCK: { key: 'DAMAGED_STOCK', label: 'Damaged Stock', count: 0, qty: 0, items: [] }
    };

    allReturns.forEach(ret => {
      if (ret.items) {
        ret.items.forEach(item => {
          const dest = item.destination;
          if (dests[dest]) {
            const existing = dests[dest].items.find(x => x.product_id === item.product_id);
            if (existing) {
              existing.quantity += item.return_quantity;
              if (item.return_reason && !existing.reasons.includes(item.return_reason)) {
                existing.reasons.push(item.return_reason);
              }
              // accumulate all supplier_ids for this product in SUPPLIER destination
              if (dest === 'SUPPLIER' && ret.supplier_id) {
                const sid = Number(ret.supplier_id);
                if (!existing.supplier_ids.includes(sid)) existing.supplier_ids.push(sid);
              }
            } else {
              const supplierIds = (dest === 'SUPPLIER' && ret.supplier_id)
                ? [Number(ret.supplier_id)]
                : [];
              dests[dest].items.push({
                product_id: item.product_id,
                product_name: item.product?.product_name || products.find(p => p.product_id === item.product_id)?.product_name || `Product #${item.product_id}`,
                quantity: item.return_quantity,
                reasons: item.return_reason ? [item.return_reason] : [],
                supplier_ids: supplierIds
              });
            }
          }
        });
      }
    });

    Object.keys(dests).forEach(key => {
      dests[key].count = dests[key].items.length;
      dests[key].qty = dests[key].items.reduce((sum, item) => sum + item.quantity, 0);
    });

    return dests;
  }, [allReturns, products]);



  const exportPDF = () => {
    if (!viewProduct) return;

    const returnHistoryHTML = productReturnDetails.length > 0 ? `
      <div class="section-title">Return Details & History</div>
      <table class="tpl-table" style="margin-top: 8px;">
        <thead>
          <tr>
            <th style="width: 18%;">Date</th>
            <th style="width: 17%;">Bill No</th>
            <th style="width: 20%;">Destination</th>
            <th style="width: 10%;">Qty</th>
            <th style="width: 15%;">Refund</th>
            <th style="width: 20%;">Reason</th>
          </tr>
        </thead>
        <tbody>
          ${productReturnDetails.map(det => `
            <tr>
              <td>${new Date(det.return_date).toLocaleDateString()}</td>
              <td>${escapeHtml(det.bill_no)}</td>
              <td style="font-weight: bold; color: ${DESTINATION_META[det.destination]?.accent || '#333'}">${escapeHtml(DESTINATION_META[det.destination]?.label || det.destination)}</td>
              <td>${escapeHtml(det.quantity)}</td>
              <td>${escapeHtml(`Rs. ${Number(det.refund_amount || 0).toFixed(2)}`)}</td>
              <td>${escapeHtml(det.reason)}</td>
            </tr>
            ${det.destination_note ? `
              <tr>
                <td colspan="6" style="padding: 6px 8px; font-size: 10px; color: #555; background: #fff9f9;">
                  <strong>Notes:</strong> ${escapeHtml(det.destination_note)}
                </td>
              </tr>
            ` : ""}
          `).join("")}
        </tbody>
      </table>
    ` : "";

    const contentHtml = `
      <style>
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8b3a3a; margin: 14px 0 6px; }
      </style>
      <div class="section-title">Basic Information</div>
      <table class="tpl-table">
        <tr><td>Product ID</td><td>#${escapeHtml(viewProduct.product_id)}</td></tr>
        <tr><td>Product Name</td><td>${escapeHtml(viewProduct.product_name || "—")}</td></tr>
        <tr><td>Type</td><td>${escapeHtml(viewProduct.type || "—")}</td></tr>
        <tr><td>Batch No</td><td>${escapeHtml(viewProduct.batch_no || "—")}</td></tr>
        <tr><td>Status</td><td>${escapeHtml(viewProduct.status || "active")}</td></tr>
      </table>
      ${returnHistoryHTML}
    `;

    const opened = printWithTemplate({
      title: "Returned Product Details",
      subtitle: `Product #${viewProduct.product_id}`,
      contentHtml,
    });

    if (!opened) toast.error("Allow pop-ups to print the report");
  };


  if (loading && returns.length === 0) {
    return <div style={{ padding: "24px", color: "#888" }}>Loading returned inventory details...</div>;
  }

  return (
    <div className="returned-inventory-wrap" style={{ marginTop: "16px" }}>
      <div className="dest-cards-grid">
        {Object.keys(DESTINATION_META).map((key) => {
          const meta = DESTINATION_META[key];
          const data = aggregatedReturns[key];
          const Icon = meta.icon;
          const isActive = selectedDestination === key;

          return (
            <div
              key={key}
              className={`dest-card${isActive ? " active" : ""}`}
              onClick={() => setSelectedDestination(isActive ? null : key)}
              style={{ "--accent": meta.accent }}
            >
              <div className="dest-card-banner" style={{ background: meta.gradient }}>
                <div className="dest-card-icon">
                  <Icon size={22} />
                </div>
                <span className="dest-count-badge">
                  {data.count} Products
                </span>
              </div>
              <div className="dest-card-body">
                <h3>{data.label}</h3>
                <p>{meta.description}</p>
                <div className="dest-card-stats">
                  <div className="dest-stat-item">
                    <span className="stat-label">Total Return Qty</span>
                    <span className="stat-value" style={{ color: meta.accent }}>{data.qty} units</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDestination && (
        <div className="dest-details-section">
          <div
            className="dest-details-header"
            style={{ borderBottom: `3px solid ${DESTINATION_META[selectedDestination].accent}` }}
          >
            <h2>Returned Items Details: {currentDestinationDetails.label}</h2>
            <span className="dest-badge-total" style={{ background: DESTINATION_META[selectedDestination].gradient }}>
              {currentDestinationDetails.qty} units total
            </span>
          </div>

          {currentDestinationDetails.items.length === 0 ? (
            <div className="dest-empty-list">
              No products returned to this destination yet.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Unit</th>
                    <th>Price</th>
                    <th>Returned Qty</th>
                    {selectedDestination === 'SUPPLIER' && <th>Supplier</th>}
                    <th>Return Reasons</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDestinationDetails.items.map((item) => {
                    const fullProd = products.find((p) => p.product_id === item.product_id);
                    return (
                      <tr key={item.product_id}>
                        <td><span className="id-badge">#{item.product_id}</span></td>
                        <td className="name-cell">{item.product_name}</td>
                        <td>{fullProd ? (categoryMap.get(Number(fullProd.category_id)) || "—") : "—"}</td>
                        <td>{fullProd ? (brandMap.get(Number(fullProd.brand_id)) || "—") : "—"}</td>
                        <td>{fullProd ? (unitMap.get(Number(fullProd.unit_id)) || "—") : "—"}</td>
                        <td className="price-cell">
                          {fullProd ? `Rs. ${Number(fullProd.unit_price || 0).toFixed(2)}` : "—"}
                        </td>
                        <td style={{ fontWeight: "bold" }}>{item.quantity}</td>
                        {selectedDestination === 'SUPPLIER' && (
                          <td>
                            {item.supplier_ids && item.supplier_ids.length > 0 ? (
                              <div className="supplier-tags">
                                {item.supplier_ids.map(sid => (
                                  <span key={sid} className="supplier-tag">
                                    <span className="supplier-tag-id">#{sid}</span>
                                    <span className="supplier-tag-name">
                                      {supplierMap.get(sid) || `Supplier #${sid}`}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : "—"}
                          </td>
                        )}
                        <td>
                          <div className="reasons-list">
                            {item.reasons.map((r, idx) => (
                              <span key={idx} className="reason-tag">{r}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            className="icon-btn view"
                            title="View Product Details"
                            onClick={() => {
                              if (fullProd) {
                                setViewProduct(fullProd);
                              } else {
                                setViewProduct({
                                  product_id: item.product_id,
                                  product_name: item.product_name,
                                  status: "deleted"
                                });
                              }
                            }}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hidden print ref anchor to keep ref functional if any hook checks it */}
      <div ref={printRef} style={{ display: "none" }} />

      {viewProduct && (
        <div className="modal-overlay" onClick={() => setViewProduct(null)}>
          <div className="modal-box view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Product Details</h2>
              <div className="view-header-actions">
                {viewProduct.status !== "deleted" && (
                  <button className="export-pdf-btn" onClick={exportPDF}>
                    <FileDown size={14} /> Export PDF
                  </button>
                )}
                <button className="modal-close" onClick={() => setViewProduct(null)}>×</button>
              </div>
            </div>

            {viewProduct.status === "deleted" ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                <AlertTriangle size={48} style={{ color: "#8b3a3a", marginBottom: "1rem" }} />
                <h3>Product Discontinued</h3>
                <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                  This product has been deleted or is no longer active in the products database.
                </p>
              </div>
            ) : (
              <>
                <div className="view-section">
                  <h3 className="view-section-title">Basic Information</h3>
                  <div className="view-grid">
                    <div className="view-row">
                      <span className="view-label">Product ID</span>
                      <span className="view-value">#{viewProduct.product_id}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Product Name</span>
                      <span className="view-value">{viewProduct.product_name || "—"}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Type</span>
                      <span className="view-value">{viewProduct.type || "—"}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Batch No</span>
                      <span className="view-value">{viewProduct.batch_no || "—"}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Status</span>
                      <span className="view-value">
                        <span className={`status-pill ${String(viewProduct.status).toLowerCase()}`}>
                          {viewProduct.status || "active"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

              </>
            )}

            {/* Return Details Section */}
            {productReturnDetails.length > 0 && (
              <div className="view-section" style={{ marginTop: "16px" }}>
                <h3 className="view-section-title">Return Details & History</h3>
                <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #f0e0e0", borderRadius: "8px", padding: "8px", background: "#fff" }}>
                  {productReturnDetails.map((det, index) => (
                    <div key={index} style={{
                      padding: "12px",
                      borderBottom: index < productReturnDetails.length - 1 ? "1px solid #f0f0f0" : "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem", color: "#333" }}>{det.bill_no}</span>
                        <span style={{ fontSize: "0.8rem", color: "#888" }}>
                          {new Date(det.return_date).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.85rem" }}>
                        <div>
                          <span style={{ color: "#777" }}>Destination: </span>
                          <span style={{
                            fontWeight: "600",
                            color: DESTINATION_META[det.destination]?.accent || "#333",
                            background: DESTINATION_META[det.destination]?.light || "#eee",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem"
                          }}>
                            {DESTINATION_META[det.destination]?.label || det.destination}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "#777" }}>Quantity: </span>
                          <span style={{ fontWeight: "600", color: "#333" }}>{det.quantity} units</span>
                        </div>
                        <div>
                          <span style={{ color: "#777" }}>Refund: </span>
                          <span style={{ fontWeight: "600", color: "#333" }}>Rs. {Number(det.refund_amount || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span style={{ color: "#777" }}>Reason: </span>
                          <span style={{ fontWeight: "500", color: "#333" }}>{det.reason}</span>
                        </div>
                      </div>
                      {det.destination_note && (
                        <div style={{
                          fontSize: "0.85rem",
                          background: "#f9f9f9",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          borderLeft: "3px solid #8b3a3a",
                          marginTop: "4px",
                          wordBreak: "break-word",
                          color: "#444"
                        }}>
                          <strong style={{ color: "#555", fontSize: "0.8rem" }}>Notes:</strong> {det.destination_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
