import React from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { Row, Col, Card, ProgressBar, Image, Badge } from "react-bootstrap";
import { FaCrown, FaStar, FaRegStar } from "react-icons/fa";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

// Thống kê
const stats = [
  { label: "Tổng số người dùng", value: 1240 },
  { label: "Sản phẩm đang hoạt động", value: 312 },
  { label: "Đơn hàng hôm nay", value: 58 },
  { label: "Doanh thu (hôm nay)", value: "$2,340" },
];

// Dữ liệu biểu đồ
const ordersWeek = [
  { name: "T2", orders: 20 },
  { name: "T3", orders: 40 },
  { name: "T4", orders: 35 },
  { name: "T5", orders: 50 },
  { name: "T6", orders: 65 },
  { name: "T7", orders: 80 },
  { name: "CN", orders: 55 },
];
const revenueWeek = [
  { name: "T2", revenue: 200 },
  { name: "T3", revenue: 400 },
  { name: "T4", revenue: 350 },
  { name: "T5", revenue: 500 },
  { name: "T6", revenue: 650 },
  { name: "T7", revenue: 800 },
  { name: "CN", revenue: 550 },
];
const pieData = [
  { name: "Đã duyệt", value: 312 },
  { name: "Chờ duyệt", value: 8 },
  { name: "Từ chối", value: 10 },
];
const pieColors = ["#4ade80", "#facc15", "#f87171"];

// Sản phẩm chờ duyệt (mock)
const pendingProducts = [
  {
    id: 1,
    name: "Áo thun vintage",
    price: 120000,
    image: "https://notionvn.com/wp-content/uploads/2025/06/vn-11134201-7ra0g-ma27wq0ql5qcce.webp",
    description: "Áo thun unisex, form rộng",
  },
  {
    id: 2,
    name: "Quần jeans",
    price: 250000,
    image: "https://4menshop.com/images/thumbs/2022/05/quan-jeans-slimfit-qj048-mau-xanh-16793.JPG",
    description: "Quần jeans slim fit",
  },
];

// Feedback 3* trở xuống (mock)
const lowFeedbacks = [
  {
    id: 1,
    user: "Nguyễn Văn A",
    avatar: "https://randomuser.me/api/portraits/men/31.jpg",
    rating: 2,
    comment: "Sản phẩm không giống mô tả, giao hàng chậm.",
  },
  {
    id: 2,
    user: "Trần Thị B",
    avatar: "https://randomuser.me/api/portraits/women/45.jpg",
    rating: 3,
    comment: "Chất lượng tạm ổn, đóng gói chưa kỹ.",
  },
];

const topSeller = {
  name: "Mai Anh",
  avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  sales: 128,
  revenue: "$1,200",
};

export default function AdminDashboard() {
  return (
    <AdminLayout>
      {/* Header */}
      <Row className="align-items-center mb-4">
        <Col xs="auto">
          <Image
            src="https://randomuser.me/api/portraits/men/32.jpg"
            roundedCircle
            width={64}
            height={64}
            alt="Ảnh đại diện Admin"
            className="border border-2 border-primary"
          />
        </Col>
        <Col>
          <h2 className="mb-0 fw-bold">Bảng điều khiển quản trị</h2>
          <div className="text-secondary">Chào mừng trở lại, Quản trị viên!</div>
        </Col>
      </Row>

      {/* Statistics Grid */}
      <Row className="g-4 mb-4">
        {stats.map((stat) => (
          <Col key={stat.label} xs={12} sm={6} md={3}>
            <Card className="shadow-sm h-100">
              <Card.Body>
                <Card.Title className="fs-4 fw-semibold text-primary mb-2">{stat.value}</Card.Title>
                <Card.Text className="text-muted">{stat.label}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Section */}
      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title className="mb-3">Đơn hàng trong tuần</Card.Title>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ordersWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#2563eb" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title className="mb-3">Doanh thu trong tuần</Card.Title>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="shadow-sm h-100 text-center">
            <Card.Body>
              <Card.Title className="mb-3">Tỉ lệ sản phẩm</Card.Title>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card className="shadow-sm h-100 text-center">
            <Card.Body>
              <FaCrown size={32} className="text-warning mb-2" />
              <Image
                src={topSeller.avatar}
                roundedCircle
                width={72}
                height={72}
                alt="Người bán xuất sắc"
                className="border border-2 border-success mb-2"
              />
              <h5 className="fw-bold mb-1">{topSeller.name}</h5>
              <div className="text-muted mb-2">Người bán xuất sắc trong tuần</div>
              <div className="mb-1">Số đơn: <span className="fw-semibold">{topSeller.sales}</span></div>
              <div className="mb-2">Doanh thu: <span className="fw-semibold text-success">{topSeller.revenue}</span></div>
              <ProgressBar now={topSeller.sales} max={150} label={`${topSeller.sales}`} variant="success" />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pending Products & Low Feedback */}
      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title className="mb-3">Sản phẩm chờ duyệt</Card.Title>
              {pendingProducts.length === 0 ? (
                <div className="text-muted">Không có sản phẩm nào chờ duyệt.</div>
              ) : (
                <Row className="g-2">
                  {pendingProducts.map((p) => (
                    <Col xs={12} key={p.id} className="d-flex align-items-center mb-2">
                      <Image src={p.image} alt={p.name} width={56} height={56} rounded className="me-3 border" />
                      <div className="flex-grow-1 text-start">
                        <div className="fw-semibold">{p.name}</div>
                        <div className="text-muted small">{p.description}</div>
                        <Badge bg="warning" text="dark">Chờ duyệt</Badge>
                      </div>
                      <div className="fw-bold text-primary ms-2">{p.price.toLocaleString()}₫</div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title className="mb-3">Feedback 3★ trở xuống</Card.Title>
              {lowFeedbacks.length === 0 ? (
                <div className="text-muted">Không có feedback nào dưới 4★.</div>
              ) : (
                <Row className="g-2">
                  {lowFeedbacks.map((fb) => (
                    <Col xs={12} key={fb.id} className="d-flex align-items-center mb-2">
                      <Image src={fb.avatar} alt={fb.user} width={48} height={48} roundedCircle className="me-3 border" />
                      <div className="flex-grow-1 text-start">
                        <div className="fw-semibold">{fb.user}</div>
                        <div className="text-warning mb-1">
                          {Array.from({ length: 5 }).map((_, i) =>
                            i < fb.rating ? <FaStar key={i} /> : <FaRegStar key={i} />
                          )}
                        </div>
                        <div className="text-muted small">{fb.comment}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}
