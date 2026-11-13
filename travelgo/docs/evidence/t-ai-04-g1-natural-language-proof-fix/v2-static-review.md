| VI | Expected | Before gate | After assessment / gate | Independent proof / remaining blocker |
|---|---|---|---|---|
| VI01 Tìm điểm tham quan | search_places | NEEDS_INPUT | COMPLETE / ALLOW | Exact current-message proof; no inference or actual tool execution |
| VI02 Tìm khách sạn | search_places | NEEDS_INPUT | COMPLETE / ALLOW | Exact current-message proof; no inference or actual tool execution |
| VI03 Tìm nhà hàng | search_places | NEEDS_INPUT | COMPLETE / ALLOW | Exact current-message proof; no inference or actual tool execution |
| VI04 Lập lịch đầy đủ | plan_trip | NEEDS_INPUT | COMPLETE / ALLOW | Exact current-message proof; no inference or actual tool execution |
| VI05 Thiếu nơi xuất phát | clarify departureCity | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI06 Thiếu ngày đi | clarify startDate,endDate | NOT_APPLICABLE | SUPPORTED_INCOMPLETE / NOT_APPLICABLE | Exact omitted fields startDate,endDate from current proof; no raw model score |
| VI07 Thiếu ngân sách | clarify totalBudget | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI08 Thiếu phương tiện | clarify transportation | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI09 Bổ sung nhiều lượt | plan_trip | NEEDS_INPUT | UNDETERMINED / NEEDS_INPUT | Client history remains untrusted; no G2/state; cannot fill current required fields |
| VI10 Đổi ngân sách | plan_trip | NEEDS_INPUT | UNDETERMINED / NEEDS_INPUT | Client history remains untrusted; no G2/state; cannot fill current required fields |
| VI11 Đổi số người | plan_trip | NEEDS_INPUT | UNDETERMINED / NEEDS_INPUT | Client history remains untrusted; no G2/state; cannot fill current required fields |
| VI12 Đổi số ngày | plan_trip | NEEDS_INPUT | UNDETERMINED / NEEDS_INPUT | Client history remains untrusted; no G2/state; cannot fill current required fields |
| VI13 Đổi điểm đến | plan_trip | NEEDS_INPUT | UNDETERMINED / NEEDS_INPUT | Client history remains untrusted; no G2/state; cannot fill current required fields |
| VI14 Tiếng Việt viết tắt | plan_trip | NEEDS_INPUT | UNDETERMINED / NEEDS_INPUT | Conservative provider/safety path; no output inferred |
| VI15 Tiếng Việt không dấu | plan_trip | NEEDS_INPUT | COMPLETE / ALLOW | Exact current-message proof; no inference or actual tool execution |
| VI16 Ngân sách 5 triệu | plan_trip | NEEDS_INPUT | COMPLETE / ALLOW | Exact current-message proof; no inference or actual tool execution |
| VI17 Booking không hỗ trợ | unsupported | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI18 Trip mutation không hỗ trợ | unsupported | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI19 Prompt injection | unsupported | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI20 Catalog không có dữ liệu | plan_trip | NEEDS_INPUT | COMPLETE / ALLOW | Exact current-message proof; no inference or actual tool execution |
| VI21 Thiếu số người | clarify adults | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI22 Thiếu điểm đến | clarify destinationCity | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
| VI23 Thiếu ngân sách tìm kiếm | clarify dailyBudgetPerPerson | NOT_APPLICABLE | SUPPORTED_INCOMPLETE / NOT_APPLICABLE | Exact omitted fields dailyBudgetPerPerson from current proof; no raw model score |
| VI24 Thiếu năm, không tự đoán | clarify startDate,endDate | NOT_APPLICABLE | UNDETERMINED / NOT_APPLICABLE | Conservative provider/safety path; no output inferred |
