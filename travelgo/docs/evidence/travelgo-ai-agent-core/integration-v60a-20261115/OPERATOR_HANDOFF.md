# V6.0-A local staging handoff

Đã kiểm commands `describe`, `start`, `status`, `stop`, `worker-status` trên source thật. Task đã khôi phục profile `protected` tại API5057; frontend5177 vẫn chạy. Qwen/search/worker nền OFF. Không dùng `.env` mặc định.

Từ thư mục `travelgo`:

```powershell
node backend/scripts/agent-staging-profile.cjs status
node backend/scripts/agent-staging-profile.cjs describe integrated-review
node backend/scripts/agent-staging-profile.cjs worker-status
```

Để chuyển chế độ, owner dừng đúng process do launcher sở hữu rồi khởi động lại:

```powershell
node backend/scripts/agent-staging-profile.cjs stop
node backend/scripts/agent-staging-profile.cjs start integrated-review
node backend/scripts/agent-staging-profile.cjs status
```

`integrated-review` vẫn PostgreSQL READ ONLY, dùng website http://127.0.0.1:5177/assistant và trang http://127.0.0.1:5177/admin/travel-web. Nó không khôi phục fixtures đã cleanup hoặc bật knowledge thật chưa duyệt. `stop` kiểm PID, command, owner và từ chối process không thuộc launcher.

Khôi phục bảo vệ:

```powershell
node backend/scripts/agent-staging-profile.cjs stop
node backend/scripts/agent-staging-profile.cjs start protected
```

`scoped-knowledge-write` chỉ cho cohort SYNTHETIC có manifest bounded được duyệt, còn hạn, và exact actor/source/candidate/job/knowledge IDs; personal test writes có cờ riêng và đúng owner hash. Manifest task này đã cleanup, KHÔNG được dùng lại để tái tạo hoặc giữ dữ liệu. Profile hiện không cấp quyền duyệt knowledge thật bằng actor SYNTHETIC. Real owner review/retention cần authorization mới với IDs/provenance hiện hành và đăng nhập SUPER_ADMIN thật; không sửa flag hoặc mượn actor thử nghiệm để vượt điều kiện.

`worker-once scoped-worker <approved-manifest>` tồn tại trong launcher và chỉ chạy tối đa một bounded cycle, không daemon. Task này kiểm actual restart/lease recovery qua helper worker-child với transport SYNTHETIC, không chạy thêm command worker-once sau khi đã dùng đủ3 cycles. Vì network fence của launcher chỉ local, real Internet worker mode vẫn BLOCKED: cần bounded network policy/handoff được kiểm riêng trước khi sử dụng; không tuyên bố command đã fetch Internet. `worker-status` đã kiểm thật, hiển thị due/exhausted/lease/last_error, last_success/last_attempt. Không có background worker để dừng sau task; trong foreground worker `Ctrl+C` gọi stop/abort, không thay API owner. Không có approval vận hành lâu dài.

Frontend được mở từ source Vite với `VITE_PROXY_TARGET=http://127.0.0.1:5057`, host127.0.0.1, port5177, strictPort; không dùng proxy mặc định5000. PID14468 thuộc task, đã chạy browser thật. Không tự đóng Docker/PostgreSQL/frontend hoặc ứng dụng khác.
