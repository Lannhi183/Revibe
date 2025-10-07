"use client"

import { useState, useEffect } from "react"
import "../../../node_modules/bootstrap/dist/css/bootstrap.min.css"
import Modal from "react-bootstrap/Modal"
import Button from "react-bootstrap/Button"
import { getAuthHeaders } from "../../utils/auth"
import "./ListingMine.css" // Added custom CSS file

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1"

const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n || 0)

const getStatusInfo = (status) => {
  switch (status) {
    case "active":
      return { text: "Đã duyệt", class: "status-approved" };
    case "pending_review":
    case "pending":
      return { text: "Chờ duyệt", class: "status-pending" };
    case "draft":
      return { text: "Nháp", class: "status-draft" };
    case "paused":
      return { text: "Tạm dừng", class: "status-paused" };
    case "sold":
      return { text: "Đã bán", class: "status-sold" };
    case "rejected":
      return { text: "Từ chối", class: "status-rejected" };
    case "removed":
      return { text: "Đã gỡ", class: "status-removed" };
    default:
      return { text: "Không xác định", class: "status-unknown" };
  }
}

const ListingMine = () => {
  // products loaded from API
  const [products, setProducts] = useState([])

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // filters & token
  const [q, setQ] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [sort, setSort] = useState("-created_at")
  const [tokenInput, setTokenInput] = useState(JSON.parse(localStorage.getItem("revibe_auth"))?.access_token)

  const buildHeaders = () => {
    return getAuthHeaders();
  }

  // fetch user's listings
const fetchListings = async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      qs.set("isYour", "true")
      if (q) qs.set("q", q)
      if (minPrice) qs.set("minPrice", minPrice)
      if (maxPrice) qs.set("maxPrice", maxPrice)
      if (sort) qs.set("sort", sort)

      const res = await fetch(`${API_BASE}/listings?${qs.toString()}`, {
        headers: buildHeaders(),
      })
      if (res.status === 401) {
        setError("Unauthorized — token missing or invalid. Paste a valid access token above and press Load.")
        setProducts([])
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body && body.error) || `HTTP ${res.status}`)
      }
      const body = await res.json()
      const arr = Array.isArray(body) ? body : body.data ?? []
      // normalize mapping to UI shape but keep full doc
      setProducts(
        arr.map((l) => ({
          ...l,
          id: l._id || l.id,
          title: l.title,
          description: l.description,
          images: l.images || [],
          price: l.price || 0,
          condition: l.attributes?.condition || "",
        }))
      )
    } catch (err) {
      setError(String(err.message || err))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenInput) {
      fetchListings()
    }
  }, [])

  // Mở modal chỉnh sửa
  const handleEdit = (product) => {
    setSelectedProduct({ ...product })
    setShowModal(true)
  }

  // Lưu thay đổi
  const handleSave = async () => {
    if (!selectedProduct) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/listings/${selectedProduct.id}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({
          title: selectedProduct.title,
          description: selectedProduct.description,
          price: selectedProduct.price,
          images: selectedProduct.images,
          attributes: { ...selectedProduct.attributes, condition: selectedProduct.condition, size: selectedProduct.size },
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body && body.error) || `HTTP ${res.status}`)
      }
      const body = await res.json()
      // update UI with returned doc
      const updated = body.data ?? body
      setProducts((prev) => prev.map((p) => (p.id === updated._id || p.id === updated.id ? { ...p, ...updated, id: updated._id || updated.id } : p)))
      setShowModal(false)
      setSelectedProduct(null)
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  // Xóa sản phẩm
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/listings/${id}`, {
        method: "DELETE",
        headers: buildHeaders(),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body && body.error) || `HTTP ${res.status}`)
      }
      // remove from UI
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadToken = () => {
    fetchListings()
  }

  return (
    <div className="listing-mine-container">
      <div className="header-section">
        <div className="container">
          <div className="row align-items-center py-3">
            <div className="col-12 d-flex align-items-center gap-3">
              <h1 className="page-title mb-0"><i className="fas fa-store me-2"></i> Sản phẩm của tôi</h1>
            </div>
          </div>
          <div className="row pt-2">
            <div className="col-12">
              <p className="page-subtitle mb-0">Quản lý và theo dõi tất cả sản phẩm bạn đã đăng bán</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-3">
        <div className="mb-3 d-flex gap-2 align-items-center">
          <input className="form-control" placeholder="Search title/description" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 300 }} />
          <input className="form-control" placeholder="Min price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={{ maxWidth: 140 }} />
          <input className="form-control" placeholder="Max price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ maxWidth: 140 }} />
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="-created_at">Newest</option>
            <option value="created_at">Oldest</option>
            <option value="-price">Price high → low</option>
            <option value="price">Price low → high</option>
            <option value="-metrics.views">Most viewed</option>
          </select>
          <button className="btn btn-primary" onClick={fetchListings}>Apply</button>
        </div>

        {loading && <div className="mb-3">Loading…</div>}
        {error && <div className="mb-3 text-danger">{error}</div>}

        <div className="row g-4">
          {products.length === 0 && !loading ? (
            <div className="col-12">
              <div className="empty-state">
                <i className="fas fa-box-open"></i>
                <h3>Chưa có sản phẩm nào</h3>
                <p>Hãy đăng sản phẩm để thử tính năng này.</p>
              </div>
            </div>
          ) : null}

          {products.map((product) => {
            const statusInfo = getStatusInfo(product.status)
            return (
              <div key={product.id} className="col-12">
                <div className="product-card">
                  <div className="product-image-container">
                    <img src={product.images?.[0] || "/placeholder.svg"} className="product-image" alt={product.title || product.name} loading="lazy" />
                    <div className={`product-status ${statusInfo.class}`}>{statusInfo.text}</div>
                  </div>

                  <div className="product-content">
                    <h5 className="product-title">{product.title || product.name}</h5>
                    <p className="product-description">{product.description}</p>

                    <div className="product-details d-flex justify-content-between align-items-center">
                      <div>
                        <div className="product-price">{fmtVND(product.price)}</div>
                        <div className="product-meta">
                          <span className="product-condition">
                            <i className="fas fa-tag me-1"></i>
                            {product.condition === "new" ? "Mới 100%" : product.condition === "like-new" ? "Như mới" : product.condition === "good" ? "Tốt" : product.condition === "fair" ? "Khá" : "Cũ"}
                          </span>
                          {product.attributes?.size && <span className="product-size ms-3"><i className="fas fa-ruler me-1"></i>Size {product.attributes.size}</span>}
                        </div>
                        <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>{product.created_at ? new Date(product.created_at).toLocaleString() : ""}</div>
                      </div>

                      <div className="product-actions d-flex flex-column">
                        <button className="btn btn-edit mb-2" onClick={() => handleEdit(product)}><i className="fas fa-edit me-2"></i>Chỉnh sửa</button>
                        <button className="btn btn-delete" onClick={() => handleDelete(product.id)}><i className="fas fa-trash me-2"></i>Xóa</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="edit-modal">
        <Modal.Header closeButton className="modal-header-custom">
          <Modal.Title><i className="fas fa-edit me-2"></i>Chỉnh sửa sản phẩm</Modal.Title>
        </Modal.Header>
        <Modal.Body className="modal-body-custom">
          {selectedProduct && (
            <form className="edit-form">
              <div className="form-group mb-3">
                <label className="form-label">Tên sản phẩm</label>
                <input type="text" className="form-control" value={selectedProduct.title || selectedProduct.name} onChange={(e) => setSelectedProduct({...selectedProduct, title: e.target.value})} />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Mô tả</label>
                <textarea className="form-control" rows="3" value={selectedProduct.description || ""} onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})} />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Giá bán (VNĐ)</label>
                  <input type="number" className="form-control" value={selectedProduct.price || 0} onChange={(e) => setSelectedProduct({...selectedProduct, price: Number.parseInt(e.target.value) || 0})} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Tình trạng</label>
                  <select className="form-select" value={selectedProduct.attributes?.condition || selectedProduct.condition || ""} onChange={(e) => {
                    const attrs = {...(selectedProduct.attributes || {}) , condition: e.target.value}
                    setSelectedProduct({...selectedProduct, attributes: attrs, condition: e.target.value})
                  }}>
                    <option value="">Chọn</option>
                    <option value="new">Mới 100%</option>
                    <option value="like-new">Như mới</option>
                    <option value="good">Tốt</option>
                    <option value="fair">Khá</option>
                    <option value="poor">Cũ</option>
                  </select>
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Hình ảnh (một hoặc nhiều, mỗi URL 1 dòng)</label>
                <textarea className="form-control" rows="3" value={(selectedProduct.images || []).join("\n")} onChange={(e) => setSelectedProduct({...selectedProduct, images: e.target.value.split("\n").map(s => s.trim()).filter(Boolean)})} />
              </div>
            </form>
          )}
        </Modal.Body>
        <Modal.Footer className="modal-footer-custom">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleSave}>Lưu thay đổi</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default ListingMine
