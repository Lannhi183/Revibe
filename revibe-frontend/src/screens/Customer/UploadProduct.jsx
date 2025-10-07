"use client"

import { useState } from "react"
import "../../../node_modules/bootstrap/dist/css/bootstrap.min.css"

import { Modal, Button } from "react-bootstrap"
import { FaStar, FaRegStar, FaCheckCircle } from "react-icons/fa"
import { getAuthHeaders } from "../../utils/auth"

const UploadProduct = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [images, setImages] = useState([])
  const [mainImageIndex, setMainImageIndex] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    condition: "",
    size: "",
    hashtags: "",
  })

  // Upload ảnh
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    if (images.length + files.length > 5) {
      alert("Tối đa 5 ảnh")
      return
    }

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages((prev) => [...prev, { file, url: e.target.result }])
      }
      reader.readAsDataURL(file)
    })
  }

  // Xóa ảnh
  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    if (mainImageIndex === index) setMainImageIndex(0)
  }

  // Chọn ảnh chính
  const selectMainImage = (index) => {
    setMainImageIndex(index)
  }

  // Nhập form
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Điều hướng step
  const nextStep = () => {
    if (currentStep === 1 && images.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ảnh")
      return
    }
    if (currentStep === 2) {
      const { name, description, price, condition } = formData
      if (!name || !description || !price || !condition) {
        alert("Vui lòng điền đầy đủ thông tin bắt buộc")
        return
      }
    }
    setCurrentStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1)
  }

  // Submit
  const handleSubmit = async () => {
    try {
      console.debug("UploadProduct: handleSubmit start", { formData, images });

      // prepare payload (moved inside try so sync errors are caught)
      const payload = {
        title: formData.name,
        description: formData.description,
        price: Number.parseInt(formData.price) || 0,
        currency: "VND",
        images: Array.isArray(images) ? images.map((i) => i.url) : [],
        attributes: {
          condition: formData.condition,
          size: formData.size,
        },
        hashtags: formData.hashtags ? formData.hashtags.split(" ") : [],
      };

      const res = await fetch((process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1") + "/listings", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      let body = null;
      try {
        body = await res.json();
      } catch (e) {
        /* ignore parse errors */
      }

      if (!res.ok) {
        const message = (body && body.error) ? body.error : `HTTP ${res.status}`;
        throw new Error(message);
      }

      setShowSuccess(true);
    } catch (err) {
      console.error("UploadProduct: submit error", err);
      alert("Lỗi khi upload: " + String(err));
    }
  };

  return (
    <div className="container-fluid bg-light min-vh-100">
      {/* Header */}
      <div className="d-flex align-items-center bg-white border-bottom sticky-top shadow-sm p-3">
        <button className="btn btn-outline-secondary me-3" onClick={() => window.history.back()}>
          ←
        </button>
        <h1 className="h5 fw-semibold mb-0">Đăng bán sản phẩm</h1>
      </div>

      {/* Progress Bar */}
      <div className="progress m-3" style={{ height: "8px" }}>
        <div
          className="progress-bar bg-primary"
          role="progressbar"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>

      {/* Step 1: Image Upload */}
      {currentStep === 1 && (
        <div className="card shadow-sm m-3 p-4">
          <h2 className="h5 fw-bold mb-2">Chọn ảnh sản phẩm</h2>
          <p className="text-muted small mb-3">Tối đa 5 ảnh, chọn 1 ảnh chính</p>

          <div className="d-flex gap-2 mb-3">
            {/* Upload từ thư viện */}
            <div className="flex-fill border border-2 border-secondary border-dashed rounded text-center p-3">
              <input
                type="file"
                id="image-upload"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                hidden
              />
              <label htmlFor="image-upload" className="text-primary fw-semibold" style={{ cursor: "pointer" }}>
                <div className="fs-3">📂</div>
                Chọn từ thư viện
              </label>
            </div>

            {/* Chụp trực tiếp */}
            <div className="flex-fill border border-2 border-secondary border-dashed rounded text-center p-3">
              <input
                type="file"
                id="camera-upload"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                hidden
              />
              <label htmlFor="camera-upload" className="text-success fw-semibold" style={{ cursor: "pointer" }}>
                <div className="fs-3">📷</div>
                Chụp trực tiếp
              </label>
            </div>
          </div>

          {images.length > 0 && (
            <div className="row g-2 mb-3">
              {images.map((image, index) => (
                <div key={index} className="col-4 position-relative">
                  <div className="ratio ratio-1x1">
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={`Preview ${index}`}
                      className="img-fluid rounded shadow-sm object-fit-cover"
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                    onClick={() => removeImage(index)}
                  >
                    ×
                  </button>

                  {/* Select main image */}
                  <button
                    className={`btn btn-sm position-absolute top-0 start-0 m-1 ${
                      mainImageIndex === index ? "btn-warning" : "btn-outline-light"
                    }`}
                    onClick={() => selectMainImage(index)}
                  >
                    {mainImageIndex === index ? <FaStar /> : <FaRegStar />}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary w-100" onClick={nextStep} disabled={images.length === 0}>
            Tiếp tục
          </button>
        </div>
      )}

      {/* Step 2: Product Information */}
      {currentStep === 2 && (
        <div className="card shadow-sm m-3 p-4">
          <h2 className="h5 fw-bold mb-3">Thông tin sản phẩm</h2>

          <div className="mb-3">
            <label className="form-label">Tên sản phẩm *</label>
            <input
              type="text"
              className="form-control"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              maxLength="100"
              placeholder="Nhập tên sản phẩm"
            />
            <small className="text-muted">{formData.name.length}/100</small>
          </div>

          <div className="mb-3">
            <label className="form-label">Mô tả *</label>
            <textarea
              className="form-control"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              maxLength="500"
              placeholder="Mô tả chi tiết về sản phẩm..."
            />
            <small className="text-muted">{formData.description.length}/500</small>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Giá bán *</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0"
                />
                <span className="input-group-text">VNĐ</span>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Tình trạng *</label>
              <select
                className="form-select"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
              >
                <option value="">Chọn tình trạng</option>
                <option value="new">Mới 100%</option>
                <option value="like-new">Như mới</option>
                <option value="good">Tốt</option>
                <option value="fair">Khá</option>
                <option value="poor">Cũ</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Size (nếu có)</label>
            <input
              type="text"
              className="form-control"
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              placeholder="S, M, L, XL..."
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Hashtags</label>
            <input
              type="text"
              className="form-control"
              name="hashtags"
              value={formData.hashtags}
              onChange={handleInputChange}
              placeholder="#thời_trang #vintage #sale"
            />
            <small className="text-muted">Sử dụng # để tách các hashtag</small>
          </div>

          <div className="d-grid gap-2 mt-4">
            <button className="btn btn-outline-secondary" onClick={prevStep}>
              Quay lại
            </button>
            <button className="btn btn-primary" onClick={nextStep}>
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {currentStep === 3 && (
        <div className="card shadow-sm m-3 p-4">
          <h2 className="h5 fw-bold mb-3">Xác nhận thông tin</h2>

          <div className="card mb-3">
            <img
              src={images[mainImageIndex]?.url || "/placeholder.svg"}
              alt="Main product"
              className="card-img-top"
            />
            <div className="card-body">
              <h5 className="card-title">{formData.name}</h5>
              <p className="fw-bold text-danger">
                {Number.parseInt(formData.price).toLocaleString()} VNĐ
              </p>
              <p className="text-muted">Tình trạng: {formData.condition}</p>
              {formData.size && <p className="text-muted">Size: {formData.size}</p>}
              <p>{formData.description}</p>

              {formData.hashtags && (
                <div className="d-flex flex-wrap gap-2">
                  {formData.hashtags
                    .split("#")
                    .filter((tag) => tag.trim())
                    .map((tag, index) => (
                      <span key={index} className="badge bg-info text-dark">
                        #{tag.trim()}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="d-grid gap-2">
            <button className="btn btn-outline-secondary" onClick={prevStep}>
              Quay lại
            </button>
            <button className="btn btn-success" onClick={handleSubmit}>
              Đăng bán ngay
            </button>
          </div>
        </div>
      )}

      {/* 🔔 Success Modal */}
      <Modal
        show={showSuccess}
        onHide={() => setShowSuccess(false)}
        centered
        backdrop="static"
        keyboard={false}
      >
        <div className="p-4 text-center">
          <FaCheckCircle className="text-success mb-3" size={60} />
          <h4 className="fw-bold">Đăng sản phẩm thành công 🎉</h4>
          <p className="text-muted mt-2">
            Sản phẩm của bạn sẽ được admin duyệt trong vòng <b>1–2h làm việc</b> <br />
            (giờ hành chính).
          </p>
          <div className="d-grid gap-2 mt-4">
            <Button variant="primary" onClick={() => setShowSuccess(false)}>
              OK, đã hiểu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default UploadProduct
