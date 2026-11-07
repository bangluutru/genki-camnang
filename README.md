# Genki Cẩm Nang — Tủ sách Sống khỏe kiểu Nhật

Trang cổng thư viện điện tử (**Web Flipbook / PWA**) chia sẻ các bộ cẩm nang chăm sóc sức khỏe kiểu Nhật dành cho gia đình và người lớn tuổi Việt Nam.

## Cấu trúc thư mục

```text
genki-camnang/
├── index.html                  # Trang chủ Tủ sách Genki Cẩm Nang (chọn & tìm kiếm cẩm nang)
├── catalog.json                # Danh mục dữ liệu các bộ cẩm nang & tập phát hành
├── qr.js                       # Bộ tạo mã QR SVG & xuất ảnh thẻ QR PNG (Offline ISO/IEC 18004)
├── manifest.json               # Cấu hình Web App Manifest (PWA)
├── wrangler.jsonc              # Cấu hình triển khai Cloudflare Workers / Assets
├── _headers                    # Cấu hình HTTP headers cho Cloudflare
├── song-khoe-kieu-nhat/        # Cẩm nang Số 1: Sống khỏe kiểu Nhật (62 trang, Tập 1–8)
│   ├── index.html              # Sách lật 3D tương tác + đóng dấu 7 ngày (済) + xuất PDF
│   ├── qr.js                   # Bộ tạo QR nội tuyến
│   ├── manifest.json           # PWA manifest của Cẩm nang Số 1
│   └── anh/                    # 54 tệp hình ảnh minh họa của cẩm nang
└── ngua-dot-quy/               # Cẩm nang Số 2: Đột quỵ — Người Nhật đã làm gì? (40 trang, Chương 1–6)
    ├── index.html              # Sách lật 3D tương tác + Thẻ 115 + Sổ huyết áp 7 sáng + xuất PDF
    ├── qr.js                   # Bộ tạo QR nội tuyến
    ├── manifest.json           # PWA manifest của Cẩm nang Số 2
    └── anh/                    # 31 tệp hình ảnh minh họa của cẩm nang
```

## Cách thêm một bộ Cẩm nang mới

1. Tạo thư mục mới cùng cấp với `song-khoe-kieu-nhat/`, ví dụ `xuong-khop-deo-dai/index.html`.
2. Mở tệp `catalog.json`, cập nhật mục tương ứng trong mảng `books`:
   - Đổi `"status": "published"`
   - Thêm đường dẫn `"path": "xuong-khop-deo-dai/"`
3. Chạy lệnh đẩy lên GitHub và triển khai Cloudflare Pages:
   ```bash
   git add .
   git commit -m "feat: add new handbook"
   git push
   npx wrangler pages deploy . --project-name=genki-camnang
   ```

## Cá nhân hóa Đại lý / Nhà thuốc qua URL

Mọi trang trong `genki-camnang` đều hỗ trợ tham số URL tự động đồng bộ xuyên suốt giữa Tủ sách và từng cuốn cẩm nang:

- `?daily=Nhà thuốc Minh Tâm&zalo=0909123456`
