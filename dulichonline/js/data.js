/* =====================================================================
   DỮ LIỆU ĐIỂM ĐẾN — file bạn sẽ sửa nhiều nhất.

   Mỗi điểm đến gồm:
   - id:        mã duy nhất, không dấu, không khoảng trắng
   - name:      tên hiển thị
   - label:     tên ngắn trên bản đồ; labelSide: "left" | "right"
   - region:    "Miền Bắc" | "Miền Trung" | "Miền Nam"
   - lat, lon:  tọa độ thật (lấy từ Google Maps: chuột phải → copy tọa độ)
   - intro:     đoạn giới thiệu ngắn
   - pano:      đường dẫn ảnh 360° (ảnh equirectangular tỉ lệ 2:1, ví dụ
                "images/hoi-an.jpg"). Để null thì web tự vẽ cảnh minh họa.
   - scene:     kiểu cảnh minh họa khi chưa có ảnh thật:
                city | lake | bay | mountain | citadel | oldtown | highland
                | market | river | beach
   - hotspots:  các điểm bấm trong cảnh 360°. yaw = góc ngang (-180..180),
                pitch = góc dọc (-90..90). Mở cảnh, nhìn góc dưới bên trái
                màn hình để lấy yaw/pitch hiện tại.
   - quiz:      câu đố để nhận dấu hộ chiếu. answer = vị trí đáp án đúng (0,1,2…)
   - realTrip:  link "Muốn đến thật?" (tour, khách sạn, bài viết…)
   ===================================================================== */

