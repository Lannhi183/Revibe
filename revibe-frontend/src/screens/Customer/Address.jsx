// src/screens/Customer/Address.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddress } from "../../hooks/useAddress";

/* ================== validation helpers ================== */
const isNonEmpty = (v) => String(v ?? "").trim().length > 0;
const digits = (v) => String(v ?? "").replace(/\D/g, "");
const phoneValid = (v) => {
  const d = digits(v);
  return d.length >= 9 && d.length <= 11;
};
const isValidAddress = (a) =>
  isNonEmpty(a?.full_name) &&
  phoneValid(a?.phone) &&
  isNonEmpty(a?.line1) &&
  isNonEmpty(a?.ward) &&
  isNonEmpty(a?.district) &&
  isNonEmpty(a?.city);

/* ================== component ================== */
export default function Address() {
  const nav = useNavigate();
  const {
    addresses,
    loading,
    error,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    getDefaultAddress
  } = useAddress();

  // ui state
  const [mode, setMode] = useState("list"); // "list" | "detail"
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1300); };

  const onBackFromDetail = () => {
    if (!dirty) { setMode("list"); return; }
    setShowConfirmLeave(true);
  };

  // confirms
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  /* ---------- list actions ---------- */
  const setDefault = async (id) => {
    setApiLoading(true);
    const result = await setDefaultAddress(id);
    if (result.success) {
      showToast("Đã đổi địa chỉ mặc định");
    } else {
      showToast(result.error || "Có lỗi xảy ra");
    }
    setApiLoading(false);
  };

  const editAddress = (id) => {
    const found = addresses.find((x) => x._id === id);
    if (found) {
      setDraft({
        _id: found._id,
        label: found.label || "",
        full_name: found.full_name || "",
        phone: found.phone || "",
        line1: found.line1 || "",
        line2: found.line2 || "",
        ward: found.ward || "",
        district: found.district || "",
        city: found.city || "",
        country: found.country || "VN",
        is_default: found.is_default || false
      });
      setDirty(false);
      setMode("detail");
    }
  };

  const addNew = () => {
    const newAddr = {
      _id: null, // null for new address
      label: "",
      full_name: "",
      phone: "",
      line1: "",
      line2: "",
      ward: "",
      district: "",
      city: "",
      country: "VN",
      is_default: false
    };
    setDraft(newAddr);
    setDirty(true);
    setMode("detail");
  };

  /* ---------- detail actions ---------- */
  const updateDraft = (patch) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };

  const actuallyRemoveAddress = async () => {
    setApiLoading(true);
    const result = await deleteAddress(draft._id);
    if (result.success) {
      setMode("list");
      setDirty(false);
      setShowConfirmDelete(false);
      showToast("Đã xoá địa chỉ");
    } else {
      showToast(result.error || "Có lỗi xảy ra");
    }
    setApiLoading(false);
  };

  const saveAddress = async () => {
    setApiLoading(true);
    const cleaned = {
      label: String(draft.label || "").trim(),
      full_name: String(draft.full_name).trim(),
      phone: String(draft.phone).trim(),
      line1: String(draft.line1).trim(),
      line2: String(draft.line2 || "").trim(),
      ward: String(draft.ward).trim(),
      district: String(draft.district).trim(),
      city: String(draft.city).trim(),
      country: String(draft.country || "VN").trim(),
      is_default: Boolean(draft.is_default)
    };

    let result;
    if (draft._id) {
      // Update existing address
      result = await updateAddress(draft._id, cleaned);
    } else {
      // Create new address
      result = await createAddress(cleaned);
    }

    if (result.success) {
      setMode("list");
      setDirty(false);
      showToast("Đã lưu địa chỉ");
    } else {
      showToast(result.error || "Có lỗi xảy ra");
    }
    setApiLoading(false);
  };

  const cancelDiscard = () => setShowConfirmLeave(false);
  const confirmDiscard = () => {
    setShowConfirmLeave(false);
    setDirty(false);
    setMode("list");
    showToast("Đã huỷ thay đổi");
  };

  const defaultAddr = getDefaultAddress();

  /* ================== render ================== */
  if (loading && !addresses.length) {
    return (
      <div style={page}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div>Đang tải...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={page}>
        <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>
          <div>Lỗi: {error}</div>
        </div>
      </div>
    );
  }

  if (mode === "detail" && draft) {
    const isNew = !draft._id;
    const canSave = isValidAddress(draft) && !apiLoading;

    return (
      <div style={page}>
        <header style={topbar}>
          <button style={iconBtn} onClick={onBackFromDetail} aria-label="Back">←</button>
          <b>{isNew ? "Thêm địa chỉ" : "Chỉnh sửa địa chỉ"}</b>
          <div />
        </header>

        <div style={{ height: 8 }} />

        <div style={form}>
          <Field label="Nhãn địa chỉ" value={draft.label} onChange={(v) => updateDraft({ label: v })} placeholder="Nhà, Công ty..." />
          <Field required label="Người nhận" value={draft.full_name} onChange={(v) => updateDraft({ full_name: v })} />
          <Field
            required
            label="Số điện thoại"
            value={draft.phone}
            onChange={(v) => updateDraft({ phone: v })}
            inputMode="tel"
            hint={draft.phone && !phoneValid(draft.phone) ? "Nhập 9–11 chữ số" : undefined}
            invalid={Boolean(draft.phone) && !phoneValid(draft.phone)}
          />
          <Field required label="Địa chỉ chi tiết" value={draft.line1} onChange={(v) => updateDraft({ line1: v })} placeholder="Số nhà, tên đường" />
          <Field label="Địa chỉ bổ sung" value={draft.line2} onChange={(v) => updateDraft({ line2: v })} placeholder="Tòa nhà, căn hộ..." />
          <Field required label="Phường/Xã" value={draft.ward} onChange={(v) => updateDraft({ ward: v })} />
          <Field required label="Quận/Huyện" value={draft.district} onChange={(v) => updateDraft({ district: v })} />
          <Field required label="Thành phố" value={draft.city} onChange={(v) => updateDraft({ city: v })} />

          <div style={divider} />

          <label style={lb}>Đặt làm mặc định</label>
          <button
            onClick={() => updateDraft({ is_default: !draft.is_default })}
            style={radioRow}
            aria-label="Set as default"
            type="button"
          >
            <span style={{ marginRight: 10 }}>
              <Radio checked={draft.is_default} />
            </span>
            <span>Địa chỉ mặc định cho giao hàng</span>
          </button>
        </div>

        <div style={{ height: 80 }} />

        <footer
  style={{
    ...footer,
    gridTemplateColumns: isNew ? "1fr" : "1fr 1fr", // thêm mới: 1 cột, chỉnh sửa: 2 cột bằng nhau
  }}
>
  {/* Ẩn Xoá khi tạo mới */}
  {!isNew && (
    <button
      style={dangerBtn}
      onClick={() => setShowConfirmDelete(true)}
      type="button"
    >
      Xoá địa chỉ
    </button>
  )}

  {/* Hoàn thành: FULL-WIDTH chỉ khi THÊM MỚI */}
  <button
    style={{
      ...primaryBtn,
      ...(canSave ? {} : primaryBtnDisabled),
      ...(isNew ? { gridColumn: "1 / -1", width: "100%" } : {}),
    }}
    onClick={saveAddress}
    disabled={!canSave}
    aria-disabled={!canSave}
    type="button"
  >
    {apiLoading ? "Đang lưu..." : "Hoàn thành"}
  </button>
</footer>
        {/* Confirm LEAVE (huỷ thay đổi) */}
        {showConfirmLeave && (
          <Confirm
            text="Bạn có chắc muốn huỷ thay đổi?"
            sub="Các chỉnh sửa chưa lưu sẽ bị mất."
            onCancel={() => setShowConfirmLeave(false)}
            onConfirm={confirmDiscard}
          />
        )}

        {/* Confirm DELETE */}
        {showConfirmDelete && (
          <Confirm
            text="Xoá địa chỉ này?"
            sub="Bạn sẽ không thể hoàn tác thao tác này."
            onCancel={() => setShowConfirmDelete(false)}
            onConfirm={actuallyRemoveAddress}
          />
        )}

        {toast && <Toast>{toast}</Toast>}
      </div>
    );
  }

  // LIST
  return (
    <div style={page}>
      <header style={topbar}>
        <button style={iconBtn} onClick={() => nav(-1)} aria-label="Back">←</button>
        <b>Địa chỉ giao hàng</b>
        <div />
      </header>

      <div style={{ height: 8 }} />

      <div style={{ display: "grid", gap: 12, paddingBottom: 100 }}>
        {addresses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <div>Chưa có địa chỉ nào</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>Thêm địa chỉ đầu tiên của bạn</div>
          </div>
        ) : (
          addresses.map((a) => (
            <article key={a._id} style={card}>
              <button 
                style={leftRadio} 
                onClick={() => setDefault(a._id)} 
                aria-label="Chọn địa chỉ mặc định"
                disabled={apiLoading}
              >
                <Radio checked={a.is_default} />
              </button>

              <div style={{ minWidth: 0 }}>
                <div style={line1}>
                  <b style={{ fontSize: 15 }}>{a.full_name}</b>
                  {a.is_default && <span style={badge}>Mặc định</span>}
                  {a.label && <span style={labelBadge}>{a.label}</span>}
                </div>
                <div style={linePhone}>{a.phone}</div>
                <div style={line2}>
                  {[
                    a.line1,
                    a.line2,
                    a.ward,
                    a.district,
                    a.city,
                  ].filter(Boolean).join(", ")}
                </div>
              </div>

              <button 
                style={editBtn} 
                onClick={() => editAddress(a._id)} 
                aria-label="Sửa"
                disabled={apiLoading}
              >
                Sửa
              </button>
            </article>
          ))
        )}

        <button style={addBtn} onClick={addNew}>+ Thêm địa chỉ mới</button>
      </div>

      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

