# Genki Cẩm Nang — Tủ sách Sống khỏe kiểu Nhật

Trang cổng thư viện điện tử (**Web Flipbook / PWA**) chia sẻ 6 bộ cẩm nang chăm sóc sức khỏe kiểu Nhật dành cho gia đình và người lớn tuổi Việt Nam (tổng cộng **262 trang sách lật 3D** và **242 mục thực hành tương tác**).

## Cấu trúc thư mục

```text
genki-camnang/
├── index.html                  # Trang chủ Tủ sách Genki Cẩm Nang (chọn & tìm kiếm 6 bộ cẩm nang)
├── catalog.json                # Danh mục dữ liệu 6 bộ cẩm nang & các tập/chương phát hành
├── qr.js                       # Bộ tạo mã QR SVG & xuất ảnh thẻ QR PNG (Offline ISO/IEC 18004)
├── manifest.json               # Cấu hình Web App Manifest (PWA)
├── wrangler.jsonc              # Cấu hình triển khai Cloudflare Workers / Assets
├── _headers                    # Cấu hình HTTP headers cho Cloudflare
├── song-khoe-kieu-nhat/        # Cẩm nang Số 1: Sống khỏe kiểu Nhật (62 trang, Tập 1–8)
│   ├── index.html              # Sách lật 3D tương tác + đóng dấu 7 ngày (済) + xuất PDF
│   ├── qr.js                   # Bộ tạo QR nội tuyến
│   ├── manifest.json           # PWA manifest của Cẩm nang Số 1
│   └── anh/                    # 54 tệp hình ảnh minh họa của cẩm nang
├── ngua-dot-quy/               # Cẩm nang Số 2: Đột quỵ — Người Nhật đã làm gì? (40 trang, Chương 1–6)
│   ├── index.html              # Sách lật 3D tương tác + Thẻ 115 + Sổ huyết áp 7 sáng + Bắt mạch 15s
│   ├── qr.js                   # Bộ tạo QR nội tuyến
│   ├── manifest.json           # PWA manifest của Cẩm nang Số 2
│   └── anh/                    # 31 tệp hình ảnh minh họa của cẩm nang
├── xuong-khop-deo-dai/         # Cẩm nang Số 3: Gân cốt dẻo dai tuổi 50+ (40 trang, Chương 1–6)
│   ├── index.html              # Sách lật 3D tương tác + Đồng hồ 60s Hồng Hạc + Sổ gân cốt + Tính Đạm + Đo CS-30
│   ├── qr.js                   # Bộ tạo QR nội tuyến
│   ├── manifest.json           # PWA manifest của Cẩm nang Số 3
│   └── anh/                    # 31 tệp hình ảnh minh họa của cẩm nang
├── an-ngon-ngu-sau/            # Cẩm nang Số 4: Ăn ngon ngủ sâu — Dưỡng tâm kiểu Nhật (40 trang, Chương 1–6)
│   ├── index.html              # Sách lật 3D tương tác + Giờ vàng sinh học + Sổ giấc ngủ + Thở Tanden + Thẻ An Tâm
│   ├── qr.js                   # Bộ tạo QR nội tuyến
│   ├── manifest.json           # PWA manifest của Cẩm nang Số 4
│   └── anh/                    # 31 tệp hình ảnh minh họa của cẩm nang
├── omega-3-tim-nao/            # Cẩm nang Số 5: Omega-3: Khỏe tim, Sáng não kiểu Nhật (40 trang, Chương 1–6)
│   ├── index.html              # Sách lật 3D tương tác + Thực đơn 3 ngày + Lịch Nō-tore + Sổ Omega-3 7 ngày
│   ├── qr.js                   # Bộ tạo QR nội tuyến
│   ├── manifest.json           # PWA manifest của Cẩm nang Số 5
│   └── anh/                    # 35 tệp hình ảnh minh họa (gồm tranh màu nước ông bà Sato & sp-omega3.webp)
└── tao-mozuku-fucoidan/        # Cẩm nang Số 6: Tảo Mozuku & Fucoidan: Lá chắn miễn dịch (40 trang, Chương 1–6)
    ├── index.html              # Sách lật 3D tương tác + Thực đơn 3 ngày + Lịch Sáng/Tối + Sổ Fucoidan 7 ngày
    ├── qr.js                   # Bộ tạo QR nội tuyến
    ├── manifest.json           # PWA manifest của Cẩm nang Số 6
    └── anh/                    # 35 tệp hình ảnh minh họa (gồm tranh màu nước ông bà Sato & sp-fucoidan.webp)
```

## Cá nhân hóa Đại lý / Nhà thuốc qua URL

Mọi trang trong `genki-camnang` đều hỗ trợ tham số URL tự động đồng bộ xuyên suốt giữa Tủ sách và từng cuốn cẩm nang:

- `?daily=Nhà thuốc Minh Tâm&zalo=0909123456`
