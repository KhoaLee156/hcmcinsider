/* Try Saigon: the story, prices and phrases of the practice day.
   Edit this file to change the day. The engine is assets/try-saigon/game.js.

   Each chapter has: id, time (minutes after midnight when it starts), place / placeVi,
   skill (the badge it trains) and steps. Step types:
     say       narration and dialogue. lines: [{who, vi, en}]
     choice    options; each can cost time (min), money (vnd), give skill points and a result text
     exchange  change home cash into dong (uses the live rate from /api/rate)
     order     pick dishes from a menu, see your order in Vietnamese, then pay
     pay       hand over notes for a fixed amount
     cross     the street-crossing game
     pano      look around 360°, with hotspots (pano: "/assets/photos/x.jpg" for a real photo, else scene is painted)
     haggle    bargain for an item
     ride      ride-hailing app: book, check the plate, pay
   Prices marked "example" are typical, not a quote. Facts come from the guides on this site. */

window.TRIP = {
  startCash: 100,             // home-currency cash in the wallet on arrival
  fallbackRate: { USD: 26300, EUR: 30400, GBP: 34600, AUD: 17200 }, // dong per unit, used only if the live rate can't load
  spreads: {                  // how far below the mid-market rate each place buys your cash (example values)
    airport: 0.985,
    goldshop: 0.997
  },

  chapters: [
    {
      id: "arrive", time: 8 * 60 + 40, place: "Tan Son Nhat Airport, Terminal 2", placeVi: "Sân bay Tân Sơn Nhất",
      skill: "money",
      steps: [
        { type: "say", text: "You land at Tan Son Nhat (SGN) on an international flight, so you are in Terminal 2. The air outside is warm and wet, even at 8:40 in the morning. You have {startCash} in cash, a contactless bank card and your phone." },
        { type: "choice", prompt: "First thing: how do you get online?",
          options: [
            { label: "Turn on the eSIM I installed before flying", min: 2, skill: { smart: 1 },
              result: "Data works before you reach the baggage belt. No queue and no passport registration at a kiosk." },
            { label: "Buy a local SIM in the arrivals hall", min: 25, vnd: 0,
              result: "There are kiosks of the big networks in the hall. You need your passport to register the SIM and today there is a queue: 25 minutes gone. (In the game the SIM is free; at the airport you pay for it.)" },
            { label: "Stay offline and use airport Wi-Fi", min: 5,
              result: "Fine inside the terminal, but you won't be able to book a ride-hailing car once you step outside." , flag: "offline" }
          ] },
        { type: "say", text: "Small food stalls, street carts and most taxis want cash, so you need dong. The counters in the hall post their buy rates on a board." },
        { type: "exchange", where: "airport" },
        { type: "say", tip: "Vietnamese notes go from 1,000 to 500,000 dong. The 500,000 and the 20,000 are both blue: check the zeros before you pay. Keep small notes (10,000 to 100,000) for taxis and stalls." }
      ]
    },

    {
      id: "transfer", time: 9 * 60 + 20, place: "Arrivals hall, Terminal 2", placeVi: "Sảnh đến, Ga quốc tế",
      skill: "transport",
      steps: [
        { type: "say", lines: [{ who: "Man in the hall", vi: "Taxi? Taxi? Đi đâu?", en: "Taxi? Where to?" }],
          text: "Your hotel is in District 1, about 7 km away. A man walks up to you inside the hall." },
        { type: "choice", prompt: "How do you get to District 1?",
          options: [
            { label: "Bus 152 to Ben Thanh Market", sub: "Free until 31 Dec 2026 · about 45–60 min",
              min: 55, skill: { transport: 2 }, goto: "bus",
              result: "The stop is outside arrivals. When you board you tap your contactless card on the reader: it only records the trip, nothing is charged." },
            { label: "Book a car in a ride-hailing app", sub: "Grab, Xanh SM or Be · price shown before you book",
              min: 30, needs: "online", skill: { transport: 1, smart: 1 }, goto: "app",
              result: "You follow the signs to the app pickup area outside arrivals." },
            { label: "Metered taxi from the official rank", sub: "Outside arrivals · check the meter is on",
              min: 30, skill: { transport: 1 }, goto: "taxi",
              result: "You walk past the people inside the hall to the official rank outside." },
            { label: "Go with the man in the hall", sub: "He says “cheap price, no meter”",
              min: 35, skill: { smart: -2 }, goto: "tout",
              result: "His car is in the parking garage. At the hotel he asks for far more than the meter or the app would have shown." }
          ] },
        { id: "bus", type: "say", text: "Bus 152 runs in the daytime from the airport past Ben Thanh Market. You watch the city fill up with motorbikes. You get off at Ben Thanh, a short walk from your hotel.", next: "transfer-done" },
        { id: "app", type: "ride", app: "car", from: "Tan Son Nhat T2", to: "Your hotel, District 1",
          fare: 150000, fareNote: "Example fare; the app shows the real one before you book.", plate: "51K-628.47", next: "transfer-done" },
        { id: "taxi", type: "pay", amount: 160000, to: "Taxi driver", vi: "Tới rồi. Một trăm sáu mươi ngàn.", en: "Here we are. 160,000.",
          note: "Example meter reading. Pay what the meter shows; small notes help.", next: "transfer-done" },
        { id: "tout", type: "pay", amount: 500000, to: "The man from the hall", vi: "Năm trăm ngàn.", en: "500,000.",
          note: "Unofficial drivers often quote a high fixed price. Inside the hall, ignore offers of a ride and walk to the official rank or the app pickup area.", next: "transfer-done" },
        { id: "transfer-done", type: "say", text: "You drop your bag at the hotel. Breakfast time." }
      ]
    },

    {
      id: "banhmi", time: 10 * 60 + 30, place: "A bánh mì cart, District 1", placeVi: "Xe bánh mì",
      skill: "food",
      steps: [
        { type: "say", lines: [{ who: "Bánh mì seller", vi: "Ăn gì con?", en: "What will you have, dear?" }],
          text: "A glass cart on the pavement: baguettes, cold cuts, pâté, pickles, herbs, chilli. A few people wait on small stools." },
        { type: "order", vendor: "Bánh mì seller", tableNote: "Point and smile also works.",
          menu: [
            { vi: "bánh mì thịt", en: "banh mi with cold cuts and pâté", unit: "ổ", price: 25000 },
            { vi: "bánh mì trứng", en: "banh mi with fried egg", unit: "ổ", price: 20000 },
            { vi: "sữa đậu nành", en: "soy milk", unit: "ly", price: 10000 }
          ],
          options: [
            { vi: "không cay", en: "not spicy" },
            { vi: "không ngò", en: "no coriander" },
            { vi: "mang đi", en: "to take away" }
          ],
          priceNote: "Example prices; bánh mì in District 1 usually costs 20,000–35,000 dong.",
          smallChange: true }
      ]
    },

    {
      id: "street", time: 11 * 60, place: "Crossing Le Loi to Ben Thanh Market", placeVi: "Băng qua đường Lê Lợi",
      skill: "street",
      steps: [
        { type: "say", text: "Ben Thanh Market is on the other side of a busy street. There is a crossing, but the motorbikes keep coming.",
          tip: "How locals cross: wait for a gap, then walk at a slow, steady pace and don't stop or run. Riders watch you and steer around where you will be. Raise a hand so they see you." },
        { type: "cross", lanes: 4, traffic: 1 }
      ]
    },

    {
      id: "market", time: 11 * 60 + 20, place: "Ben Thanh Market", placeVi: "Chợ Bến Thành",
      skill: "haggle",
      steps: [
        { type: "pano", scene: "city", text: "Drag to look around the south gate. Tap the red dots.",
          hotspots: [
            { yaw: 0, pitch: 4, title: "South gate and clock tower", text: "The market's main gate, with the clock tower that is on every postcard of Saigon. Open about 6 am to 6 pm; entry is free." },
            { yaw: -80, pitch: -6, title: "Food stalls", text: "Inside, the food stalls sit together in one part of the hall. A good place for a first try of many dishes." },
            { yaw: 110, pitch: 10, title: "Bitexco Tower", text: "The tower with the helipad. You can see it from much of District 1, which helps when you are lost." }
          ],
          link: { text: "Ben Thanh Market guide →", href: "/see-and-do/ben-thanh-market/" } },
        { type: "say", lines: [{ who: "Hat seller", vi: "Nón lá đẹp nè! Mua đi em!", en: "Nice conical hats! Buy one!" }],
          text: "Stalls of conical hats, lacquer and T-shirts. Some stalls show fixed prices; this one doesn't." },
        { type: "haggle", item: "Conical hat", itemVi: "nón lá", ask: 250000, fair: 120000, floor: 100000,
          note: "Example prices. Start low but friendly, smile, and be ready to walk away. Once a price is agreed, buy." }
      ]
    },

    {
      id: "grab", time: 14 * 60, place: "Ben Thanh to Cholon", placeVi: "Bến Thành đi Chợ Lớn",
      skill: "transport",
      steps: [
        { type: "say", text: "After a rest at the hotel through the hottest hours, you head to Cholon, Saigon's Chinatown, about 6 km west. The metro doesn't go there yet, so you book a motorbike ride." },
        { type: "ride", app: "bike", from: "Ben Thanh Market", to: "Phung Hung Market, Cholon", fare: 38000,
          fareNote: "Example fare; the app shows the real one before you book.", plate: "59X3-417.26",
          tip: "The driver hands you a helmet: put it on and fasten the strap. Keep your phone away from the street side." }
      ]
    },

    {
      id: "coffee", time: 15 * 60, place: "A sidewalk coffee stall, Cholon", placeVi: "Cà phê vỉa hè",
      skill: "food",
      steps: [
        { type: "say", lines: [{ who: "Coffee seller", vi: "Uống gì em?", en: "What would you like to drink?" }],
          text: "Low plastic stools facing the street, a big kettle, glasses of strong coffee dripping through metal filters." },
        { type: "order", vendor: "Coffee seller",
          menu: [
            { vi: "cà phê sữa đá", en: "iced coffee with condensed milk", unit: "ly", price: 20000 },
            { vi: "cà phê đen đá", en: "iced black coffee", unit: "ly", price: 18000 },
            { vi: "bạc xỉu", en: "milky iced coffee", unit: "ly", price: 22000 }
          ],
          options: [{ vi: "ít đường", en: "less sugar" }, { vi: "ít đá", en: "less ice" }],
          priceNote: "Example prices for a sidewalk stall; cafés charge more.",
          tip: "A glass of iced tea (trà đá) often comes with your coffee." }
      ]
    },

    {
      id: "dinner", time: 17 * 60 + 30, place: "Sidewalk Noodles, 187 Huynh Man Dat", placeVi: "Hủ tiếu vỉa hè 187 Huỳnh Mẫn Đạt",
      skill: "food",
      steps: [
        { type: "say", lines: [{ who: "Noodle seller", vi: "Mấy tô em?", en: "How many bowls?" }],
          text: "A real stall from this site: it opens at 5 pm and is known for dry hủ tiếu mì with the soup on the side.",
          link: { text: "See the place: address, videos and tips →", href: "/places/sidewalk-noodles-187-huynh-man-dat/" } },
        { type: "order", vendor: "Noodle seller",
          menu: [
            { vi: "hủ tiếu mì khô", en: "dry rice and egg noodles, soup on the side", unit: "tô", price: 30000 },
            { vi: "hủ tiếu nước", en: "hu tieu in soup", unit: "tô", price: 30000 },
            { vi: "trà đá", en: "iced tea", unit: "ly", price: 3000 }
          ],
          options: [{ vi: "không hành", en: "no spring onion" }, { vi: "thêm trứng cút", en: "extra quail eggs" }],
          priceNote: "The stall charges 25,000–35,000 dong a bowl (from the creators' videos); 30,000 here is an example.",
          bill: true }
      ]
    }
  ],

  skills: {
    money: { name: "Money", vi: "Tiền", good: "You know your notes and got a fair rate.", learn: "/guides/arriving-in-saigon/" },
    transport: { name: "Getting around", vi: "Đi lại", good: "Bus, app and taxi: you know which to use.", learn: "/guides/getting-around-hcmc/" },
    food: { name: "Ordering", vi: "Gọi món", good: "You can order and pay at a street stall.", learn: "/guides/cholon-food-guide/" },
    street: { name: "Crossing the street", vi: "Qua đường", good: "Slow and steady: you crossed like a local.", learn: "/guides/getting-around-hcmc/" },
    haggle: { name: "Bargaining", vi: "Trả giá", good: "Friendly, firm, fair price.", learn: "/see-and-do/ben-thanh-market/" },
    smart: { name: "Street smarts", vi: "Khôn ngoan", good: "You avoided the classic traps.", learn: "/guides/arriving-in-saigon/" }
  }
};
