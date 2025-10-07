import React, { useMemo, useRef, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Row,
  Col,
  Card,
  Table,
  Form,
  InputGroup,
  Button,
  Badge,
  Modal,
  Pagination,
} from "react-bootstrap";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTags,
  FaCheck,
  FaBan,
  FaSortAmountDown,
} from "react-icons/fa";

// ===== Loại dành riêng cho quần áo 2hand (apparel) =====
const TYPE_OPTIONS = [
  { value: "category", label: "Danh mục (Áo/Quần/Đầm…)" },
  { value: "brand", label: "Thương hiệu" },
  { value: "condition", label: "Tình trạng (New/Like new…)" },
  { value: "size", label: "Kích cỡ (XS–XL, số, Kid…)" },
  { value: "material", label: "Chất liệu (Cotton, Denim…)" },
  { value: "color", label: "Màu sắc" },
  { value: "fit", label: "Phom dáng (Regular, Oversize…)" },
  { value: "gender", label: "Giới tính (Nam/Nữ/Unisex)" },
  { value: "season", label: "Mùa (Xuân/Hè/Thu/Đông)" },
  { value: "pattern", label: "Hoạ tiết (Trơn, Sọc, Caro…)" },
];

// ===== Mock data for categories (phù hợp chợ đồ 2hand) =====
const mockCategories = [
  {
    id: 1,
    type: "category",
    name: "Áo sơ mi",
    slug: "ao-so-mi",
    description: "Áo sơ mi tay ngắn/tay dài",
    status: "active",
    color: "#6f42c1",
    usageCount: 128,
    createdAt: "2024-07-01",
    updatedAt: "2024-09-01",
  },
  {
    id: 2,
    type: "brand",
    name: "Uniqlo",
    slug: "uniqlo",
    description: "Thương hiệu Nhật",
    status: "active",
    color: "#e03131",
    usageCount: 87,
    createdAt: "2024-07-10",
    updatedAt: "2024-08-12",
  },
  {
    id: 3,
    type: "condition",
    name: "Like New (99%)",
    slug: "like-new-99",
    description: "Gần như mới, rất ít trầy xước",
    status: "active",
    color: "#20c997",
    usageCount: 41,
    createdAt: "2024-08-01",
    updatedAt: "2024-09-10",
  },
  {
    id: 4,
    type: "size",
    name: "L",
    slug: "size-l",
    description: "Large",
    status: "active",
    color: "#0d6efd",
    usageCount: 302,
    createdAt: "2024-07-20",
    updatedAt: "2024-09-05",
  },
  {
    id: 5,
    type: "material",
    name: "Denim",
    slug: "denim",
    description: "Bền, dày, khó nhăn",
    status: "hidden",
    color: "#495057",
    usageCount: 17,
    createdAt: "2024-08-12",
    updatedAt: "2024-08-20",
  },
];

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hiển thị" },
  { value: "hidden", label: "Đang ẩn" },
];

