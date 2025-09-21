# SRS Management & Test Case Generator

## 📌 UI

### `srs-workspace.tsx`
- Khi ấn **Generate Test Cases** → gọi API backend.  
- Thêm button **View Test Cases**.  
- Tuỳ chỉnh `file_path` của PDF:  
  - Hiện tại:
    ```json
    { "uploads/srsDocument/file.pdf" } --> backend gentestcase không hoạt động được
    ```
  - Cần lấy:
    ```json
    { "C:/project/uploads/srsDocument/file.pdf" } --> post cho backend để lấy url thực trong local
    ```
- Thêm nút thêm file path thủ công: VAnh xây thêm hàm lấy local url thực trong backend java hộ nhé. T mò bị lỗi

### `srs-management.tsx`
- Chỉnh response.data thành `as any`.

### `srs-upload-screen.tsx`
- Thêm debug log.
- Thêm file sẽ lỗi khi ấn continue nhưng load lại sẽ hiện vào trong Open Existing SRS

### `test-cases-viewer.tsx`
- Hiển thị **Scenario UI**.

### `json-viewer.tsx`
- Hiển thị **Scenario dạng JSON**.

---

## Service
### generate-test-cases.tsx: 
- call api NEXT_PUBLIC_GEN_TC_BACKEND_URL nhận response json object
- srs_document.tsx: xây thêm 1 api: /srs/upload-file để upload file srs (do code ban đầu chạy không được); VAnh chỉnh lại thành api của VAnh nhé

### srs_document.tsx: 
- xây thêm 1 api: /srs/upload-file để upload file srs (do code ban đầu chạy không được); VAnh chỉnh lại thành api của VAnh nhé

## ⚙️ Environment (.env)
Thêm biến môi trường cho backend generate test cases:
```env
NEXT_PUBLIC_GEN_TC_BACKEND_URL=http://localhost:9002/process
