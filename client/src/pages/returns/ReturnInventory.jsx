import React, { useEffect, useMemo, useRef, useState } from "react";
import { Package, Wrench, Truck, AlertTriangle, Eye, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import "../../styles/Products.css";

export default function ReturnInventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const printRef = useRef(null);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoryRes, brandsRes, unitsRes, returnsRes] = await Promise.all([
        api.get("/products"),
        api.get("/category"),
        api.get("/brands"),
        api.get("/units"),
        api.get("/returns").catch(() => ({ data: { data: [] } }))
      ]);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
      setUnits(Array.isArray(unitsRes.data) ? unitsRes.data : []);
      const returnData = returnsRes.data?.data ?? returnsRes.data;
      setReturns(Array.isArray(returnData) ? returnData : []);
    } catch (error) {
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [Number(c.category_id), c.category_name])), [categories]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [Number(b.brand_id), b.brand_name])), [brands]);
  const unitMap = useMemo(() => new Map(units.map((u) => [Number(u.unit_id), u.unit_name])), [units]);

  const aggregatedReturns = useMemo(() => {
    const dests = {
      STOCK: { key: 'STOCK', label: 'Back to Stock', count: 0, qty: 0, items: [] },
      REPAIR: { key: 'REPAIR', label: 'Send to Repair', count: 0, qty: 0, items: [] },
      SUPPLIER: { key: 'SUPPLIER', label: 'Send to Supplier', count: 0, qty: 0, items: [] },
      DAMAGED_STOCK: { key: 'DAMAGED_STOCK', label: 'Damaged Stock', count: 0, qty: 0, items: [] }
    };

    returns.forEach(ret => {
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
            } else {
              dests[dest].items.push({
                product_id: item.product_id,
                product_name: item.product?.product_name || products.find(p => p.product_id === item.product_id)?.product_name || `Product #${item.product_id}`,
                quantity: item.return_quantity,
                reasons: item.return_reason ? [item.return_reason] : []
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
  }, [returns, products]);

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

  const exportPDF = () => {
    const printContent = printRef.current;
    if (!viewProduct) return;
    const win = window.open("", "_blank", "width=800,height=700");
    win.document.write(`
			<!DOCTYPE html><html><head><title>Product Details — #${viewProduct.product_id}</title>
			<style>
				* { margin: 0; padding: 0; box-sizing: border-box; }
				body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #222; padding: 36px; }
				.pdf-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #8b3a3a; padding-bottom: 16px; margin-bottom: 24px; }
				.pdf-header h1 { font-size: 22px; color: #8b3a3a; font-weight: 700; }
				.pdf-header p { font-size: 12px; color: #888; margin-top: 4px; }
				.pdf-meta { text-align: right; font-size: 12px; color: #888; }
				.section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8b3a3a; margin: 20px 0 8px; border-bottom: 1px solid #f0e0e0; padding-bottom: 4px; }
				table { width: 100%; border-collapse: collapse; }
				tr:nth-child(even) td { background: #fdf8f8; }
				td { padding: 9px 14px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
				td:first-child { color: #777; font-weight: 600; width: 42%; }
				td:last-child { color: #222; font-weight: 500; }
				.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
				.badge.active { background: #e5f7eb; color: #1d7e42; }
				.badge.inactive { background: #f8e7e7; color: #a13232; }
				.footer { margin-top: 32px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #f0f0f0; padding-top: 12px; }
			</style></head><body>
			<div class="pdf-header">
				<div><h1>Product Details</h1><p>Hardware POS System</p></div>
				<div class="pdf-meta">Generated: ${new Date().toLocaleString()}</div>
			</div>
			<div class="section-title">Basic Information</div>
			<table>
				<tr><td>Product ID</td><td>#${viewProduct.product_id}</td></tr>
				<tr><td>Product Name</td><td>${viewProduct.product_name || "—"}</td></tr>
				<tr><td>Type</td><td>${viewProduct.type || "—"}</td></tr>
				<tr><td>Batch No</td><td>${viewProduct.batch_no || "—"}</td></tr>
				<tr><td>Status</td><td><span class="badge ${String(viewProduct.status).toLowerCase()}">${viewProduct.status || "active"}</span></td></tr>
			</table>
			<div class="section-title">Classification</div>
			<table>
				<tr><td>Category</td><td>${categoryMap.get(Number(viewProduct.category_id)) || "—"}</td></tr>
				<tr><td>Brand</td><td>${brandMap.get(Number(viewProduct.brand_id)) || "—"}</td></tr>
				<tr><td>Unit</td><td>${unitMap.get(Number(viewProduct.unit_id)) || "—"}</td></tr>
			</table>
			<div class="section-title">Pricing</div>
			<table>
				<tr><td>Unit Price</td><td>Rs. ${Number(viewProduct.unit_price || 0).toFixed(2)}</td></tr>
				<tr><td>Cost Price</td><td>Rs. ${Number(viewProduct.cost_price || 0).toFixed(2)}</td></tr>
			</table>
			<div class="section-title">Stock Details</div>
			<table>
				<tr><td>Stock Quantity</td><td>${viewProduct.stock_quantity ?? 0}</td></tr>
				<tr><td>Min Stock</td><td>${viewProduct.min_stock_quantity ?? 0}</td></tr>
				<tr><td>Reorder Level</td><td>${viewProduct.reorder_level ?? 0}</td></tr>
			</table>
			<div class="footer">This document was generated from Hardware POS System &bull; Product #${viewProduct.product_id}</div>
			</body></html>
		`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
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
            <h2>Returned Items Details: {aggregatedReturns[selectedDestination].label}</h2>
            <span className="dest-badge-total" style={{ background: DESTINATION_META[selectedDestination].gradient }}>
              {aggregatedReturns[selectedDestination].qty} units total
            </span>
          </div>

          {aggregatedReturns[selectedDestination].items.length === 0 ? (
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
                    <th>Stock Qty</th>
                    <th>Returned Qty</th>
                    <th>Return Reasons</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedReturns[selectedDestination].items.map((item) => {
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
                        <td>
                          {fullProd ? (
                            <span className={`stock-badge ${fullProd.stock_quantity <= fullProd.min_stock_quantity ? "low" : ""}`}>
                              {fullProd.stock_quantity ?? 0}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ fontWeight: "bold" }}>{item.quantity}</td>
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

                <div className="view-section">
                  <h3 className="view-section-title">Classification</h3>
                  <div className="view-grid">
                    <div className="view-row">
                      <span className="view-label">Category</span>
                      <span className="view-value">{categoryMap.get(Number(viewProduct.category_id)) || "—"}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Brand</span>
                      <span className="view-value">{brandMap.get(Number(viewProduct.brand_id)) || "—"}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Unit</span>
                      <span className="view-value">{unitMap.get(Number(viewProduct.unit_id)) || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="view-section">
                  <h3 className="view-section-title">Pricing</h3>
                  <div className="view-grid">
                    <div className="view-row">
                      <span className="view-label">Unit Price</span>
                      <span className="view-value">Rs. {Number(viewProduct.unit_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Cost Price</span>
                      <span className="view-value">Rs. {Number(viewProduct.cost_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="view-section">
                  <h3 className="view-section-title">Stock Details</h3>
                  <div className="view-grid">
                    <div className="view-row">
                      <span className="view-label">Stock Quantity</span>
                      <span className="view-value">{viewProduct.stock_quantity ?? 0}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Min Stock</span>
                      <span className="view-value">{viewProduct.min_stock_quantity ?? 0}</span>
                    </div>
                    <div className="view-row">
                      <span className="view-label">Reorder Level</span>
                      <span className="view-value">{viewProduct.reorder_level ?? 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
