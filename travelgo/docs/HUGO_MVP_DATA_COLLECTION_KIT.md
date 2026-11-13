# T01 — Bộ chuẩn bị thu thập và gán nhãn sentiment tiếng Việt MVP

Ngày soạn: **28/10/2026**. Tất cả mốc giờ trong tài liệu dùng giờ Việt Nam, `Asia/Ho_Chi_Minh` (UTC+7).

**Trạng thái: DRAFT — chuẩn bị quy trình, chưa thu dữ liệu, chưa có consent receipt thực tế, chưa chứng nhận dataset đạt gate.** Các ô checklist đều chưa thực hiện. `TODO` là thông tin người phụ trách phải điền bằng thực tế; không phải giá trị mặc định để tự động chấp nhận dữ liệu.

T01 chỉ tạo tài liệu này. Không tạo form trực tuyến, dataset, receipt, license, manifest mới hoặc bằng chứng PASS; không sửa code/label map/manifest BLOCKED, không train, upload hay deploy.

## 1. Căn cứ, phạm vi và đầu ra dự kiến

Đã đối chiếu:

- [Kế hoạch MVP](HUGO_AI_M2_MVP_PLAN.md).
- [Bản bàn giao hiện trạng](HUGO_AI_CURRENT_STATUS_AND_CHATGPT_HANDOFF.md).
- [Label map hiện có](../ai/configs/vietnamese_sentiment_label_map.json), ID `hugo-vi-sentiment-3class-v1`.
- [Split specification hiện có](../ai/evaluation/vietnamese_sentiment_split_manifest.json): `SPECIFICATION_ONLY`, `BLOCKED`, `assigned_rows=0`, chưa có split hash.

Mục tiêu là chuẩn bị corpus first-party dự kiến mang tên `HuGo-MVP-ViSent-v1`, gồm phản hồi tiếng Việt nguyên gốc của người thật về `hotel`, `restaurant`, `attraction`. Tên này là tên dự kiến, chưa khẳng định corpus tồn tại.

Tách ba pool: `PILOT`, `DEVELOPMENT_CANDIDATE`, `INDEPENDENT_TEST_CANDIDATE`. Hậu tố CANDIDATE có nghĩa đang chờ kiểm tra, không đủ tư cách đánh giá chỉ nhờ được phân vào pool. Pilot có thể giúp sửa quy trình; toàn bộ pilot được giữ ngoài final train/validation/test theo quy trình T01 này.

Mốc 3.000 development + 600 test trong manifest cũ thuộc kế hoạch nghiên cứu trước đây. T01 dùng số lượng MVP bên dưới theo kế hoạch đã điều chỉnh và yêu cầu hiện tại; **không sửa manifest cũ thành PASS**. Nếu sau này có dữ liệu đủ điều kiện, cần task riêng tạo registry/manifest MVP mới và kiểm chứng bằng chứng thật.

### 1.1. Số lượng được tính sau mọi bước lọc và chốt nhãn

| Mức | Development | Independent test | Support từng nhãn |
|---|---:|---:|---|
| Mục tiêu | 600 dòng | 150 dòng | Khoảng 200 development và 50 test cho mỗi lớp |
| Sàn bắt buộc để chọn A cuối cùng | Ít nhất 360 dòng | Ít nhất 90 dòng | **Ít nhất 120 development và 30 test cho từng lớp** |
| Pilot riêng | 45–60 phản hồi | Không thuộc final test | Theo dõi cả ba domain/nhãn thực tế, không ép nhãn để đủ số |

Các lớp là `NEGATIVE`, `NEUTRAL`, `POSITIVE`. Đạt tổng 360/90 nhưng thiếu một lớp dưới 120/30 vẫn chưa đạt sàn. Mục tiêu development 600 được chia train/validation khoảng 480/120; sàn 360 chia khoảng 288/72 ở bước sau, giữ group nguyên vẹn và ghi tỷ lệ thực tế.

Ba domain đều phải có đại diện trong development và test; số lượng theo từng ô domain × label phải báo cáo. Ngưỡng cứng cho từng ô: `TODO` chốt sau pilot, trước main annotation. Không đặt thêm quota bằng cách sửa nhãn hoặc nhân bản câu.

## 2. Các việc cần chốt trước khi mời người tham gia

| Việc | Người phụ trách / giá trị thật |
|---|---|
| Chủ nhiệm đồ án/người chịu trách nhiệm dữ liệu | TODO |
| Người giữ consent receipts và final test, tách khỏi người chọn model khi có thể | TODO |
| Hai annotator tiếng Việt A/B, mã nội bộ | TODO; hai người khác nhau |
| Adjudicator C cho bất đồng | TODO; người thứ ba khác A/B |
| Nền tảng form, cấu hình không yêu cầu đăng nhập/thu email | TODO |
| Nơi lưu text, receipt, annotation và test; danh sách quyền truy cập | TODO |
| Kênh rút consent bằng mã bí mật, không yêu cầu cung cấp danh tính | TODO |
| Retention của text/receipt/annotation/backup và ngày xóa cụ thể | TODO |
| Người xem xét nội dung thông báo/consent, yêu cầu của trường nếu có | TODO |
| Giờ chốt quyết định ngày 06/11/2026 | TODO, phải thông báo trước |
| Giờ đóng form/hạn nhận rút consent và giờ khóa ngày 10/11/2026 | TODO; hạn rút phải trước giờ khóa và có thời gian xử lý |
| Ngưỡng/chính sách agreement sau pilot và trước main annotation | TODO; ghi lý do, không chọn lại theo kết quả test |

