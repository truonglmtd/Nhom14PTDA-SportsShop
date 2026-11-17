# SPORT SHOP — Nhóm 14

Website thương mại điện tử mẫu được xây dựng dựa trên Excel backlog nhóm 14 (Theme/Epic, Product Backlog, Sprint Backlog, Map US, US).

## Tính năng
- Đăng ký, đăng nhập, đăng xuất; mật khẩu được băm bằng bcrypt.
- Cập nhật họ tên, tuổi, số điện thoại, địa chỉ; đổi mật khẩu.
- Danh sách sản phẩm, tìm kiếm, lọc theo danh mục, sắp xếp theo giá.
- Giỏ hàng, cập nhật số lượng, yêu thích sản phẩm.
- Đặt hàng COD; lưu đơn hàng và chi tiết đơn vào SQLite; giảm tồn kho.
- Xem lịch sử đơn hàng, theo dõi trạng thái.
- Nhân viên/quản trị: thêm/ẩn sản phẩm, xem và cập nhật đơn hàng, xem báo cáo doanh thu và sản phẩm bán chạy.
- SQLite tạo tự động khi khởi động, có dữ liệu sản phẩm mẫu.

## Chạy trên máy với Visual Studio Code
1. Cài Node.js 20 trở lên.
2. Giải nén file ZIP, mở thư mục `sport-shop` trong VS Code.
3. Mở Terminal trong VS Code và chạy:
   ```bash
   npm install
   npm start
   ```
4. Truy cập `http://localhost:3000`.

Tài khoản quản trị mặc định khi chạy local:
- Email: `admin@sportshop.local`
- Mật khẩu: `SportShop@123`

**Đổi mật khẩu quản trị và SESSION_SECRET trước khi đưa website công khai.** Mật khẩu mặc định chỉ dùng cho demo local.

## Xuất bản để lấy link công khai (Render)
1. Tạo tài khoản GitHub và Render.
2. Đẩy toàn bộ thư mục này lên một repository GitHub mới.
3. Trong Render, chọn **New + → Blueprint**, kết nối repository và chọn file `render.yaml`.
4. Khi được hỏi `ADMIN_PASSWORD`, nhập một mật khẩu quản trị mạnh. Đặt `ADMIN_EMAIL` thành email của bạn nếu muốn.
5. Deploy. Render cấp URL dạng `https://ten-dich-vu.onrender.com`; đợi trạng thái Live rồi mở link đó.
6. Dùng email `admin@sportshop.local` (hoặc `ADMIN_EMAIL` bạn cấu hình) và mật khẩu bạn đã nhập để vào mục Quản trị.
7. Kiểm tra Disk được gắn tại `/var/data`. Không xóa disk nếu muốn giữ database.

Lưu ý: gói hosting, disk và chính sách miễn phí của nhà cung cấp có thể thay đổi; kiểm tra giá hiện tại trước khi triển khai. URL công khai chỉ được tạo sau khi bạn deploy trên tài khoản hosting của mình.

## Database
File SQLite local nằm tại `data/sportshop.db` sau lần chạy đầu tiên. Khi deploy Render, database nằm trên disk gắn tại `/var/data/sportshop.db`.

Các bảng:
- `users`: tài khoản, hồ sơ, role.
- `categories`: danh mục.
- `products`: sản phẩm, giá, tồn kho.
- `orders`: thông tin nhận hàng, trạng thái, tổng tiền.
- `order_items`: sản phẩm/số lượng/giá tại thời điểm đặt.
- `favorites`: danh sách yêu thích.

## API chính
- `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`
- `GET /api/categories`, `GET /api/products?q=&category=`
- `PUT /api/profile`, `PUT /api/password`
- `GET /api/favorites`, `POST /api/favorites/:id`
- `POST /api/orders`, `GET /api/my-orders`
- `GET/POST /api/admin/products`, `PUT/DELETE /api/admin/products/:id`
- `GET/PATCH /api/admin/orders`, `GET /api/admin/report`

## Ghi chú
- Đây là bản đồ án/portfolio; thanh toán đang dùng COD, chưa tích hợp cổng thanh toán ngân hàng.
- Ảnh sản phẩm lấy từ URL ảnh bên ngoài, cần internet để hiển thị.
- Nếu triển khai thật cho khách hàng, cần bổ sung CSRF protection, rate limiting, xác thực email, chính sách bảo mật, sao lưu database và kiểm thử bảo mật.