/* ================== sub components ================== */
function Field({ label, value, onChange, inputMode, required, hint, invalid, placeholder }) {
  return (
    <div>
      <label style={lb}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inp, ...(invalid ? inpInvalid : {}) }}
        inputMode={inputMode}
        placeholder={placeholder}
      />
      {hint && <div style={hintText}>{hint}</div>}
    </div>
  );
}

function Radio({ checked }) {
  return (
    <span style={{ ...radioBase, ...(checked ? radioOn : radioOff) }}>
      {checked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}

function Confirm({ text, sub, onCancel, onConfirm }) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{text}</div>
        {sub && <div style={{ color: "#64748b", marginBottom: 14 }}>{sub}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button style={btnGhost} onClick={onCancel}>Huỷ</button>
          <button style={btnDanger} onClick={onConfirm}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ children }) {
  return (
    <div style={toastBox}>
      {children}
    </div>
  );
}

/* ================== styles ================== */
const page = {
  maxWidth: 430,
  margin: "0 auto",
  padding: "12px 14px",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#0f172a",
};

const topbar = {
  display: "grid",
  gridTemplateColumns: "28px 1fr 28px",
  alignItems: "center",
};
const iconBtn = {
  width: 28, height: 28, borderRadius: 8,
  border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer",
};

const card = {
  display: "grid",
  gridTemplateColumns: "28px 1fr auto",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #f1f5f9",
  boxShadow: "0 6px 18px rgba(0,0,0,.06)",
};
const leftRadio = { display: "grid", placeItems: "center", background: "transparent", border: "none", cursor: "pointer" };

const line1 = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" };
const linePhone = { color: "#0f172a", fontSize: 13, fontWeight: 600, marginTop: 2 };
const line2 = { color: "#374151", fontSize: 13, marginTop: 4 };
const line3 = { color: "#64748b", fontSize: 12, marginTop: 2 };
const badge = { marginLeft: 8, background: "#e6f0ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 };
const labelBadge = { marginLeft: 4, background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: 999, fontSize: 10, fontWeight: 600 };

const radioRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 44,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  padding: "0 12px",
  cursor: "pointer",
};

const editBtn = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};
const addBtn = {
  height: 44, borderRadius: 12, border: "1px dashed #94a3b8",
  background: "#fff", cursor: "pointer", fontWeight: 800,
};