Chưa có người giữ test, hai annotator hoặc adjudicator thì ghi thiếu nguồn lực, không giả lập nhiều người bằng một người/LLM. Không mở form thật khi thông báo consent còn thiếu nơi lưu, người truy cập, retention hoặc cách rút.

## 3. Mẫu form thu phản hồi và thông báo nghiên cứu

**Mẫu dưới đây cần được người phụ trách hoàn thiện trước khi dùng. Không có ô nào được tick sẵn.** Đây là dự thảo lời mời/ghi nhận lựa chọn, không phải consent đã được một người tham gia cấp và không phải giấy phép corpus có sẵn.

### 3.1. Trang giới thiệu trước khi nhập text

> HuGo Travel đang thực hiện đồ án nghiên cứu phân loại cảm xúc trong phản hồi tiếng Việt về khách sạn, nhà hàng và địa điểm tham quan. Bạn được mời viết phản hồi ngắn bằng lời của chính mình. Việc tham gia là tự nguyện; bạn có thể bỏ qua hoặc dừng gửi.
>
> Nếu bạn đồng ý, nội dung có thể được kiểm tra, làm sạch, gán nhãn bởi con người, dùng để huấn luyện hoặc đánh giá mô hình sentiment và lưu cùng kết quả/artifact phục vụ đồ án. Báo cáo trình bày số liệu tổng hợp; việc công khai nguyên văn phản hồi, phát hành dataset hoặc sử dụng thương mại không thuộc phạm vi đồng ý này.
>
> Có một lựa chọn riêng về xử lý nội dung trên Kaggle Private. Từ chối lựa chọn này không được coi là đồng ý ngầm; nội dung chỉ có thể được dùng local theo phạm vi bạn đã chọn.
>
> Không nhập tên thật, tên tài khoản, email, số điện thoại, địa chỉ cụ thể, URL, mã đặt chỗ/đơn hàng/tài khoản hoặc thông tin nhận dạng của người khác. Hãy dùng mã địa điểm/scenario do nhóm cung cấp, không ghi tên nhân viên/khách hàng.
>
> Người chịu trách nhiệm: TODO. Nơi lưu và người được truy cập: TODO. Thời hạn lưu/xóa từng loại dữ liệu và backup: TODO. Mã phiên bản thông báo: TODO.
>
> Bạn có thể yêu cầu rút trước **TODO giờ, ngày 10/11/2026**, qua TODO bằng mã rút bí mật được cấp khi gửi. Nhóm xử lý yêu cầu trước khi khóa snapshot. Sau khi khóa, nhóm không tự hứa có thể thu hồi mô hình hoặc bản sao đã phát hành; chính sách xử lý yêu cầu sau khóa và giới hạn thực tế phải được ghi rõ tại TODO trước khi mở form. Không thu email/số điện thoại để thực hiện việc rút.

Thông báo chưa hoàn thiện ở mục TODO chưa được phát hành như một thông báo đang có hiệu lực. Không hứa xóa tuyệt đối nếu công cụ/backup chưa cho phép xác minh điều đó.

### 3.2. Câu hỏi form và điều kiện hiển thị

| Trường hiển thị | Cách trả lời | Quy tắc |
|---|---|---|
| Bạn có muốn tham gia nghiên cứu theo thông báo trên? | Có / Không | Không → kết thúc trước ô text; không giữ phản hồi nội dung |
| Mã tác giả do nhóm cấp | Mã ngẫu nhiên, không phải tên/email | Cùng một người dùng lại mã; không tạo mã từ thông tin nhận dạng |
| Loại dịch vụ | hotel / restaurant / attraction | Chọn một domain chính |
| Nguồn phản hồi | Trải nghiệm cá nhân / Phản hồi scenario do con người thiết kế | Không cho chọn AI-generated, dịch máy hoặc sao chép |
| Mã địa điểm | Mã do người quản lý cấp | Bắt buộc cho trải nghiệm; không nhập địa chỉ/tên riêng tự do |
| Mã scenario/phiên bản | Mã do người quản lý cấp | Bắt buộc cho scenario; được gắn từ form, không tự sinh bởi model |
| Phản hồi của bạn | Text tiếng Việt nguyên gốc | Gợi ý 1–4 câu; giới hạn 3 ký tự không trắng đến 2.000 ký tự; không cắt âm thầm |
| Xác nhận lựa chọn đồng ý | Các ô ở mục 3.3 | Hoàn thành trước khi lưu text |

Lời nhắc viết phản hồi:

> Hãy mô tả bằng tiếng Việt cảm nhận hoặc thông tin bạn muốn chia sẻ về trải nghiệm/scenario vừa chọn, bằng cách diễn đạt của riêng bạn. Có thể hài lòng, không hài lòng hoặc chỉ mô tả sự việc; không có câu trả lời đúng và không có nhãn bạn phải đạt. Không sao chép hoặc sửa lại review từ nơi khác. Không nhờ AI viết, diễn đạt lại, dịch hoặc gợi ý phản hồi. Không gửi thông tin nhận dạng.

