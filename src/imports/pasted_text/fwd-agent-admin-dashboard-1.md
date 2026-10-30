Thiết kế UI/UX cho một web app quản trị (Admin/BTC Dashboard) dùng để vận hành chương 
trình tuyển chọn Agent/Advisor của FWD — quản lý toàn bộ participant, nội dung, chấm 
điểm, phỏng vấn, và báo cáo, đi qua 4 round có ngày cụ thể và cơ chế điểm 3 dimensions.

PRODUCT CONTEXT:
- Đối tượng dùng: BTC chương trình, Team Head, GAD, reviewer — người vận hành, cần 
  thao tác nhanh trên số lượng lớn dữ liệu (2000 → 500 → 250 → 60 → Graduate).
- Mục tiêu UX: tối ưu tốc độ xử lý hàng loạt (bulk actions), tra cứu nhanh, chấm điểm 
  không rời màn hình, và visualize funnel/scorecard rõ ràng để ra quyết định go/no-go 
  từng vòng. Ưu tiên density thông tin cao hơn portal user.
- Tone & style: chuyên nghiệp, đáng tin cậy, tông xanh đậm (#0B3D2E) làm màu chủ đạo, 
  kết hợp trắng/xám cho nền, accent cam đồng bộ brand portal user (#FF6B00). Layout 
  dashboard chuẩn enterprise: sidebar trái cố định, top bar, content area dạng bảng/thẻ.
- Thiết bị: desktop-first, không cần tối ưu mobile.

INFORMATION ARCHITECTURE (Sitemap — bám sát BFD 9 nhóm chức năng):

1. Quản lý cấu hình chương trình
   1.1 Trang thông tin chương trình: form CMS-style để soạn giới thiệu, mục tiêu, đối 
       tượng, quyền lợi, FAQ — có preview trước khi công bố
   1.2 Trang quản lý Round & Timeline: bảng danh sách round dạng timeline ngang (kéo-thả 
       chỉnh ngày bắt đầu/kết thúc), mỗi round mở rộng ra xem hoạt động bên trong, toggle 
       trạng thái round (Chưa mở → Đang mở → Đã đóng). Trạng thái này là điều kiện khóa/
       mở chỉnh sửa threshold ở mục 1.4 — cần thiết kế rõ badge trạng thái round này ở 
       nhiều nơi khác trong hệ thống (Dashboard, Scorecard...) để Admin luôn biết round nào 
       đang có thể chỉnh cấu hình, round nào đã khóa
   1.3 Trang thể lệ & tiêu chí: form cấu hình điều kiện tham gia, submission rules, retry 
       policy, quy trình xét kết quả — dạng rule builder (if-then đơn giản)
   1.4 Trang điều kiện qua vòng: form thiết lập threshold (điểm tối thiểu, % hoàn thành, 
       nhiệm vụ bắt buộc) theo từng round, hiển thị dạng bảng so sánh threshold các round 
       cạnh nhau (60/70/75...). Field threshold CHỈ cho phép chỉnh sửa khi round ở trạng 
       thái "chưa mở" — tự động khóa (disable + tooltip giải thích) ngay khi round chuyển 
       sang "đang mở" để tránh sửa threshold giữa chừng làm sai lệch kết quả đã chấm
   1.5 Trang trọng số 3 dimensions: bảng ma trận editable inline — hàng là round (R1-R4), 
       cột là Capability/Commitment/Advisory Fit, ô nhập % trọng số, có validate tổng = 100%
   1.6 Toggle trạng thái mở/đóng: các switch lớn, rõ ràng ở đầu trang cấu hình 
       (mở đăng ký/đóng đăng ký/mở round/khóa round/mở-đóng submission)

2. Quản lý nội dung đào tạo
   2.1 Trang khóa học & tài liệu: quản lý dạng course builder — tạo khóa học → thêm 
       module → upload video/tài liệu, kéo-thả sắp xếp thứ tự, gán vào round
   2.2 Trang bộ câu hỏi MBTI: form tạo câu hỏi + phương án trả lời, bảng logic phân loại 
       kết quả (mapping answer combination → nhóm tính cách), preview kết quả công bố
   2.3 Trang mini test/MCQ: form tạo bài test, thêm câu hỏi + đáp án đúng, thiết lập điểm 
       đạt/số lần làm/thời gian làm bài
   2.4 Trang kịch bản AI Simulation: flow builder — tạo customer persona, viết customer 
       story/tình huống, thêm câu hỏi mô phỏng + các nhánh phản hồi, gán competency 
       rubric cho AI chấm, cấu hình AI feedback & suggested score, số lần retry
   2.5 Trang assignment & challenge: form tạo assignment/social challenge/team 
       challenge/bài luận/bài thi cuối round — định dạng bài nộp, deadline, barem gắn kèm
   2.6 Trang gán nội dung theo round: ma trận kéo-thả liên kết khóa học/MBTI/mini 
       test/AI Simulation/assignment/challenge vào từng round

3. Quản lý người tham gia
   3.1 Trang duyệt đăng ký: danh sách hồ sơ chờ duyệt dạng queue, mở chi tiết xem 
       thông tin, nút Duyệt/Từ chối/Yêu cầu bổ sung
   3.2 Trang danh sách Participant: bảng lớn filter/search theo tên, trường, ngành, round, 
       team, điểm, hướng phát triển, trạng thái — có bulk select
   3.3 Trang quản lý Team & Mentor: giao diện dạng board — kéo-thả participant vào 
       team, gán mentor, xem sĩ số từng team
   3.4 Trang phân loại hướng phát triển: bảng/kanban theo trạng thái Ambassador/Đào 
       tạo chính thức/Chờ đánh giá/Không tiếp tục (nhánh "Không tiếp tục" ở đây LÀ trạng 
       thái Admin set thủ công khi participant tự rút lui hoặc vi phạm compliance — khác 
       với "Not Qualified" ở mục 3.5, vốn do hệ thống tự set khi điểm không đạt threshold; 
       UI cần có tooltip/ghi chú phân biệt rõ 2 lý do này để Admin không nhầm), bulk update
   3.5 Trang cập nhật trạng thái qua vòng (Round Status — trạng thái CẤP ROUND, không 
       phải cấp bài nộp): bảng participant với dropdown trạng thái (In Progress/Qualified/
       Not Qualified/Completed), highlight màu theo trạng thái. LƯU Ý: không có trạng thái 
       "Retry" ở màn hình này — vì cơ chế chương trình là chọn Top-N theo điểm mỗi round 
       (500→250→60), hết hạn round là chốt danh sách, không cho làm lại cả round. 
       "Retry" chỉ tồn tại ở cấp bài nộp riêng lẻ (xem mục 4.5 Submission Status), không 
       áp dụng cho cả round
   3.6 Trang quản lý đóng cổng submission: đồng hồ đo real-time số đã nộp/target, cảnh 
       báo khi gần đạt target, nút đóng cổng thủ công + log gia hạn

4. Quản lý đánh giá bài nộp
   4.1 Trang danh sách bài nộp: queue lọc theo loại bài nộp, deadline, định dạng, trạng 
       thái hợp lệ
   4.2 Trang quản lý barem: form tạo tiêu chí, gán vào dimension, thiết lập trọng số/điểm 
       tối đa, gán barem theo assignment hoặc round
   4.3 Màn hình chấm điểm (màn hình quan trọng nhất): 2 cột — bên trái nội dung bài nộp 
       (file/link/text), bên phải form chấm từng tiêu chí + ô nhận xét, nút Lưu nháp/Gửi 
       kết quả, không rời màn hình khi chuyển bài tiếp theo (next/prev ngay trong màn hình)
   4.4 Trang feedback: form gửi feedback tổng quan + theo tiêu chí + điểm mạnh/điểm 
       cần cải thiện
   4.5 Trang yêu cầu nộp lại (Submission Status — trạng thái CẤP BÀI NỘP, tách biệt hoàn 
       toàn với Round Status ở mục 3.5): chuyển trạng thái bài nộp sang Retry, chọn lý do 
       (dropdown chuẩn hoá), đặt deadline mới, theo dõi trạng thái nộp lại. Vòng đời đầy đủ 
       của 1 bài nộp: Submitted → Reviewing → (Approved) hoặc (Retry → Resubmitted → 
       Approved) — hiển thị vòng đời này dạng stepper nhỏ trên mỗi bài nộp để Admin dễ 
       theo dõi đang ở bước nào
   4.6 Trang phê duyệt & chốt điểm: review điểm trước khi khóa, nút Phê duyệt/Khóa kết 
       quả, tự động đẩy vào Scorecard

5. Quản lý vòng phỏng vấn
   5.1 Trang barem phỏng vấn: tương tự 4.2 nhưng riêng cho interview, gồm 3 dimensions, 
       trọng số, mức đạt, nhận xét bắt buộc
   5.2 Trang phân công phỏng vấn: kéo-thả gán Team Head/GAD/reviewer vào từng ứng 
       viên hoặc nhóm
   5.3 Trang lịch phỏng vấn: calendar view, tạo khung giờ, gán ứng viên + người phỏng 
       vấn, đổi/hủy lịch, theo dõi trạng thái tham gia
   5.4 Trang tổng hợp kết quả phỏng vấn: bảng tổng hợp điểm/feedback từ nhiều 
       reviewer, highlight trường hợp chênh lệch điểm lớn để BTC xử lý
   5.5 Trang chốt Graduate: danh sách cuối cùng, xác nhận Graduate/Không đạt, xác định 
       hướng phát triển, nút chuyển sang Office Matching

6. Quản lý điểm và Scorecard
   6.1 Trang cơ chế cộng/trừ điểm: bảng cấu hình loại điểm, nguồn điểm, điều kiện, giá 
       trị (+10/+5/-5/-10/-20...), giới hạn điểm
   6.2 Trang duyệt điểm bonus/phạt: queue đề xuất điều chỉnh điểm, xem lý do, nút Phê 
       duyệt/Từ chối, lưu lịch sử
   6.3 Trang Scorecard tổng hợp: bảng lớn participant × round × dimension, có thể sort, 
       biểu đồ phân bố điểm (histogram) hỗ trợ set threshold, đánh dấu At Risk
   6.4 Trang điều chỉnh điểm thủ công: form nhập điểm điều chỉnh + lý do + đính kèm 
       minh chứng + audit history hiển thị ai đã sửa gì khi nào

7. Quản lý Office Matching và Ambassador
   7.1 Trang danh sách Office/AD: bảng quản lý thông tin liên hệ, nhu cầu tiếp nhận, số 
       lượng vị trí, tiêu chí matching
   7.2 Trang ghép Office: giao diện kéo-thả 2 cột (candidate Graduate ↔ Office/AD), đề 
       xuất matching tự động (gợi ý), xác nhận, theo dõi trạng thái tiếp nhận
   7.3 Trang quản lý Ambassador: danh sách, trạng thái xác nhận, xác nhận thưởng. 
       [GIẢ ĐỊNH cần xác nhận: Ambassador KHÔNG tính điểm theo Scorecard 3 dimensions 
       như track Đào tạo chính thức — chỉ xét theo lượt tương tác/reach content để chọn 
       Top 10. Nếu đúng vậy, trang này KHÔNG dùng chung bảng điểm với Scorecard ở 
       mục 6, mà cần 1 bảng "Ambassador Leaderboard" riêng — xếp hạng theo số 
       lượt tương tác/reach, không theo Capability/Commitment/Advisory Fit]
   7.4 Trang theo dõi social Ambassador: bảng link bài đăng + minh chứng + trạng thái 
       kiểm duyệt + số liệu tương tác (views/likes/shares) làm căn cứ xếp hạng Top 10, 
       tổng hợp kết quả truyền thông

8. Quản lý thông báo và tương tác
   8.1 Trang soạn announcement: rich text editor, chọn nhóm nhận (theo round/team/
       trạng thái), lịch gửi
   8.2 Trang nhắc deadline: cấu hình nhắc tự động theo loại deadline (khóa học/mini 
       test/assignment/bài thi/phỏng vấn), xem lịch sử đã gửi
   8.3 Trang hỗ trợ Participant: inbox dạng ticket, phân loại, phân công, trả lời, chuyển 
       câu hỏi phổ biến thành FAQ

9. Quản lý báo cáo và thống kê
   9.1 Dashboard funnel theo round: biểu đồ funnel chính (2000→500→250→60→Graduate
       →Office Matching), số liệu từng bước
   9.2 Dashboard tiến độ & hoàn thành: biểu đồ tỷ lệ hoàn thành học tập/mini test/
       assignment/challenge theo round
   9.3 Dashboard điểm theo 3 dimensions: điểm trung bình, phân bố điểm, so sánh giữa 
       round/nhóm, danh sách At Risk
   9.4 Dashboard submission & Office Matching: số bài đã nộp/chờ chấm/Retry/Graduate/
       trạng thái matching theo Office
   9.5 Trang xuất báo cáo: nút export ở mọi bảng (Excel/PDF) — danh sách, Scorecard, kết 
       quả round, báo cáo Graduate, báo cáo Office Matching

UX REQUIREMENTS:
- Sidebar navigation cố định bên trái theo đúng 9 nhóm trên, có thể thu gọn (collapse)
- Mọi bảng dữ liệu đều có: search, filter, sort, pagination, bulk select, export
- Màn hình chấm điểm (4.3) và tổng hợp phỏng vấn (5.4) là 2 màn hình dùng nhiều nhất — 
  ưu tiên thiết kế để reviewer làm việc liên tục không cần chuyển trang
- Data visualization nhất quán: funnel chart cho tiến độ, radar/bar chart cho 3 dimensions, 
  histogram cho phân bố điểm, calendar cho lịch phỏng vấn
- Trạng thái dùng badge màu nhất quán với portal user (xanh lá/vàng/đỏ)
- Empty state, loading state, và confirm dialog bắt buộc cho mọi hành động bulk/xóa/khóa 
  kết quả (vì đây là thao tác không thể hoàn tác ảnh hưởng nhiều participant)
- Mọi thay đổi điểm/threshold/trọng số cần có audit log hiển thị được (ai sửa, khi nào, 
  giá trị cũ → mới)

Hãy tạo wireframe/UI chi tiết cho: Dashboard funnel tổng quan (9.1), màn hình Chấm điểm 
bài nộp (4.3), trang Scorecard tổng hợp (6.3), và trang Danh sách Participant (3.2) 
trước tiên.