// ===== Helpers =====
const toSlug = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function CategoriesPage() {
  const [categories, setCategories] = useState(mockCategories);
  const idRef = useRef(
    (mockCategories?.length ? Math.max(...mockCategories.map((c) => c.id)) : 0) +
      1
  );

  // Filters / search / sort / pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt"); // name | usageCount | createdAt | updatedAt | type
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals: create/edit & delete confirm
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form, setForm] = useState({
    type: "category",
    name: "",
    slug: "",
    description: "",
    status: "active",
    color: "#0d6efd",
  });
  const [errors, setErrors] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ===== Derived list =====
  const filteredSorted = useMemo(() => {
    let list = categories.filter((c) => {
      const t = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !t ||
        c.name.toLowerCase().includes(t) ||
        c.slug.toLowerCase().includes(t) ||
        c.type.toLowerCase().includes(t) ||
        c.id.toString().includes(t);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    list.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "usageCount":
          aVal = a.usageCount;
          bVal = b.usageCount;
          break;
        case "updatedAt":
          aVal = new Date(a.updatedAt);
          bVal = new Date(b.updatedAt);
          break;
        case "type":
          aVal = a.type.toLowerCase();
          bVal = b.type.toLowerCase();
          break;
        case "createdAt":
        default:
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [categories, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredSorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredSorted.slice(startIndex, startIndex + itemsPerPage);

  // ===== CRUD actions =====
  const openCreate = () => {
    setEditing(null);
    setForm({
      type: "category",
      name: "",
      slug: "",
      description: "",
      status: "active",
      color: "#0d6efd",
    });
    setErrors({});
    setShowEditModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      type: cat.type,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      status: cat.status,
      color: cat.color || "#0d6efd",
    });
    setErrors({});
    setShowEditModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.type) e.type = "Chọn loại phù hợp (ví dụ: Danh mục, Thương hiệu…)";
    if (!form.name.trim()) e.name = "Vui lòng nhập tên";
    if (!form.slug.trim()) e.slug = "Slug không được để trống";
    if (
      categories.some(
        (c) =>
          c.slug.toLowerCase() === form.slug.toLowerCase() &&
          c.type === form.type &&
          (!editing || c.id !== editing.id)
      )
    ) {
      e.slug = "Slug đã tồn tại trong cùng loại";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const nowISO = new Date().toISOString().slice(0, 10);
    if (editing) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editing.id
            ? {
                ...c,
                type: form.type,
                name: form.name.trim(),
                slug: form.slug.trim(),
                description: form.description.trim(),
                status: form.status,
                color: form.color,
                updatedAt: nowISO,
              }
            : c
        )
      );
    } else {
      const newItem = {
        id: idRef.current++,
        type: form.type,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        status: form.status,
        color: form.color,
        usageCount: 0,
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      setCategories((prev) => [newItem, ...prev]);
      setCurrentPage(1);
    }
    setShowEditModal(false);
  };

  const confirmDelete = (cat) => {
    setDeleteTarget(cat);
    setShowDeleteModal(true);
  };

  const doDelete = () => {
    if (!deleteTarget) return;
    setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // Toggle status (quick action)
  const toggleStatus = (cat) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id
          ? {
              ...c,
              status: c.status === "active" ? "hidden" : "active",
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : c
      )
    );
  };

  // Auto slug theo name (giữ slug nếu user đã sửa tay khác với slug gốc của editing)
  const onChangeName = (val) => {
    const auto = toSlug(val);
    setForm((f) => ({
      ...f,
      name: val,
      slug:
        (editing && f.slug && f.slug !== toSlug(editing.name))
          ? f.slug
          : auto,
    }));
  };

  return (
    <AdminLayout>
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold d-flex align-items-center gap-2">
            <FaTags /> Quản lý nhãn/danh mục
          </h2>
          <p className="text-muted mb-0">
            Tạo – sửa – ẩn/hiện – xoá nhãn/danh mục cho chợ quần áo 2hand.
          </p>
        </Col>
        <Col className="text-end">
          <Button onClick={openCreate}>
            <FaPlus className="me-2" />
            Thêm nhãn/danh mục
          </Button>
        </Col>
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
                  placeholder="Tìm theo tên, slug, loại, ID…"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả loại</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">Sắp xếp theo ngày tạo</option>
                <option value="updatedAt">Sắp xếp theo ngày sửa</option>
                <option value="name">Sắp xếp theo tên</option>
                <option value="usageCount">Sắp xếp theo số lần dùng</option>
                <option value="type">Sắp xếp theo loại</option>
              </Form.Select>
            </Col>
            <Col md={1}>
              <Form.Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">↓</option>
                <option value="asc">↑</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Slug</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Lần dùng</th>
                <th>Ngày tạo</th>
                <th>Ngày sửa</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id}>
                  <td className="align-middle">{c.id}</td>
                  <td className="align-middle">
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="rounded-circle d-inline-block"
                        style={{
                          width: 10,
                          height: 10,
                          background: c.color || "#6c757d",
                        }}
                      />
                      <div>
                        <div className="fw-semibold">{c.name}</div>
                        {c.description && (
                          <div className="text-muted small">{c.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="align-middle">
                    <Badge bg="light" text="dark">
                      {c.slug}
                    </Badge>
                  </td>
                  <td className="align-middle">
                    <Badge bg="dark">{c.type}</Badge>
                  </td>
                  <td className="align-middle">
                    {c.status === "active" ? (
                      <Badge bg="success">
                        <FaCheck className="me-1" />
                        Hiển thị
                      </Badge>
                    ) : (
                      <Badge bg="secondary">
                        <FaBan className="me-1" />
                        Ẩn
                      </Badge>
                    )}
                  </td>
                  <td className="align-middle">
                    <Badge bg="info">
                      <FaSortAmountDown className="me-1" />
                      {c.usageCount}
                    </Badge>
                  </td>
                  <td className="align-middle">
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="align-middle">
                    {new Date(c.updatedAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="align-middle text-end">
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        size="sm"
                        variant={c.status === "active" ? "outline-secondary" : "success"}
                        onClick={() => toggleStatus(c)}
                      >
                        {c.status === "active" ? "Ẩn" : "Hiện"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => openEdit(c)}
                      >
                        <FaEdit className="me-1" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => confirmDelete(c)}
                      >
                        <FaTrash className="me-1" />
                        Xoá
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-5">
                    Không có mục phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
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
                  onClick={() => setCurrentPage((p) => p + 1)}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editing ? "Chỉnh sửa nhãn/danh mục" : "Thêm nhãn/danh mục"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="catType">
                  <Form.Label>Loại</Form.Label>
                  <Form.Select
                    value={form.type}
                    isInvalid={!!errors.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.type}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="catStatus">
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="active">Hiển thị</option>
                    <option value="hidden">Ẩn</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3" controlId="catName">
              <Form.Label>Tên</Form.Label>
              <Form.Control
                value={form.name}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="Ví dụ: Áo thun, Caro, Uniqlo, Like new 99%…"
                isInvalid={!!errors.name}
              />
              <Form.Control.Feedback type="invalid">
                {errors.name}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mt-3" controlId="catSlug">
              <Form.Label>Slug</Form.Label>
              <Form.Control
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: toSlug(e.target.value) }))
                }
                placeholder="vi-du: ao-thun, uniqlo, like-new-99"
                isInvalid={!!errors.slug}
              />
              <Form.Control.Feedback type="invalid">
                {errors.slug}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Dùng cho URL/định danh; tự động chuẩn hoá dấu tiếng Việt.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mt-3" controlId="catDesc">
              <Form.Label>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Mô tả ngắn gọn…"
              />
            </Form.Group>

            <Row className="g-3 mt-1">
              <Col md={6}>
                <Form.Group controlId="catColor">
                  <Form.Label>Màu nhãn</Form.Label>
                  <Form.Control
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    title="Chọn màu hiển thị cho nhãn"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Đóng
          </Button>
          <Button onClick={handleSave}>
            {editing ? "Lưu thay đổi" : "Tạo mới"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Xoá nhãn/danh mục</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteTarget ? (
            <>
              Bạn có chắc muốn xoá{" "}
              <strong>{deleteTarget.name}</strong> (ID: {deleteTarget.id})?
              <div className="text-muted small mt-2">
                * Hành động này không thể hoàn tác.
              </div>
            </>
          ) : (
            "Đang tải…"
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Huỷ
          </Button>
          <Button variant="danger" onClick={doDelete}>
            Xoá
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