Form không hỏi số sao, nhãn sentiment mong muốn, thông tin nhân khẩu học, tên, chữ ký, email hay số điện thoại. Người quản lý không yêu cầu “hãy viết một câu POSITIVE” để bù quota. Nếu tuyển bổ sung, mở rộng người tham gia/trải nghiệm độc lập; nhãn vẫn do người gán nhãn đọc text quyết định.

### 3.3. Các ô xác nhận riêng biệt — bản nháp

Các ô bắt buộc cho việc nhận dữ liệu nghiên cứu:

- [ ] Tôi đã đọc thông báo nghiên cứu phiên bản TODO và tự nguyện tham gia.
- [ ] Đây là phản hồi tiếng Việt do chính tôi viết; tôi có quyền cung cấp nội dung này. Tôi không sao chép từ Google Maps, Booking.com, TripAdvisor, mạng xã hội hay nguồn bên thứ ba; không dùng AI sinh/viết lại hoặc dịch máy.
- [ ] Tôi đồng ý để nhóm xử lý, làm sạch, gán nhãn và dùng phản hồi để train/evaluate sentiment trong đồ án phi thương mại, lưu artifact nghiên cứu nội bộ và trình bày số liệu tổng hợp theo thông báo.
- [ ] Tôi đã kiểm tra nội dung không có thông tin nhận dạng; tôi hiểu cách rút, hạn rút, thời hạn lưu và phạm vi truy cập đã công bố.

Lựa chọn độc lập, không bắt buộc:

- [ ] Tôi đồng ý cho text đã làm sạch được xử lý trên **Kaggle Private** để thực hiện nghiên cứu này theo phạm vi và thời hạn của thông báo; không bao gồm consent receipt hoặc mã rút bí mật.

Kaggle chưa được chọn → ghi nhận từ chối/không cấp quyền; không tự đổi thành true. Nếu mục bắt buộc chưa được chọn, không tiếp nhận text vào pool nghiên cứu. Nếu hạ tầng local chưa đủ để xử lý các dòng từ chối Kaggle, đánh dấu chưa có đường thực thi, không loại bỏ lựa chọn từ chối hay xin đồng ý hộ.

### 3.4. Thiết lập công cụ và vận hành

- Không bật thu email, yêu cầu đăng nhập, đính kèm ảnh/tài liệu hoặc câu hỏi nhận dạng.
- Kiểm tra liệu nền tảng giữ IP, tài khoản, thông số trình duyệt hoặc log định danh; cấu hình/tuyên bố thực tế: `TODO`. Không khẳng định “không thu PII” nếu nền tảng vẫn tự ghi và chưa có cách xử lý phù hợp.
- Mã tác giả được cấp ngẫu nhiên trực tiếp, không giữ bảng tên ↔ mã. Mã địa điểm do người quản lý chuẩn hóa để cùng địa điểm luôn cùng mã, bảng đối chiếu địa điểm hạn chế quyền và không chứa dữ liệu cá nhân.
- Hiển thị mã rút bí mật một lần; người tham gia tự lưu. Kho receipt chỉ lưu hash mã rút, không lưu mã thô. Cơ chế thực hiện thật: `TODO`; T01 không tạo mã/receipt.
- Người phụ trách kiểm tra text trước khi đưa vào annotation; text nghi PII/sao chép/AI phải vào khu cách ly hạn chế quyền hoặc bị loại. Không đưa text nghi PII vào chatbot/cloud để nhờ kiểm tra.

## 4. Schema dự kiến và tách kho dữ liệu

Các bảng sau là **đặc tả trường**, không phải dataset/receipt đã tạo. Thông tin chưa thu để null/TODO theo quy trình, không gán `true`, `PASS` hoặc hash giả. Trường định danh là mã ngẫu nhiên nội bộ; vẫn phải hạn chế truy cập vì mã liên kết có thể làm lộ nhóm đóng góp.

### 4.1. Kho nội dung nghiên cứu — không chứa consent text/token

| Trường | Kiểu / nội dung |
|---|---|
| `row_id` | ID ngẫu nhiên duy nhất cho một phản hồi |
| `collection_batch_id`, `form_version`, `guideline_version` | Phiên thu và version có thật |
| `pool_candidate` | PILOT / DEVELOPMENT_CANDIDATE / INDEPENDENT_TEST_CANDIDATE |
| `contributor_group_id` | Mã ổn định cho cùng tác giả, không hash từ email/phone |
| `entity_group_id` | Mã cùng khách sạn/nhà hàng/địa điểm; null chỉ khi không áp dụng và có lý do |
| `scenario_id`, `scenario_family_id`, `scenario_version` | Mã scenario và họ kịch bản; null cho trải nghiệm thật nếu không áp dụng |
| `domain` | hotel / restaurant / attraction |
| `provenance_type` | ORIGINAL_PERSONAL_EXPERIENCE / ORIGINAL_HUMAN_SCENARIO_RESPONSE |
| `source_family`, `collection_method_version` | HuGo first-party và cách thu; scenario author/nhóm biên soạn ghi ở sổ scenario riêng |
| `collection_date` | Ngày thu; timestamp chính xác giữ trong kho kiểm soát nếu cần |
| `text_clean` | Text sau kiểm tra/làm sạch, giữ dấu, phủ định, cảm xúc |
| `content_sha256`, `duplicate_cluster_id`, `leakage_group_id` | Chỉ tính sau khi thực hiện chuẩn hóa/dedupe/group; chưa có thì null |
| `pii_review_status`, `provenance_review_status` | PENDING / QUARANTINED / CLEARED / REJECTED, chỉ đổi có bằng chứng |
| `annotation_status` | NOT_STARTED / SINGLE_LABELED / DOUBLE_LABELED / ADJUDICATED / UNRESOLVED / EXCLUDED |
| `final_label`, `label_map_id` | null khi chưa chốt; khi chốt chỉ ba nhãn canonical và label-map ID hiện có |
| `exclusion_reason` | Lý do loại/khoanh vùng; không chứa nội dung PII |

