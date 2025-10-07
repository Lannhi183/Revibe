import React, { useState, useMemo } from "react";
import { getAuthHeaders } from '../../utils/auth';
import AdminLayout from "../../layouts/AdminLayout";
import { Row, Col, Card, Button, Modal, Form, Badge, Pagination, InputGroup, Table, Carousel } from "react-bootstrap";
import { FaSearch, FaCheck, FaTimes, FaFilter, FaList, FaClock, FaCheckCircle, FaTimesCircle, FaSort } from "react-icons/fa";

// listings are loaded from backend for admin

const statusConfig = {
  pending_review: { label: "Chờ duyệt", variant: "warning" },
  active: { label: "Đã duyệt", variant: "success" },
  rejected: { label: "Từ chối", variant: "danger" },
  draft: { label: "Nháp", variant: "secondary" },
  paused: { label: "Tạm dừng", variant: "secondary" },
  sold: { label: "Đã bán", variant: "dark" },
  removed: { label: "Đã gỡ", variant: "dark" },
};

export default function ListingQueue() {
  const [listings, setListings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dateListed");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailListing, setSelectedDetailListing] = useState(null);
  const [error, setError] = useState(null);
  const itemsPerPage = 5;

  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1";

  // Use shared helper so token format (localStorage.revibe_auth) is respected across the app
  const buildHeaders = () => getAuthHeaders();

  const fetchListings = async (opts = {}) => {
    setError(null);
    try {
      const qs = new URLSearchParams();
      // admin wants to see everything by default
      qs.set("status", opts.status || "all");
      if (searchTerm) qs.set("q", searchTerm);
      const res = await fetch(`${API_BASE}/listings?${qs.toString()}`, { headers: buildHeaders() });
      if (!res.ok) {
        // try to read body for helpful message
        let txt = null;
        try { txt = await res.text(); } catch(e) { /* ignore */ }
        const msg = `HTTP ${res.status}` + (txt ? ` - ${txt}` : "");
        throw new Error(msg);
      }
      const body = await res.json();
      const arr = Array.isArray(body) ? body : body.data ?? [];
      setListings(
        arr.map((l) => ({
          id: l._id || l.id,
          name: l.title || l.name,
          description: l.description || "",
          image: (l.images && l.images[0]) || l.image || "/placeholder.svg",
          images: l.images || [],
          price: l.price || 0,
          seller: (l.seller_id && (l.seller_id.name || l.seller_id.email)) || (l.seller || ""),
          dateListed: l.created_at || l.dateListed || l.createdAt || new Date().toISOString(),
          status: l.status,
          declineReason: l.moderation?.reason || l.declineReason || null,
          hashtags: l.hashtags || l.attributes?.style_tags || [],
        }))
      );
    } catch (err) {
      console.error("Failed to load listings", err);
      setError(String(err.message || err));
    }
  };

  // initial load
  React.useEffect(() => { fetchListings(); }, [searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = listings.length;
    const pending = listings.filter(l => l.status === "pending_review").length;
    const approved = listings.filter(l => l.status === "active").length;
    const rejected = listings.filter(l => l.status === "rejected").length;

    return [
      { label: "Tổng sản phẩm", value: total, icon: FaList, color: "primary" },
      { label: "Chờ duyệt", value: pending, icon: FaClock, color: "warning" },
      { label: "Đã duyệt", value: approved, icon: FaCheckCircle, color: "success" },
      { label: "Từ chối", value: rejected, icon: FaTimesCircle, color: "danger" },
    ];
  }, [listings]);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let filtered = listings.filter(listing => {
      const matchesSearch =
        listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.seller.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || listing.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort listings
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "seller":
          aVal = a.seller;
          bVal = b.seller;
          break;
        case "dateListed":
          aVal = new Date(a.dateListed);
          bVal = new Date(b.dateListed);
          break;
        default:
          aVal = new Date(a.dateListed);
          bVal = new Date(b.dateListed);
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [listings, searchTerm, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedListings = filteredListings.slice(startIndex, startIndex + itemsPerPage);

  // Handle approval
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/listings/${id}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({ status: "active", moderation: { state: "approved", reason: null } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json().catch(() => null);
      // update UI using returned doc if available
      const updated = body?.data ?? body ?? null;
      if (updated) {
        setListings((prev) => prev.map((l) => (l.id === (updated._id || updated.id) ? { ...l, status: updated.status } : l)));
      } else {
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "active", declineReason: null } : l)));
      }
    } catch (err) {
      console.error("Approve failed", err);
      // optimistic fallback
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "active", declineReason: null } : l)));
    }
  };

  // Handle reject button click
  const handleRejectClick = (listing) => {
    setSelectedListing(listing);
    setDeclineReason(listing.declineReason || "");
    setShowRejectModal(true);
  };

  // Handle actual rejection with reason
  const handleReject = () => {
    if (!declineReason.trim()) return;
    const id = selectedListing?.id;
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/listings/${id}`, {
          method: "PUT",
          headers: buildHeaders(),
          body: JSON.stringify({ status: "rejected", moderation: { state: "rejected", reason: declineReason } }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json().catch(() => null);
        const updated = body?.data ?? body ?? null;
        if (updated) {
          setListings((prev) => prev.map((l) => (l.id === (updated._id || updated.id) ? { ...l, status: updated.status, declineReason: declineReason } : l)));
        } else {
          setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "rejected", declineReason: declineReason } : l)));
        }
      } catch (err) {
        console.error("Reject failed", err);
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "rejected", declineReason: declineReason } : l)));
      } finally {
        setShowRejectModal(false);
        setDeclineReason("");
        setSelectedListing(null);
      }
    })();
  };

  // Handle view detail
  const handleViewDetail = (listing) => {
    setSelectedDetailListing(listing);
    setShowDetailModal(true);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const config = statusConfig[status];
    if (!config) return <Badge bg="secondary">{status || 'unknown'}</Badge>;
    return <Badge bg={config.variant}>{config.label}</Badge>;
  };

  return (
    <AdminLayout>
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">Duyệt sản phẩm</h2>
          <p className="text-muted">Quản lý các sản phẩm chờ duyệt trên nền tảng</p>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Card className="border-danger">
              <Card.Body className="text-danger">Lỗi khi tải danh sách sản phẩm: {error}</Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Statistics Grid */}
      <Row className="g-4 mb-4">
        {stats.map((stat) => (
          <Col key={stat.label} xs={12} sm={6} md={3}>
            <Card className="shadow-sm h-100">
              <Card.Body className="text-center">
                <stat.icon size={32} className={`text-${stat.color} mb-2`} />
                <Card.Title className="fs-4 fw-semibold text-primary mb-2">{stat.value}</Card.Title>
                <Card.Text className="text-muted mb-0">{stat.label}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm kiếm theo tên, mô tả, người bán..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <InputGroup>
                <InputGroup.Text>
                  <FaFilter />
                </InputGroup.Text>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending_review">Chờ duyệt</option>
                  <option value="active">Đã duyệt</option>
                  <option value="rejected">Từ chối</option>
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSort />
                </InputGroup.Text>
                <Form.Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="dateListed">Sắp xếp theo ngày</option>
                  <option value="name">Sắp xếp theo tên</option>
                  <option value="price">Sắp xếp theo giá</option>
                  <option value="seller">Sắp xếp theo người bán</option>
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Listings Table */}
      <Card>
        <Card.Body>
          {paginatedListings.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-muted">Không tìm thấy sản phẩm nào phù hợp với bộ lọc.</div>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Người bán</th>
                  <th>Ngày đăng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedListings.map((listing) => (
                  <tr 
                    key={listing.id}
                    onClick={() => handleViewDetail(listing)}
                    style={{ cursor: 'pointer' }}
                    className="table-hover-row"
                  >
                    <td>
                      <div className="d-flex align-items-center">
                        <img
                          src={listing.image}
                          alt={listing.name}
                          width={48}
                          height={48}
                          className="rounded me-3 border"
                          style={{ objectFit: "cover" }}
                        />
                        <div>
                          <div className="fw-semibold">{listing.name}</div>
                          <div className="text-muted small">{listing.description}</div>
                          {listing.status === "rejected" && listing.declineReason && (
                            <div className="text-danger small mt-1">
                              <strong>Lý do:</strong> {listing.declineReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-primary">{listing.price.toLocaleString()}₫</div>
                    </td>
                    <td>
                      <div className="small">{listing.seller}</div>
                    </td>
                    <td>
                      <div className="small">
                        {new Date(listing.dateListed).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td>{getStatusBadge(listing.status)}</td>
                    <td>
                      {listing.status === "pending_review" ? (
                        <div className="d-flex gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleApprove(listing.id); }}
                          >
                            <FaCheck className="me-1" />
                            Duyệt
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleRejectClick(listing); }}
                          >
                            <FaTimes className="me-1" />
                            Từ chối
                          </Button>
                        </div>
                        ) : (
                        <div className="small text-muted">
                          {listing.status === "active" ? "Đã duyệt" : (listing.status === 'rejected' ? 'Đã từ chối' : listing.status)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {Array.from({ length: totalPages }, (_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Từ chối sản phẩm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedListing && (
            <div className="mb-3">
              <h6>{selectedListing.name}</h6>
              <p className="text-muted small mb-0">Người bán: {selectedListing.seller}</p>
            </div>
          )}
          <Form.Group controlId="declineReason">
            <Form.Label>Lý do từ chối <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Nhập lý do từ chối sản phẩm..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              isInvalid={!declineReason.trim()}
            />
            <Form.Control.Feedback type="invalid">
              Vui lòng nhập lý do từ chối.
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Hủy
          </Button>
          <Button 
            variant="danger" 
            onClick={handleReject}
            disabled={!declineReason.trim()}
          >
            Từ chối sản phẩm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => { setShowDetailModal(false); setSelectedDetailListing(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết sản phẩm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDetailListing && (
            <>

              <Carousel>
                {selectedDetailListing.images.map((img, index) => (
                  <Carousel.Item key={index}>
                    <img
                      src={img}
                      alt={`${selectedDetailListing.name} ${index + 1}`}
                      style={{ width: '300px', height: '300px', objectFit: 'cover', display: 'block', margin: '0 auto' }}
                    />
                  </Carousel.Item>
                ))}
              </Carousel>
              <div className="mt-3">
                <h5>{selectedDetailListing.name}</h5>
                <p className="text-primary fw-bold fs-5">{selectedDetailListing.price.toLocaleString()}₫</p>
                <p>{selectedDetailListing.description}</p>
                <p><strong>Người bán:</strong> {selectedDetailListing.seller}</p>
                <p><strong>Ngày đăng:</strong> {new Date(selectedDetailListing.dateListed).toLocaleDateString('vi-VN')}</p>
                {selectedDetailListing.status && (
                  <Badge bg={statusConfig[selectedDetailListing.status]?.variant || 'secondary'}>
                    {statusConfig[selectedDetailListing.status]?.label || selectedDetailListing.status}
                  </Badge>
                )}
                {selectedDetailListing.declineReason && (
                  <p className="text-danger mt-2"><strong>Lý do từ chối:</strong> {selectedDetailListing.declineReason}</p>
                )}
              </div>
              {selectedDetailListing.hashtags && selectedDetailListing.hashtags.length > 0 && (
                <div className="mt-3">
                  <strong>Hashtags:</strong>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {selectedDetailListing.hashtags.map((tag, index) => (
                      <Badge key={index} bg="info">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowDetailModal(false); setSelectedDetailListing(null); }}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