const form = { display: "grid", gap: 10, marginTop: 6 };
const lb = { display: "block", fontSize: 12, color: "#64748b", margin: "6px 2px 4px" };
const inp = {
  width: "100%", height: 42, borderRadius: 12, padding: "0 12px",
  border: "1px solid #e5e7eb", outline: "none", background: "#fff",
  fontSize: 14,
};
const inpInvalid = {
  borderColor: "#ef4444",
  boxShadow: "0 0 0 3px rgba(239,68,68,.12)",
};
const hintText = { marginTop: 4, fontSize: 11.5, color: "#ef4444" };
const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };

const typeRow = { display: "flex", gap: 8, flexWrap: "wrap" };
const chip = { border: "1px solid #e5e7eb", borderRadius: 999, padding: "8px 12px", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 };
const chipOn = { background: "#eef2ff", borderColor: "#2563eb", color: "#1d4ed8", boxShadow: "0 2px 8px rgba(37,99,235,.18)" };

const divider = { height: 1, background: "#eef2ff", margin: "8px 0" };

const radioBase = {
  width: 22, height: 22, borderRadius: "50%",
  display: "grid", placeItems: "center",
  boxSizing: "border-box",
  lineHeight: 0,
};
const radioOn  = { background: "#2563eb", border: "2px solid #2563eb", boxShadow: "0 2px 10px rgba(37,99,235,.25)" };
const radioOff = { background: "#fff",     border: "2px solid #2563eb", boxShadow: "0 2px 8px rgba(37,99,235,.12)" };

const footer = {
  position: "fixed",
  left: "50%", transform: "translateX(-50%)",
  bottom: "calc(72px + 10px + env(safe-area-inset-bottom))", // chừa BottomTab
  width: "min(430px, 92%)",
  display: "grid",
  gap: 10,
};
const dangerBtn = {
  height: 46, borderRadius: 12, border: "1px solid #fecaca",
  background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: "pointer"
};
const primaryBtn = {
  height: 46, borderRadius: 12, border: "none",
  background: "#2563eb", color: "#fff",
  fontWeight: 800, cursor: "pointer",
  boxShadow: "0 12px 22px rgba(37,99,235,.35)",
  outline: "none",
};
const primaryBtnDisabled = { opacity: .5, cursor: "not-allowed", boxShadow: "none" };

/* confirm modal */
const overlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,.32)", display: "grid", placeItems: "center", zIndex: 1000 };
const modal = { width: "min(420px,90%)", background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,.25)" };
const btnGhost = { height: 42, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 800, cursor: "pointer" };
const btnDanger = { height: 42, borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontWeight: 800, cursor: "pointer" };

/* toast */
const toastBox = {
  position: "fixed",
  left: "50%", transform: "translateX(-50%)",
  bottom: "calc(72px + 16px + env(safe-area-inset-bottom))",
  background: "#111827", color: "#fff",
  borderRadius: 12, padding: "10px 14px",
  fontWeight: 700, fontSize: 13.5,
  boxShadow: "0 14px 30px rgba(0,0,0,.28)",
};