Raw text chưa kiểm tra, nếu cần giữ để đối chiếu, ở kho cách ly riêng có retention đã chốt; không để trong file train/test hoặc Git. Không ghi đè bản gốc mà không có log làm sạch, nhưng cũng không giữ PII ngoài retention đã thông báo.

### 4.2. Kho consent receipt riêng, hạn chế quyền

| Trường | Nội dung cần ghi từ sự kiện thực |
|---|---|
| `receipt_id` | ID của lần đồng ý thật |
| `notice_version`, `notice_sha256`, `form_version` | Bản thông báo thực tế đã hiển thị |
| `recorded_at`, `capture_method` | Thời điểm và phương thức ghi nhận thực tế |
| `research_opt_in`, `originality_attested`, `no_ai_no_copy_attested` | Lựa chọn thật của người tham gia |
| `private_kaggle_opt_in` | Lựa chọn độc lập thật; thiếu không được hiểu là đồng ý |
| `withdrawal_token_hash`, `withdrawal_status`, `withdrawn_at` | Hash token, trạng thái và thời điểm xử lý yêu cầu thật |
| `retention_policy_version`, `delete_due_at` | Chính sách đã công bố và ngày xóa |
| `evidence_locator` | Vị trí bản ghi xác nhận có thật trong kho hạn chế quyền |

Không có tên/email/phone/chữ ký/IP trong receipt nghiên cứu dự kiến. Giữ bảng liên kết riêng `row_id ↔ receipt_id ↔ contributor_group_id`; không export receipt, token, hash token hay liên kết này lên Kaggle. Người phụ trách tạo bản kiểm kê quyền nội bộ theo row và kiểm tra lại khi đóng form/khóa snapshot/upload ở task sau. Consent nghiên cứu không tự cấp quyền công khai dataset, commercial use hoặc public model weights.

### 4.3. Kho annotation và adjudication

| Trường | Nội dung |
|---|---|
| `row_id`, `assignment_id`, `annotator_id` | Mã phản hồi, lượt giao, người gán nhãn nội bộ |
| `guideline_version`, `annotated_at` | Version và thời điểm thực |
| `label_proposed` | NEGATIVE / NEUTRAL / POSITIVE hoặc null khi chưa xác định |
| `review_flag`, `reason_code` | CLEAR / AMBIGUOUS / MIXED / INSUFFICIENT_CONTEXT / OUT_OF_SCOPE / SUSPECTED_PII / SUSPECTED_COPY_OR_AI |
| `rationale` | Lý do ngắn từ text đã sạch; không thêm định danh |
| `adjudicator_id`, `adjudicated_at`, `adjudication_reason` | Lưu ở bảng adjudication, sau hai lượt độc lập |
| `final_label`, `final_status` | Nhãn cuối hoặc EXCLUDED/UNRESOLVED; giữ nguyên lịch sử A/B |

Schema file train/test chính xác cho pipeline là việc của task triển khai sau. Không tự gán `quality_claim_allowed=true`, tier DEVELOPMENT/INDEPENDENT_TEST chính thức hoặc `production_eligible=true` trong bước chuẩn bị này. Artifact nghiên cứu sau này cũng không mặc nhiên production-eligible.

## 5. Guideline nhãn toàn phản hồi, phiên bản nháp

Nhãn chuẩn giữ nguyên: **0 = NEGATIVE; 1 = NEUTRAL; 2 = POSITIVE**. Đây là sentiment **toàn phản hồi**, không phải aspect sentiment, toxicity, số sao hoặc ý định mua.

| Nhãn | Quy tắc |
|---|---|
| NEGATIVE | Text thể hiện rõ đánh giá không hài lòng/phê bình/thất vọng đối với dịch vụ hoặc trải nghiệm đang được nói tới |
| NEUTRAL | Text có đủ nghĩa, trong domain, chủ yếu cung cấp thông tin hoặc mô tả sự việc, không thể hiện đánh giá tích cực/tiêu cực rõ |
| POSITIVE | Text thể hiện rõ sự hài lòng/khen ngợi/đánh giá tích cực về dịch vụ hoặc trải nghiệm |

T01 không tạo câu review mẫu. Tất cả nội dung hướng dẫn trong tài liệu, scenario prompt và mọi ví dụ do công cụ sinh đều **không phải phản hồi được phép đưa vào corpus**. Ví dụ huấn luyện annotator sau này chỉ chọn từ pilot đã có consent và làm sạch, lưu riêng ngoài final test.

### 5.1. Trình tự đọc và quyết định

