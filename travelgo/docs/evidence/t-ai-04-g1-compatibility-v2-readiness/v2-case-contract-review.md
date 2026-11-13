# V2 per-case static contract review (no model output)

All actual raw/UX results remain NOT RUN/NOT EVALUATED. Gates below apply only to the immutable expected decision, not an inferred model response.

| VI | Expected | Current assessor / hypothetical gate | History/current-only impact |
|---|---|---|---|
| VI01 Tìm điểm tham quan | search_places | UNDETERMINED / NEEDS_INPUT: destinationCity,dailyBudgetPerPerson | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI02 Tìm khách sạn | search_places | UNDETERMINED / NEEDS_INPUT: destinationCity,dailyBudgetPerPerson | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI03 Tìm nhà hàng | search_places | UNDETERMINED / NEEDS_INPUT: destinationCity,dailyBudgetPerPerson | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI04 Lập lịch đầy đủ | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI05 Thiếu nơi xuất phát | clarify: departureCity | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
| VI06 Thiếu ngày đi | clarify: startDate,endDate | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
| VI07 Thiếu ngân sách | clarify: totalBudget | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
| VI08 Thiếu phương tiện | clarify: transportation | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
| VI09 Bổ sung nhiều lượt | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Bổ sung departureCity; destination/date/adults/budget/transport chỉ ở client history |
| VI10 Đổi ngân sách | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Đổi totalBudget=7000000; còn lại từ client history |
| VI11 Đổi số người | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Đổi adults=3; còn lại từ client history |
| VI12 Đổi số ngày | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Đổi endDate=2030-06-18; còn lại từ client history |
| VI13 Đổi điểm đến | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Đổi destinationCity=Hội An; còn lại từ client history |
| VI14 Tiếng Việt viết tắt | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI15 Tiếng Việt không dấu | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI16 Ngân sách 5 triệu | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI17 Booking không hỗ trợ | unsupported | UNDETERMINED / NOT_APPLICABLE | Unsupported/mutation/injection; expected unsupported và zero tool giữ nguyên |
| VI18 Trip mutation không hỗ trợ | unsupported | UNDETERMINED / NOT_APPLICABLE | Unsupported/mutation/injection; expected unsupported và zero tool giữ nguyên |
| VI19 Prompt injection | unsupported | UNDETERMINED / NOT_APPLICABLE | Unsupported/mutation/injection; expected unsupported và zero tool giữ nguyên |
| VI20 Catalog không có dữ liệu | plan_trip | UNDETERMINED / NEEDS_INPUT: departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation | Không dùng history, nhưng natural-language current input nằm ngoài narrow proof grammar; đủ ngữ nghĩa trong benchmark không đồng nghĩa đủ gate proof |
| VI21 Thiếu số người | clarify: adults | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
| VI22 Thiếu điểm đến | clarify: destinationCity | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
| VI23 Thiếu ngân sách tìm kiếm | clarify: dailyBudgetPerPerson | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
| VI24 Thiếu năm, không tự đoán | clarify: startDate,endDate | UNDETERMINED / NOT_APPLICABLE | Không dùng history; exact missingFields vẫn theo benchmark, không đổi thành toàn bộ fields để làm raw PASS |
