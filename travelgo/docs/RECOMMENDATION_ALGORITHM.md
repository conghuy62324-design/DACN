# TÀI LIỆU TOÁN HỌC & THUẬT TOÁN ĐỀ XUẤT TOUR DU LỊCH HUGO TRAVEL

**Tài liệu tham khảo chuyên sâu về thuật toán đề xuất hành trình và GIS**

---

## 1. THUẬT TOÁN XẾP HẠNG BAYESIAN AVERAGE RATING

### 1.1. Đặt vấn đề
Trong các hệ sinh thái du lịch, điểm số trung bình số học thông thường:
$$\bar{R} = \frac{1}{v} \sum_{i=1}^{v} r_i$$
gặp phải hai khuyết tật lớn:
1. **Thiên vị mẫu nhỏ (Small Sample Bias):** Một khách sạn/tour mới có 1 đánh giá $5.0\star$ sẽ vượt mặt một điểm đến huyền thoại có 500 đánh giá đạt trung bình $4.85\star$.
2. **Dễ bị thao túng (Spam Vulnerability):** Các đối tượng gian lận dễ dàng tạo vài lượt review ảo để chiếm vị trí dẫn đầu bảng xếp hạng.

### 1.2. Công thức Bayesian Average
Để khắc phục, HuGo Travel áp dụng mô hình tiên nghiệm chuẩn (Prior Mean Regularization):

$$S = \left( \frac{v}{v + m} \right) \cdot R + \left( \frac{m}{v + m} \right) \cdot C$$

Trong đó:
- $S$: Điểm số xếp hạng thực tế của địa điểm (Bayesian Score).
- $R$: Điểm trung bình cộng các lượt đánh giá hiện tại của địa điểm ($1.0 \le R \le 5.0$).
- $v$: Tổng số lượt đánh giá thực tế của địa điểm ($v \ge 0$).
- $m$: Tham số trọng số tối thiểu (Confidence Threshold / Minimum Votes). Trong cấu hình HuGo Travel, $m = 10$.
- $C$: Điểm đánh giá trung bình cộng của toàn bộ hệ thống cơ sở dữ liệu (System Prior Mean). Trong hệ thống mẫu chuẩn, $C = 4.20$.

### 1.3. Phân tích hành vi thuật toán
- **Khi $v = 0$ (Chưa có ai đánh giá):**
  $$S = \left(\frac{0}{0+10}\right) \cdot 0 + \left(\frac{10}{0+10}\right) \cdot 4.20 = 4.20$$
  Điểm số an toàn neo tại mức trung bình hệ thống, không bị trừng phạt về 0 điểm.
- **Khi $v = 1$ với $R = 5.0$:**
  $$S = \left(\frac{1}{11}\right) \cdot 5.0 + \left(\frac{10}{11}\right) \cdot 4.20 \approx 4.27$$
  Điểm số bị kéo mạnh về $C = 4.20$, loại bỏ hoàn toàn hiện tượng "1 sao 5 điểm đứng top 1".
- **Khi $v = 200$ với $R = 4.85$:**
  $$S = \left(\frac{200}{210}\right) \cdot 4.85 + \left(\frac{10}{210}\right) \cdot 4.20 \approx 4.819$$
  Độ tự tin rất lớn, điểm $S$ tiệm cận điểm thực tế $R$.

---

## 2. THUẬT TOÁN KHOẢNG CÁCH KHÔNG GIAN HAVERSINE (GIS)

### 2.1. Công thức tính khoảng cách đường chim bay
Khoảng cách giữa hai điểm tọa độ $(\phi_1, \lambda_1)$ và $(\phi_2, \lambda_2)$ trên mặt cầu Trái Đất (bán kính $R_{earth} \approx 6,371$ km):

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

$$d = R_{earth} \cdot c$$

*Lưu ý minh bạch:* Hệ thống ghi nhãn rõ ràng $d$ là khoảng cách đường chim bay (aerial distance) để tránh ngộ nhận với khoảng cách đường bộ thực tế.