1. Kiểm tra text đọc được, đúng domain và không lộ PII. Có vấn đề → gắn flag để xử lý, không cố chọn nhãn.
2. Đọc cả phản hồi, xác định đối tượng được đánh giá; không đoán cảm xúc từ metadata hoặc từ khóa riêng lẻ.
3. Xem phạm vi phủ định, mức độ, biểu tượng cảm xúc, cách nói địa phương/không dấu; giữ nguyên chúng trong text.
4. Chọn một nhãn chỉ khi sentiment toàn phản hồi đủ rõ theo bảng.
5. Nếu mỉa mai, thiếu ngữ cảnh, trộn cảm xúc hoặc không chắc → `label_proposed=null`, gắn lý do và chuyển xử lý. Không gán NEUTRAL để lấp ô trống.

### 5.2. Trường hợp biên

| Tình huống | Cách xử lý |
|---|---|
| Có từ phủ định | Đọc phạm vi phủ định; không quy tắc máy móc “có không → NEGATIVE” |
| Chỉ mô tả giá/thời gian/vị trí | Có thể NEUTRAL nếu đủ thông tin và không kèm đánh giá; không suy “đắt/rẻ” chỉ từ một con số |
| Thiếu dấu, slang, lỗi gõ | Giữ nguyên; chỉ gán khi nghĩa rõ, nếu không thì AMBIGUOUS |
| Mỉa mai hoặc emoji trái với lời | Không tự đảo nhãn; chuyển adjudication nếu cần suy đoán ngoài text |
| Khen/chê nhiều aspect trái chiều | MIXED; **không suy nhãn toàn phản hồi bằng đếm từ, aspect majority hoặc trung bình**, không tự coi là NEUTRAL |
| Nội dung chỉ là yêu cầu/câu hỏi/cụt nghĩa | Xem có đủ thông tin trong domain không; thiếu ngữ cảnh thì INSUFFICIENT_CONTEXT, không ép neutral |
| Toxic hoặc ngôn từ mạnh | Toxic không mặc nhiên là NEGATIVE; chỉ gán sentiment khi phản hồi trong domain và nghĩa đánh giá rõ |
| Có số sao/nhãn người viết hoặc model prediction | Không dùng để suy sentiment; ẩn khỏi màn annotation |
| Ngoài domain hoặc nguồn không hợp lệ | OUT_OF_SCOPE hoặc loại vì provenance, không cứu bằng cách sửa nội dung |

Adjudicator chỉ chốt nhãn khi text gốc đủ evidence theo guideline. Nếu vẫn mixed/mơ hồ hoặc cần đoán ý tác giả, giữ UNRESOLVED và loại khỏi tập ba lớp. Không viết lại phản hồi để làm rõ nhãn. Việc hỏi thêm người tham gia, nếu có, phải tạo phản hồi/lượt thu mới theo consent phù hợp, không sửa lặng bản cũ.

## 6. Tổ chức gán nhãn độc lập và kiểm tra chéo

### 6.1. Pilot và chuẩn bị người gán nhãn

- Dùng pilot để thống nhất cách hiểu nhãn; A/B gán độc lập trước khi thảo luận.
- Ghi các bất đồng, lý do, tỷ lệ câu bị loại và những sửa đổi guideline; khóa version cho main collection/annotation.
- Người gán nhãn không tự gán phản hồi của chính mình. Phân công lại nếu có xung đột; nếu không có người phù hợp thì loại/chưa dùng row đó.
- Người viết scenario không dùng intended label của mình để quyết định nhãn phản hồi; annotator chỉ thấy text sạch và domain cần thiết.

### 6.2. Independent test — 100% double annotation

1. Người giữ test giao cùng text sạch cho hai người A/B bằng assignment riêng.
2. Ẩn nhãn của người kia, rating, tên nguồn có thể gợi nhãn, pool/train-test label, sentiment dự kiến của scenario và mọi model output.
3. A/B nộp và khóa annotation riêng trước khi mở đối chiếu. Không trao đổi từng dòng trong vòng gán độc lập.
4. C xem mọi disagreement/flag sau vòng độc lập, ghi quyết định và lý do; không ghi đè kết quả gốc của A/B.
5. Cả hai đồng ý nhưng có flag nguy cơ/mixed vẫn được review; đồng ý không tự xóa flag.
6. Dòng chưa giải quyết/không đủ evidence bị loại khỏi count final; kiểm lại support 30 mỗi lớp sau loại.

**100% dòng final test phải có hai annotation của hai người thật khác nhau; mọi bất đồng phải có adjudication thực tế.** Không dùng LLM, pseudo-label hoặc một người đổi mã thành hai annotator.

### 6.3. Development — một lượt toàn bộ, kiểm tra chéo tối thiểu 20%

- A gán toàn bộ development; B gán độc lập một tập mẫu chọn trước khi đối chiếu nhãn, tối thiểu `ceil(0,20 × N)` của **development final sau lọc**.
- Với target 600: ít nhất 120 dòng; với floor 360: ít nhất 72 dòng. N lớn hơn thì tính lại, không giữ cứng 72/120.
- Chọn mẫu bằng seed được ghi trước, phân tầng theo domain và nhãn lượt A ở phía người giao việc; B không nhìn thấy nhãn A. Bổ sung các câu có flag để review, nhưng không thay thế phần mẫu đại diện.
- Mọi bất đồng trong overlap được C adjudicate; các dòng có flag ngoài overlap cũng phải xử lý. Sau loại/bổ sung, kiểm lại tỷ lệ double-annotated của final development và bổ sung lượt B nếu thiếu 20%.
- Báo agreement **trước adjudication**, số dòng overlap, raw agreement và Cohen's kappa nếu phù hợp; báo UNRESOLVED/flag riêng, không loại chúng âm thầm để tăng agreement. Theo domain/class chỉ diễn giải kèm support và giới hạn mẫu.