window.DESTINATIONS = [
  {
    id: "ha-noi",
    label: "Hà Nội", labelSide: "left",
    name: "Hồ Gươm – Hà Nội",
    region: "Miền Bắc",
    lat: 21.0287, lon: 105.8524,
    intro: "Trái tim của thủ đô nghìn năm văn hiến. Tháp Rùa giữa hồ, cầu Thê Húc đỏ son dẫn vào đền Ngọc Sơn, và phố cổ 36 phố phường ngay bên cạnh.",
    pano: null,
    scene: "lake",
    hotspots: [
      { yaw: 0,    pitch: -2, title: "Tháp Rùa", text: "Xây cuối thế kỷ 19 trên gò Rùa giữa hồ, gắn với truyền thuyết vua Lê Lợi trả gươm thần cho Rùa Vàng." },
      { yaw: 75,   pitch: -4, title: "Cầu Thê Húc", text: "Cây cầu gỗ sơn đỏ dẫn vào đền Ngọc Sơn. Tên cầu có nghĩa là \"nơi đậu ánh sáng ban mai\"." },
      { yaw: -110, pitch: -6, title: "Phố cổ", text: "36 phố phường, mỗi phố từng chuyên một nghề: Hàng Bạc, Hàng Mã, Hàng Đường…" }
    ],
    quiz: { q: "Theo truyền thuyết, vua Lê Lợi trả gươm thần cho ai tại hồ này?", options: ["Rồng Vàng", "Rùa Vàng", "Lạc Long Quân"], answer: 1 },
    realTrip: ""
  },
  {
    id: "ha-long",
    label: "Hạ Long", labelSide: "right",
    name: "Vịnh Hạ Long",
    region: "Miền Bắc",
    lat: 20.9101, lon: 107.1839,
    intro: "Di sản Thiên nhiên Thế giới với gần 2.000 hòn đảo đá vôi nhô lên giữa làn nước xanh ngọc.",
    pano: null,
    scene: "bay",
    hotspots: [
      { yaw: 20,  pitch: 0,  title: "Hòn Trống Mái", text: "Hai khối đá như đôi gà đứng đối mặt nhau, biểu tượng nổi tiếng nhất của vịnh." },
      { yaw: -60, pitch: -8, title: "Thuyền buồm", text: "Du thuyền ngủ đêm trên vịnh là trải nghiệm được yêu thích nhất." },
      { yaw: 140, pitch: 2,  title: "Hang Sửng Sốt", text: "Một trong những hang động rộng và đẹp nhất vịnh, nằm trên đảo Bồ Hòn." }
    ],
    quiz: { q: "Vịnh Hạ Long thuộc tỉnh nào?", options: ["Hải Phòng", "Quảng Ninh", "Thái Bình"], answer: 1 },
    realTrip: ""
  },
  {
    id: "sa-pa",
    label: "Sa Pa", labelSide: "right",
    name: "Sa Pa – Ruộng bậc thang",
    region: "Miền Bắc",
    lat: 22.3364, lon: 103.8438,
    intro: "Thị trấn mờ sương giữa dãy Hoàng Liên Sơn, nơi có Fansipan — nóc nhà Đông Dương — và những thửa ruộng bậc thang uốn lượn.",
    pano: null,
    scene: "mountain",
    hotspots: [
      { yaw: 0,   pitch: 8,  title: "Đỉnh Fansipan", text: "Cao 3.143 m, đỉnh núi cao nhất Việt Nam, Lào và Campuchia." },
      { yaw: 100, pitch: -12, title: "Ruộng bậc thang", text: "Đẹp nhất vào mùa nước đổ (tháng 5–6) và mùa lúa chín (tháng 9)." }
    ],
    quiz: { q: "Fansipan cao khoảng bao nhiêu mét?", options: ["2.143 m", "3.143 m", "4.143 m"], answer: 1 },
    realTrip: ""
  },
  {
    id: "hue",
    label: "Huế", labelSide: "left",
    name: "Đại Nội – Huế",
    region: "Miền Trung",
    lat: 16.4698, lon: 107.5786,
    intro: "Kinh thành của triều Nguyễn, nằm bên bờ sông Hương. Ngọ Môn, điện Thái Hòa và hệ thống lăng tẩm làm nên quần thể di tích Cố đô Huế.",
    pano: null,
    scene: "citadel",
    hotspots: [
      { yaw: 0,   pitch: 4,  title: "Ngọ Môn", text: "Cổng chính vào Hoàng thành, trên có lầu Ngũ Phụng với 9 mái lợp ngói." },
      { yaw: -90, pitch: -6, title: "Sông Hương", text: "Dòng sông thơ mộng chảy qua lòng thành phố, gắn với điệu ca Huế trên thuyền rồng." }
    ],
    quiz: { q: "Cố đô Huế là kinh đô của triều đại nào?", options: ["Nhà Lý", "Nhà Trần", "Nhà Nguyễn"], answer: 2 },
    realTrip: ""
  },
  {
    id: "hoi-an",
    label: "Hội An", labelSide: "right",
    name: "Phố cổ Hội An",
    region: "Miền Trung",
    lat: 15.8770, lon: 108.3270,
    intro: "Thương cảng sầm uất thế kỷ 16–17, giờ là phố cổ với nhà tường vàng, mái ngói rêu phong và hàng nghìn chiếc đèn lồng.",
    pano: null,
    scene: "oldtown",
    hotspots: [
      { yaw: 0,   pitch: 0,  title: "Chùa Cầu", text: "Cây cầu có mái do thương nhân Nhật Bản xây, hình in trên tờ tiền 20.000 đồng." },
      { yaw: 120, pitch: 10, title: "Đèn lồng", text: "Đêm rằm hằng tháng, phố cổ tắt đèn điện và chỉ thắp đèn lồng." },
      { yaw: -120, pitch: -10, title: "Sông Hoài", text: "Thả hoa đăng trên sông Hoài để cầu may." }
    ],
    quiz: { q: "Chùa Cầu Hội An xuất hiện trên tờ tiền mệnh giá nào?", options: ["10.000 đồng", "20.000 đồng", "50.000 đồng"], answer: 1 },
    realTrip: ""
  },
  {
    id: "da-lat",
    label: "Đà Lạt", labelSide: "right",
    name: "Đà Lạt – Thành phố ngàn hoa",
    region: "Miền Nam",
    lat: 11.9404, lon: 108.4583,
    intro: "Cao nguyên Lâm Viên mát lạnh quanh năm, rừng thông, hồ Xuân Hương và những biệt thự Pháp cổ.",
    pano: null,
    scene: "highland",
    hotspots: [
      { yaw: 0,   pitch: -4, title: "Hồ Xuân Hương", text: "Hồ nước hình trăng lưỡi liềm ngay trung tâm thành phố." },
      { yaw: 140, pitch: 0,  title: "Đồi thông", text: "Đà Lạt nằm ở độ cao khoảng 1.500 m, nhiệt độ trung bình 18–21°C." }
    ],
    quiz: { q: "Đà Lạt thuộc tỉnh nào?", options: ["Lâm Đồng", "Đắk Lắk", "Gia Lai"], answer: 0 },
    realTrip: ""
  },
  {
    id: "sai-gon",
    label: "TP.HCM", labelSide: "right",
    name: "Chợ Bến Thành – TP.HCM",
    region: "Miền Nam",
    lat: 10.7725, lon: 106.6980,
    intro: "Biểu tượng hơn trăm năm của Sài Gòn. Bên trong là cả nghìn sạp hàng, bên ngoài là nhịp sống không ngừng của thành phố.",
    pano: null,
    scene: "city",
    hotspots: [
      { yaw: 0,   pitch: 4,  title: "Cửa Nam", text: "Cổng chính có tháp đồng hồ, xây năm 1914." },
      { yaw: -80, pitch: -6, title: "Khu ăn uống", text: "Thử bánh xèo, bún mắm, chè ngay trong chợ." },
      { yaw: 110, pitch: 10, title: "Tòa nhà Bitexco", text: "Tòa tháp có sân đỗ trực thăng, nhìn thấy từ khắp quận 1." }
    ],
    quiz: { q: "Tháp đồng hồ chợ Bến Thành nằm ở cửa nào?", options: ["Cửa Bắc", "Cửa Nam", "Cửa Tây"], answer: 1 },
    realTrip: "https://hcmcinsider.com"
  },
  {
    id: "can-tho",
    label: "Cần Thơ", labelSide: "left",
    name: "Chợ nổi Cái Răng – Cần Thơ",
    region: "Miền Nam",
    lat: 10.0024, lon: 105.7480,
    intro: "Chợ họp trên sông từ tờ mờ sáng. Mỗi ghe treo hàng mình bán lên cây \"bẹo\" để khách nhìn từ xa.",
    pano: null,
    scene: "river",
    hotspots: [
      { yaw: 10,  pitch: -4, title: "Cây bẹo", text: "Cây sào cao treo trái cây, rau củ: treo gì thì bán nấy." },
      { yaw: -100, pitch: -8, title: "Hủ tiếu trên ghe", text: "Ăn sáng ngay trên ghe nhỏ len lỏi giữa chợ." }
    ],
    quiz: { q: "Trên chợ nổi, cây sào treo hàng hóa gọi là gì?", options: ["Cây bẹo", "Cây nêu", "Cây chèo"], answer: 0 },
    realTrip: ""
  },
  {
    id: "phu-quoc",
    label: "Phú Quốc", labelSide: "left",
    name: "Đảo Phú Quốc",
    region: "Miền Nam",
    lat: 10.2270, lon: 103.9670,
    intro: "Đảo ngọc lớn nhất Việt Nam: bãi cát trắng, nước biển trong và hoàng hôn rực đỏ trên vịnh Thái Lan.",
    pano: null,
    scene: "beach",
    hotspots: [
      { yaw: 0,   pitch: 2,  title: "Hoàng hôn", text: "Bãi Dài và Bãi Trường là nơi ngắm hoàng hôn đẹp nhất đảo." },
      { yaw: 160, pitch: -4, title: "Rừng dừa", text: "Hơn một nửa diện tích đảo là vườn quốc gia." }
    ],
    quiz: { q: "Phú Quốc thuộc tỉnh nào?", options: ["Cà Mau", "Kiên Giang", "Bạc Liêu"], answer: 1 },
    realTrip: ""
  }
];