### 2.2. Ước tính thời gian di chuyển (Transit Estimation)
Để dự tính thời gian di chuyển nội đô, HuGo Travel áp dụng hệ số khúc khuỷu đường bộ thực tế (Road Detour Factor):
$$d_{road} \approx d_{aerial} \times 1.35$$
$$\text{TransitTime (phút)} = \max\left(5, \left\lceil \frac{d_{road}}{v_{mode}} \times 60 \right\rceil\right)$$
- $v_{car} \approx 30$ km/h
- $v_{motorbike} \approx 35$ km/h
- $v_{walking} \approx 4.5$ km/h

---

## 3. THUẬT TOÁN CONTENT-BASED RECOMMENDATION

Điểm đề xuất tổng hợp $Score(P, U)$ của một địa điểm $P$ đối với người dùng $U$ được chuẩn hóa trên khoảng $[0, 1]$ qua 4 tiêu chí trọng số:

$$Score(P, U) = w_q \cdot Quality(P) + w_p \cdot Preference(P, U) + w_b \cdot Budget(P, U) + w_d \cdot Proximity(P)$$

Trọng số khởi tạo mặc định:
- $w_q = 0.35$ (Chất lượng đánh giá Bayesian).
- $w_p = 0.25$ (Mức độ trùng khớp sở thích cá nhân).
- $w_b = 0.25$ (Mức độ phù hợp với ngân sách dự kiến/ngày).
- $w_d = 0.15$ (Khoảng cách và mức độ tiện đường di chuyển).
Tổng trọng số: $\sum w_i = 1.0$.

### 3.1. Điểm sở thích $Preference(P, U)$
Ánh xạ tập sở thích của người dùng vào ma trận từ khóa của địa điểm:
$$Ratio = \frac{|MatchedPreferences|}{|UserPreferences|}$$
$$PreferenceScore = 0.20 + 0.80 \times Ratio$$

### 3.2. Điểm ngân sách $Budget(P, U)$
Tỉ số chi phí so với ngân sách khả dụng hàng ngày $Ratio = \frac{Price_{place}}{DailyBudget}$:
- $Price_{place} = 0$: $BudgetScore = 0.95$ (Điểm miễn phí luôn rất tốt).
- $Ratio \le 0.4$: $BudgetScore = 1.00$ (Rất tiết kiệm).
- $0.4 < Ratio \le 0.75$: $BudgetScore = 0.85$ (Vừa vặn).
- $0.75 < Ratio \le 1.1$: $BudgetScore = 0.60$ (Chạm ngưỡng).
- $1.1 < Ratio \le 1.5$: $BudgetScore = 0.35$ (Vượt ngân sách).
- $Ratio > 1.5$: $BudgetScore = 0.15$ (Quá đắt).

---

## 4. THUẬT TOÁN HEURISTIC TOUR SCHEDULING & SPATIAL CLUSTERING

1. **Phân cụm theo ngày (Geographic Clustering):**
   - Sắp xếp các điểm tham quan đã chọn theo kinh độ/vĩ độ.
   - Chọn điểm đầu tiên làm mỏ neo (Anchor) của Ngày 1.
   - Sử dụng giải thuật Nearest Neighbor để kết nạp các điểm lân cận vào cùng ngày cho đến khi đạt giới hạn dung lượng thời gian ngày (sáng, trưa, chiều, tối).
   - Tiếp tục sang Ngày 2 và Ngày 3 cho các cụm còn lại.
2. **Phân bổ khung giờ hoạt động (Time Slot Assignment):**
   - Sáng (Morning: 08:00 - 11:30): Điểm tham quan/check-in chính ngoài trời.
   - Trưa (Lunch: 11:30 - 13:00): Nhà hàng ẩm thực địa phương đặc sắc.
   - Chiều (Afternoon: 14:00 - 17:30): Bãi biển, bảo tàng, làng nghề hoặc khu nghỉ dưỡng.
   - Tối (Dinner & Evening: 18:00 - 21:30): Nhà hàng ăn tối & dạo phố đêm/ngắm cầu.
3. **Đánh giá ngân sách tự động:**
   - So sánh $\sum Cost$ với $TotalBudget$.
   - Tự động gắn nhãn `within_budget` hoặc `over_budget` và sinh lời khuyên thông minh:
     *"Chi phí dự kiến vượt ngân sách khoảng 37.800.000đ. Gợi ý: Có thể cân nhắc phòng khách sạn tiêu chuẩn hoặc lựa chọn các quán ăn địa phương bình dân hơn để tiết kiệm."*