Ngưỡng/chính sách acceptance agreement: `TODO` chốt từ pilot trước main annotation. Nếu thấp, kiểm tra guideline và annotation; không sửa threshold sau khi xem final test để hợp thức hóa kết quả. Nếu sửa guideline, tăng version và gán lại phạm vi bị ảnh hưởng trước khóa.

### 6.4. Giữ test độc lập với người chọn model

Người giữ test/annotator có thể đọc test để kiểm tra và gán nhãn; người phát triển/chọn model chỉ nhận thống kê tổng hợp về số lượng/gate, không nhận text/nhãn test trước khi khóa preprocessing và cấu hình thí nghiệm ở task sau. Danh sách người có quyền: `TODO`. Chưa tách được vai trò thì ghi hạn chế và tìm người giữ test; không tuyên bố test đã blind khi chưa thực hiện.

## 7. Pilot 45–60 phản hồi và main collection

### 7.1. Pilot riêng

- Thu **45–60 phản hồi thật**, có consent thật và provenance hợp lệ; cố gắng có cả ba domain, nhiều tác giả, trải nghiệm/scenario đa dạng.
- Pilot này không phải fixture 45 câu tự viết đang có ở `ai/fixtures/`; không chuyển fixture DEMO_ONLY thành dữ liệu người dùng.
- Hai annotator gán độc lập toàn pilot, C xử lý bất đồng để phát hiện lỗi form, nhãn, PII, group ID và consent flow.
- Thử thao tác rút bằng một tình huống kiểm thử vận hành ghi rõ là kiểm thử, không tạo receipt người tham gia giả hay đưa submission kiểm thử vào count pilot.
- Ghi số raw/valid/rejected, phân bố nhãn/domain, agreement, thời gian thực mỗi dòng và tỷ lệ hao hụt sau dedupe.
- Dùng kết quả để sửa thông báo/form/schema/guideline; nếu đổi phạm vi consent, phải giải quyết quyền phù hợp trước khi dùng nội dung cũ cho mục đích mới.
- **Không đưa bất kỳ pilot row hoặc nhóm/near-duplicate của pilot vào final test.** Quy trình này dành riêng pilot cho quy trình/huấn luyện annotator, không tính pilot vào 600/150 hoặc 360/90.

### 7.2. Bố trí nhóm trước khi thu chính

- Người giữ dữ liệu cấp mã và phân bổ tác giả/địa điểm/họ scenario dự kiến cho từng pool; một nhóm không được dùng cho cả development và test.
- Với trải nghiệm thật: cùng địa điểm luôn cùng `entity_group_id`; không đổi ID chỉ vì khác ngày/chi nhánh chưa xác minh.
- Với scenario: kịch bản do người thật tự soạn, không sao chép review và không dùng AI tạo/viết lại; các biến thể/paraphrase/thay tên của cùng kịch bản giữ chung `scenario_family_id`. Sổ scenario ghi tác giả nội bộ và version, không phải nhãn gold.
- Người tham gia không xem phản hồi của người khác, ví dụ từ test hoặc danh sách từ khóa/nhãn mục tiêu trước khi viết.
- Không yêu cầu một người viết hàng trăm biến thể để bù số lượng. Đặt giới hạn đóng góp/tác giả và số nhóm tối thiểu sau pilot: `TODO`; báo phân bố thật, không suy số người từ số dòng.
- Phân bổ ban đầu chỉ là dự kiến. Dedupe/group audit có thể phát hiện liên kết mới; quyết định final split dựa trên toàn bộ thành phần liên thông, không chỉ tên pool ban đầu.

## 8. Checklist gate — chưa có kết quả thực thi

Mỗi mục cần người kiểm, ngày kiểm, evidence locator và số lượng ảnh hưởng ở task thực thi sau. Chưa có bằng chứng → PENDING/TODO, không tick hộ và không ghi PASS.

### 8.1. Consent và provenance

- [ ] Thông báo/form hoàn thiện mọi TODO bắt buộc trước khi mở; lưu exact version đã hiển thị.
- [ ] Từng row có receipt thật và liên kết nội bộ; kiểm các quyền nghiên cứu và trạng thái chưa rút.
- [ ] Người viết xác nhận nguyên gốc, không copy/AI/dịch máy; khai provenance trải nghiệm hay human scenario.
- [ ] Tự khai không phải bằng chứng tuyệt đối: các dòng nghi sao chép/AI được kiểm tra nguồn trong phạm vi cho phép hoặc loại/quarantine; không chứng nhận “human-only” chỉ bằng detector.
- [ ] Quyền Kaggle được kiểm theo từng row cho cả development lẫn test; receipt/token không nằm trong export.
- [ ] Không có dữ liệu Google Maps, database test, demo fixture, nội dung tổng hợp hoặc nguồn BLOCKED trộn vào pool thật.
- [ ] Tất cả yêu cầu rút trước hạn được xử lý ở raw/clean/annotation/split dự kiến theo policy, log bằng ID; tính lại counts.
- [ ] Không tự tuyên bố license public/commercial hoặc tạo consent behalf người tham gia.

### 8.2. PII và làm sạch

