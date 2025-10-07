import React, { useState, useMemo } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { Row, Col, Card, Table, Form, InputGroup, Button, Badge, Modal, Pagination } from "react-bootstrap";
import { FaSearch, FaBan, FaCheck, FaCrown, FaShieldAlt, FaStar } from "react-icons/fa";

// Mock data for users
const mockUsers = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    avatar: "https://randomuser.me/api/portraits/men/31.jpg",
    status: "active",
    listings: 12,
    orders: 45,
    badges: ["verified"],
    joinDate: "2023-01-15",
    lastActive: "2024-01-15",
  },
  {
    id: 2,
    name: "Trần Thị B",
    email: "tranthib@email.com",
    avatar: "https://randomuser.me/api/portraits/women/45.jpg",
    status: "banned",
    listings: 8,
    orders: 23,
    badges: ["top_seller"],
    joinDate: "2023-03-20",
    lastActive: "2024-01-10",
  },
  {
    id: 3,
    name: "Lê Văn C",
    email: "levanc@email.com",
    avatar: "https://randomuser.me/api/portraits/men/42.jpg",
    status: "active",
    listings: 25,
    orders: 78,
    badges: ["verified", "top_seller"],
    joinDate: "2022-11-10",
    lastActive: "2024-01-16",
  },
  {
    id: 4,
    name: "Phạm Thị D",
    email: "phamthid@email.com",
    avatar: "https://randomuser.me/api/portraits/women/38.jpg",
    status: "active",
    listings: 5,
    orders: 12,
    badges: [],
    joinDate: "2023-08-05",
    lastActive: "2024-01-14",
  },
  {
    id: 5,
    name: "Hoàng Văn E",
    email: "hoangvane@email.com",
    avatar: "https://randomuser.me/api/portraits/men/29.jpg",
    status: "active",
    listings: 18,
    orders: 56,
    badges: ["verified"],
    joinDate: "2023-05-12",
    lastActive: "2024-01-15",
  },
];

const badgeConfig = {
  verified: { label: "Xác thực", color: "success", icon: FaShieldAlt },
  top_seller: { label: "Người bán xuất sắc", color: "warning", icon: FaCrown },
  premium: { label: "Premium", color: "primary", icon: FaStar },
};

export default function AdminUsers() {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const itemsPerPage = 10;

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toString().includes(searchTerm);
      
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      const matchesBadge = badgeFilter === "all" || user.badges.includes(badgeFilter);
      
      return matchesSearch && matchesStatus && matchesBadge;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "listings":
          aVal = a.listings;
          bVal = b.listings;
          break;
        case "orders":
          aVal = a.orders;
          bVal = b.orders;
          break;
        case "joinDate":
          aVal = new Date(a.joinDate);
          bVal = new Date(b.joinDate);
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [users, searchTerm, statusFilter, badgeFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Toggle user status (ban/unban)
  const toggleUserStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "banned" : "active" }
        : user
    ));
  };

  // Toggle badge
  const toggleBadge = (userId, badge) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const newBadges = user.badges.includes(badge)
          ? user.badges.filter(b => b !== badge)
          : [...user.badges, badge];
        return { ...user, badges: newBadges };
      }
      return user;
    }));
  };

  // Open badge modal
  const openBadgeModal = (user) => {
    setSelectedUser(user);
    setShowBadgeModal(true);
  };

  const getStatusBadge = (status) => {
    return status === "active" 
      ? <Badge bg="success">Hoạt động</Badge>
      : <Badge bg="danger">Bị cấm</Badge>;
  };

  const renderBadges = (badges) => {
    return badges.map(badge => {
      const config = badgeConfig[badge];
      const Icon = config.icon;
      return (
        <Badge key={badge} bg={config.color} className="me-1">
          <Icon className="me-1" />
          {config.label}
        </Badge>
      );
    });
  };

  return (
    <AdminLayout>
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">Quản lý người dùng</h2>
          <p className="text-muted">Quản lý tài khoản, trạng thái và quyền của người dùng</p>
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
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="banned">Bị cấm</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value)}
              >
                <option value="all">Tất cả badge</option>
                <option value="verified">Xác thực</option>
                <option value="top_seller">Người bán xuất sắc</option>
                <option value="premium">Premium</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sắp xếp theo tên</option>
                <option value="listings">Sắp xếp theo sản phẩm</option>
                <option value="orders">Sắp xếp theo đơn hàng</option>
                <option value="joinDate">Sắp xếp theo ngày tham gia</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Users Table */}
      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Trạng thái</th>
                <th>Sản phẩm</th>
                <th>Đơn hàng</th>
                <th>Badge</th>
                <th>Ngày tham gia</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="rounded-circle me-3"
                      />
                      <div>
                        <div className="fw-semibold">{user.name}</div>
                        <div className="text-muted small">{user.email}</div>
                        <div className="text-muted small">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{getStatusBadge(user.status)}</td>
                  <td>
                    <Badge bg="info">{user.listings}</Badge>
                  </td>
                  <td>
                    <Badge bg="secondary">{user.orders}</Badge>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {renderBadges(user.badges)}
                    </div>
                  </td>
                  <td>
                    <div className="small">
                      {new Date(user.joinDate).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant={user.status === "active" ? "danger" : "success"}
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.status === "active" ? (
                          <>
                            <FaBan className="me-1" />
                            Cấm
                          </>
                        ) : (
                          <>
                            <FaCheck className="me-1" />
                            Mở khóa
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => openBadgeModal(user)}
                      >
                        Badge
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

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

      {/* Badge Management Modal */}
      <Modal show={showBadgeModal} onHide={() => setShowBadgeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Quản lý Badge - {selectedUser?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className="d-flex flex-wrap gap-2">
              {Object.entries(badgeConfig).map(([badgeKey, config]) => {
                const Icon = config.icon;
                const hasBadge = selectedUser.badges.includes(badgeKey);
                return (
                  <Button
                    key={badgeKey}
                    variant={hasBadge ? config.color : "outline-secondary"}
                    size="sm"
                    onClick={() => toggleBadge(selectedUser.id, badgeKey)}
                    className="d-flex align-items-center"
                  >
                    <Icon className="me-1" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBadgeModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