- [ ] Form và hệ thống lưu không thu trường PII/log định danh ngoài thiết kế đã thông báo; kiểm cấu hình thật.
- [ ] Strict UTF-8, NFC, bỏ BOM/zero-width và chuẩn hóa khoảng trắng; giữ dấu, phủ định, emoji/mức độ cảm xúc.
- [ ] Loại rỗng, ngoài domain, quá ngắn/quá dài; không cắt hoặc viết lại để đủ điều kiện.
- [ ] Scan email, phone, URL, tên/địa chỉ định danh, username và booking/order/account IDs; manual review cả trường hợp pattern bỏ sót.
- [ ] Nội dung nghi PII được cách ly; chỉ redact nếu không đổi sentiment và có policy đã chốt, nếu không thì loại. Không giữ bản PII trong corpus clean.
- [ ] Log chỉ aggregate/ID/reason, không in raw match; raw quarantine và backup có ngày xóa theo retention.
- [ ] Kiểm tra thủ công ngẫu nhiên theo label/domain sau làm sạch; consent evidence giữ tách text.

### 8.3. Exact/near dedupe và group leakage

- [ ] Exact key từ NFC + casefold/lowercase + gộp khoảng trắng; lưu hash nội bộ sau khi chạy thật.
- [ ] Near duplicate kiểm character 5-gram/Jaccard **≥0,90**, ngưỡng cố định trước audit main; câu quá ngắn cần kiểm exact/manual riêng, không coi thiếu 5-gram là sạch.
- [ ] Tìm duplicate trên toàn pilot + development + test; không chỉ so trong từng file. Không tính paraphrase thành các mẫu độc lập nếu thuộc một cluster.
- [ ] Nối row cùng contributor, entity hoặc scenario family và duplicate cluster thành thành phần liên thông `leakage_group_id`. Liên kết không áp dụng được phải có lý do; thiếu metadata không được diễn giải thành zero overlap.
- [ ] Mỗi thành phần chỉ thuộc một split final; nhóm pilot giữ ngoài final corpus. Nếu nhóm quá lớn làm không thể đủ support, thu nhóm mới hoặc chọn B; không cắt nhóm để đạt quota.
- [ ] Kiểm zero row ID/exact/near cluster/contributor/entity/scenario-family overlap giữa development và independent test, và giữa train/validation của development sau này.
- [ ] `source_family` luôn được theo dõi. Corpus first-party này có thể chung nguồn HuGo ở hai pool; không vì vậy tuyên bố source-disjoint. Thay vào đó kiểm source lineage, nhóm scenario/contributor/entity và ghi giới hạn cùng nguồn.
- [ ] Nếu tách tập chỉ dùng Kaggle-consented rows, chạy lại counts, annotation coverage và leakage; không dùng thống kê của toàn corpus thay cho tập thực sự đánh giá.

### 8.4. Annotation, số lượng và khóa

- [ ] Final test: 100% double annotation; mọi bất đồng/flag đã adjudicate hoặc loại.
- [ ] Final development: ≥20% double annotation sau lọc; lưu nhãn gốc, lý do và agreement trước adjudication.
- [ ] Không có nhãn từ rating/model/LLM; mixed/unresolved không bị đổi thành neutral để đủ support.
- [ ] Đủ target hoặc floor cả tổng lẫn từng lớp; có cả hotel/restaurant/attraction và bảng domain × label.
- [ ] Seed/group assignment/cleaning config/guideline/label-map versions và ordered row inventory có thật, hashes tính trên file thật.
- [ ] Người giữ test đã niêm phong file/quyền truy cập; người chọn model chưa dùng final test để tune.
- [ ] Ngày khóa có biên bản người phụ trách, evidence locators, counts và mọi hạn chế; không thay snapshot lặng lẽ sau khóa.

## 9. Lịch thực hiện và quyết định A/B

Đây là lịch công việc người phụ trách cần thực hiện tiếp, **không phải các hoạt động đã được T01 chạy**.

| Mốc giờ Việt Nam | Việc và đầu ra cần có |
|---|---|
| 28–29/10/2026 | Điền TODO bắt buộc; bố trí người giữ test, A/B/C; chọn công cụ; hoàn thiện form/notice/withdrawal và nơi lưu |
| 30/10–01/11/2026 | Thu/gán pilot 45–60; tổng hợp lỗi/hao hụt/khối lượng annotation; sửa và khóa guideline main |
| 02–05/11/2026 | Main collection theo nhóm riêng; PII/provenance review, annotation, dedupe và counts cập nhật |
| **06/11/2026 — TODO giờ chốt** | Ra quyết định A/B bằng bằng chứng đang có, ghi người chịu trách nhiệm và khả năng hoàn tất phần thiếu |
| 07–09/11/2026, nếu A có điều kiện | Hoàn tất phần thiếu đã cam kết, adjudication, cross-check, rút consent, group audit và kiểm rights theo môi trường chạy |
| **10/11/2026 — TODO giờ đóng/rút/khóa** | Khóa corpus đủ gate hoặc chốt B; không kéo dài để lấp support bằng câu giả/đổi nhãn |

### 9.1. Quyết định ngày 06/11/2026

**A — tiếp tục hướng thí nghiệm trên dữ liệu hợp lệ:** chọn khi có consent/provenance thật, quy trình pilot ổn định, nguồn lực A/B/C và bằng chứng đủ sàn hoặc kế hoạch phần thiếu có thể hoàn tất trước khóa. Ghi rõ `A — ĐÃ ĐỦ SÀN, CHỜ KIỂM KHÓA` hoặc `A — CÓ ĐIỀU KIỆN`; cả hai chưa phải quyền train hay chứng nhận PASS.

Với A có điều kiện, bắt buộc ghi số valid sau lọc theo lớp/pool hiện tại, số còn thiếu, tốc độ thu/gán nhãn thực từ pilot/main, người xử lý, số group độc lập và deadline từng phần. Không suy từ lời hứa sẽ thu được thành row hợp lệ. Nếu không chứng minh được khả năng hoàn thành hoặc có blocker quyền/PII/nguồn lực chưa xử lý được, chọn B ngay.

**B — giữ sentiment DEMO_ONLY:** chọn khi dưới sàn không có đường thực tế để đạt, thiếu quyền/provenance, không kiểm soát leakage, thiếu double annotation/adjudicator hoặc thiếu khả năng giữ test độc lập. Ghi blocker và dừng mở rộng scope; hoàn thiện recommendation/itinerary và báo cáo demo trung thực theo MVP. Dữ liệu đã thu không tự trở thành demo/public dataset; vẫn tuân consent/retention, có thể giữ restricted/unreleased theo phạm vi đã cấp.

Ngày 06/11 chưa phải ngày khóa corpus. Không được đổi raw target thành count final hoặc đánh dấu gate dữ liệu PASS trước khi hoàn tất kiểm tra.

### 9.2. Khóa ngày 10/11/2026

Chỉ xác nhận **A cuối cùng** khi checklist mục 8 có bằng chứng thật và:

- Development ≥360, mỗi lớp ≥120; independent test ≥90, mỗi lớp ≥30, sau lọc và adjudication. Ghi đạt target hay chỉ floor.
- Quyền, PII, nguồn gốc, annotation coverage, leakage và quản lý test đạt protocol đã chốt; không còn TODO bắt buộc ảnh hưởng quyền/nhãn/split.
- Có đường xử lý đúng consent: Kaggle chỉ dùng các row có opt-in; nếu dùng local thì ghi rõ và có môi trường thực hiện. Sau mọi lọc theo quyền, **tập thực sự dùng** vẫn đủ floor.
- Snapshot, row inventory, annotation audit, withdrawal log, evidence locators và hashes được khóa bởi người phụ trách thật. Việc tạo manifest MVP mới thuộc task riêng sau này, không sửa manifest BLOCKED cũ.

Nếu A có điều kiện không hoàn tất hoặc bất kỳ gate bắt buộc thất bại đến giờ khóa, **chuyển B**, ghi nguyên nhân và không train/evaluate với quality claim. Không gia hạn ngầm qua 10/11, không phát minh consent/license/hashes.

Khóa ngày 10/11 là khóa dữ liệu và nhãn, không phải mở test cho tuning hoặc tự cho phép train/deploy. Test chỉ được đánh giá ở task sau khi cấu hình/phương pháp đã khóa; thay đổi sau khi xem test phải được ghi nhận và xử lý tư cách independent test.

### 9.3. Mẫu biên bản quyết định — chưa điền kết quả

| Trường | Giá trị chờ thực tế |
|---|---|
| Ngày/giờ, người quyết định | TODO |
| Nhánh A/B và lý do | TODO; chưa chọn |
| Raw / hợp lệ / bị loại / unresolved theo pool | TODO |
| NEGATIVE / NEUTRAL / POSITIVE theo pool và domain | TODO |
| Số tác giả/entity/scenario family/duplicate groups | TODO |
| Tỷ lệ test double-label; development overlap; agreement | TODO |
| Consent/withdrawal/Kaggle eligibility counts | TODO |
| Blocker; người xử lý; hạn; bằng chứng | TODO |
| Snapshot ID, file hashes, evidence locator | TODO; không tạo chuỗi hash minh họa |

## 10. Việc chủ dự án cần làm ngay sau T01

1. **Điền mục 2 và hoàn thiện notice/consent:** người phụ trách, công cụ, quyền truy cập, retention, kênh rút và các giờ chốt; kiểm tra cấu hình PII thực tế trước mở form.
2. **Bố trí ba người A/B/C và người giữ test**, thống nhất cách cấp mã tác giả/địa điểm/scenario mà không giữ danh tính. Chưa có thì ghi blocker cho mốc 06/11.
3. **Tự tạo form và kho riêng theo mẫu**, thử luồng quyền/withdrawal bằng submission kiểm thử được loại khỏi corpus; chưa gửi lời mời khi TODO về thông báo còn thiếu.
4. **Thu pilot 45–60 phản hồi nguyên gốc**, gán nhãn độc lập, sửa guideline và chốt chính sách agreement/đóng góp trước main collection. Pilot giữ riêng.
5. **Theo dõi counts thực theo lớp/pool và chất lượng group**, quyết định A/B ngày 06/11 và khóa/ngừng ở ngày 10/11/2026 theo tiêu chí trên.

**Điểm dừng T01:** hoàn thành tài liệu chuẩn bị. Không có consent nào đã được cấp chỉ bởi việc viết file này; không có dữ liệu đã được thu hay nhãn đã được chốt. Các công việc thực thi và mọi yêu cầu triển khai tiếp cần được giao thành task riêng.
