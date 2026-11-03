/* Try Saigon: the world of the practice day. Edit this file to change places, people, prices and phrases.
   The engine is assets/try-saigon/game.js; the painted 360° scenes come from scene.js.

   scenes: each one is a 360° place. bg = painted background (terminal, curb, street, gate, market, cholon),
     or pano: "/assets/photos/x.jpg" for a real equirectangular photo (2:1). yaw/pitch = where the player looks on arrival.
   objects: things in the scene. yaw = left/right position (-180..180, 0 = straight ahead), pitch = up/down.
     draw  = what scene.js paints there (leave it out when using a real photo)
     label = the name on the hotspot
     nav   = scene id: tapping walks there (an arrow)
     act   = what happens when the player taps (see action types in game.js):
             say, choice, exchange, atm, order, pay, haggle, ride, cross, wait, breaknote, end
     from  = minute of the day from which the object works; before that, closed = what is said instead
     once  = a flag name: after the action has been done once, done = what is said instead
     needs = a flag name the player must have first, with locked = what is said otherwise
   Actions can carry: min (minutes it takes), skill {name: points}, goal (a to-do id it completes),
     flag (a flag, or a list of flags, it sets), go (scene to move to after it).
   events: things that happen to the player on entering a scene, once (rain, a close call with a phone).
     scenes = where, from/to = time window (minutes after midnight), needs = a flag, rain = minutes of rain overlay.
     A scene with outdoor: false never shows rain.
   Choice options can also have needs/locked (a flag the option requires) and card {amount, what} (paid by card).
   A nav object can have min (minutes the walk takes).
   Real 360° photo: pano: "/assets/photos/x.jpg". For an iPhone Pano (a horizontal strip, not a full sphere) also set
     haov (degrees it covers left to right, 360 for a full turn) and vaov (degrees top to bottom, about 60–90).
     Then open /try-saigon/?edit, click where each person or stall is, and copy the yaw and pitch into its object.
   Prices marked "example" are typical, not quotes. Facts come from the guides on this site. */

window.TRIP = {
  startCash: 100,
  fallbackRate: { USD: 26300, EUR: 30400, GBP: 34600, AUD: 17200 },
  spreads: { airport: 0.985, goldshop: 0.997 },
  start: { scene: "arrivals", time: 8 * 60 + 40 },

  goals: [
    { id: "dong", text: "Get some Vietnamese dong" },
    { id: "city", text: "Get from the airport to District 1" },
    { id: "breakfast", text: "Eat breakfast" },
    { id: "cross", text: "Cross the street to Ben Thanh Market" },
    { id: "metro", text: "Ride the metro one stop" },
    { id: "souvenir", text: "Buy a souvenir in the market" },
    { id: "cholon", text: "Get to Cholon (Chinatown)" },
    { id: "coffee", text: "Have a Vietnamese coffee" },
    { id: "dinner", text: "Dinner at the noodle stall (opens 5 pm)" }
  ],

  scenes: {
    arrivals: {
      name: "Arrivals hall, Tan Son Nhat Terminal 2", nameVi: "Sảnh đến, Ga quốc tế", bg: "terminal", yaw: 0, outdoor: false,
      intro: "You land at Tan Son Nhat (SGN) on an international flight, so you are in Terminal 2. Drag to look around. Tap people and counters to talk to them.",
      objects: [
        { id: "exchange", yaw: -35, pitch: -4, label: "Exchange counter", draw: { kind: "counter", sign: "ĐỔI TIỀN", sign2: "Currency exchange", board: ["USD  BUY", "EUR  BUY"], staff: { shirt: "#fdfefe", vest: "#0E6655" } },
          act: { type: "exchange", where: "airport" } },
        { id: "sim", yaw: 25, pitch: -4, label: "SIM card kiosk", draw: { kind: "counter", sign: "SIM 4G · 5G", sign2: "Tourist SIM", color: "#1f5fa8", signBg: "#0d3c78", signFg: "#fff", staff: { shirt: "#1f5fa8" } },
          once: "online", done: { lines: [{ who: "SIM seller", vi: "Có mạng rồi mà em!", en: "You're already online!" }] },
          act: { type: "choice", prompt: "Get online for the day?", lines: [{ who: "SIM seller", vi: "Mua SIM không em? Có 5G nè.", en: "Want a SIM? We have 5G." }],
            options: [
              { label: "Buy a tourist SIM", sub: "Needs your passport · example price 200,000 ₫", min: 20, pay: { amount: 200000, to: "SIM seller", vi: "Hai trăm ngàn em.", en: "200,000." }, flag: ["online", "boughtSim"], skill: { smart: 1 },
                result: "She registers the SIM to your passport and you have data. There was a queue: 20 minutes." },
              { label: "I already have an eSIM", sub: "Installed before the flight", min: 1, flag: "online", skill: { smart: 2 },
                result: "You switch it on. Data works straight away: no queue, no registration." },
              { label: "No thanks", min: 0, flag: "noData", result: "Without data you can't book a ride-hailing car outside." }
            ] } },
        { id: "atm", yaw: 65, pitch: -2, label: "ATM", draw: { kind: "atm" }, act: { type: "atm" } },
        { id: "tout", yaw: -95, pitch: -2, label: "Man offering taxis", draw: { kind: "tout" },
          once: "toutDone", done: { lines: [{ who: "Man", vi: "…", en: "He's found someone else." }] },
          act: { type: "choice", lines: [{ who: "Man in the hall", vi: "Taxi? Taxi? Đi đâu? Rẻ lắm!", en: "Taxi? Where to? Very cheap!" }],
            prompt: "He walks up to you inside the hall.",
            options: [
              { label: "Go with him", sub: "“Cheap price, no meter”", min: 40, flag: ["toutDone", "carRide"], skill: { smart: -2 }, goal: "city", go: "d1",
                pay: { amount: 500000, to: "The man from the hall", vi: "Năm trăm ngàn.", en: "500,000." },
                result: "His car is in the parking garage. At your hotel he asks for 500,000 dong, far more than the meter or an app would show." },
              { label: "“Không, cảm ơn” (No, thank you)", min: 0, flag: "toutDone", skill: { smart: 1 },
                result: "He shrugs and moves on. Official taxis and app pickups are outside arrivals." }
            ] } },
        { id: "exit", yaw: 180, pitch: -6, label: "Exit to the street", nav: "curb", draw: { kind: "door", sign: "LỐI RA · EXIT", sign2: "Taxi · Bus · Xe công nghệ" } }
      ]
    },

    curb: {
      name: "Outside arrivals, Terminal 2", nameVi: "Sảnh đón, Ga quốc tế", bg: "curb", yaw: 0,
      intro: "Warm, wet air even at this hour. Buses, taxis and app pickups all leave from here.",
      objects: [
        { id: "bus", yaw: -40, pitch: -2, label: "Bus 152 to Ben Thanh", draw: { kind: "busstop" },
          act: { type: "choice", lines: [{ who: "Bus attendant", vi: "Một năm hai đi Bến Thành nè!", en: "152 to Ben Thanh!" }],
            prompt: "Bus 152 runs in the daytime past Ben Thanh Market. City buses are free until 31 December 2026: you only tap a contactless card on the reader to record the trip.",
            options: [
              { label: "Get on and tap your card", sub: "Free · about 45–60 minutes", min: 55, goal: "city", go: "d1", skill: { transport: 2 },
                result: "The reader beeps; nothing is charged. You watch the city fill up with motorbikes and get off near Ben Thanh, close to your hotel." },
              { label: "Not now", min: 0, result: "The next one comes along in a while." }
            ] } },
        { id: "taxi", yaw: 35, pitch: -2, label: "Official taxi rank", draw: { kind: "taxi" },
          act: { type: "choice", lines: [{ who: "Taxi driver", vi: "Đi đâu anh/chị?", en: "Where to?" }], prompt: "A metered taxi from the official rank.",
            options: [
              { label: "“Quận 1, khách sạn” (District 1, hotel)", sub: "Metered · example fare", min: 30, flag: "carRide", goal: "city", go: "d1", skill: { transport: 1 },
                pay: { amount: 160000, to: "Taxi driver", vi: "Tới rồi. Một trăm sáu mươi ngàn.", en: "Here we are. 160,000." },
                result: "You check the meter is on. Half an hour in traffic and you're at your hotel." },
              { label: "Not now", min: 0, result: "" }
            ] } },
        { id: "pickup", yaw: 105, pitch: -2, label: "Ride-app pickup point", draw: { kind: "pickup" }, needs: "online",
          locked: { text: "You have no mobile data, so you can't book a ride here. Get a SIM inside, or take the bus or a taxi." },
          act: { type: "ride", app: "car", from: "Tan Son Nhat T2", to: "Your hotel, District 1", fare: 150000, plate: "51K-628.47",
            fareNote: "Example fare; the app shows the real one before you book.", goal: "city", go: "d1", skill: { transport: 1 } } },
        { id: "back", yaw: 180, pitch: -6, label: "Back inside", nav: "arrivals", draw: { kind: "door", sign: "GA ĐẾN · ARRIVALS" } }
      ]
    },

    d1: {
      name: "Le Loi Street, District 1", nameVi: "Đường Lê Lợi, Quận 1", bg: "street", yaw: 0,
      intro: "You drop your bag at the hotel. Breakfast first? Ben Thanh Market is across the road.",
      objects: [
        { id: "banhmi", yaw: -50, pitch: -2, label: "Bánh mì cart", draw: { kind: "cart" },
          once: "breakfast", done: { lines: [{ who: "Bánh mì seller", vi: "Ngon không con?", en: "Was it good?" }] },
          act: { type: "order", vendor: "Bánh mì seller", lines: [{ who: "Bánh mì seller", vi: "Ăn gì con?", en: "What will you have, dear?" }],
            menu: [
              { vi: "bánh mì thịt", en: "banh mi with cold cuts and pâté", unit: "ổ", price: 25000 },
              { vi: "bánh mì trứng", en: "banh mi with fried egg", unit: "ổ", price: 20000 },
              { vi: "sữa đậu nành", en: "soy milk", unit: "ly", price: 10000 }
            ],
            options: [{ vi: "không cay", en: "not spicy" }, { vi: "không ngò", en: "no coriander" }, { vi: "mang đi", en: "to take away" }],
            priceNote: "Example prices; bánh mì in District 1 usually costs 20,000–35,000 dong.", smallChange: true,
            goal: "breakfast", flag: "breakfast", min: 15 } },
        { id: "store", yaw: -130, pitch: -2, label: "Convenience store", draw: { kind: "store" },
          act: { type: "breaknote", what: "Bottle of water", price: 10000, label: "Buy water with your 500,000 note",
            lines: [{ who: "Cashier", vi: "Mười ngàn ạ.", en: "That's 10,000." }],
            text: "Street stalls often can't change a 500,000 note. Convenience stores usually can: buy something small and pay with the big note.",
            noBig: "You don't have a 500,000 note to break. Good: small notes are what stalls want.",
            result: "Water for 10,000 ₫, and 490,000 ₫ back in smaller notes." } },
        { id: "hotel", yaw: 140, pitch: 0, label: "Your hotel", draw: { kind: "hotel" },
          act: { type: "wait", text: "Rest in your room through the hottest hours?", min: 120, label: "Rest for 2 hours" } },
        { id: "crossing", yaw: 20, pitch: -14, label: "Cross to Ben Thanh Market", draw: { kind: "crosswalk" }, nav: "gate", navNeeds: "crossed",
          act: { type: "cross", go: "gate", goal: "cross", flag: "crossed", skillName: "street",
            tip: "How locals cross: wait for a gap, then walk at a slow, steady pace. Don't stop or run. Riders watch you and steer around where you will be." } }
      ]
    },

    gate: {
      name: "Ben Thanh Market, south gate", nameVi: "Chợ Bến Thành, cửa Nam", bg: "gate", yaw: 0,
      intro: "The clock tower that's on every postcard of Saigon. Open about 6 am to 6 pm; entry is free.",
      objects: [
        { id: "market", yaw: 0, pitch: 2, label: "Walk into the market", nav: "hall", draw: { kind: "benthanh" } },
        { id: "back", yaw: 180, pitch: -10, label: "Back across Le Loi", nav: "d1" },
        { id: "bike", yaw: -70, pitch: -2, label: "Book a motorbike to Cholon", draw: { kind: "pickup" }, needs: "online",
          locked: { text: "No mobile data. A xe ôm (motorbike taxi) driver offers a ride instead.", then: "xeom" },
          act: { type: "ride", app: "bike", from: "Ben Thanh Market", to: "Cholon, District 5", fare: 38000, plate: "59X3-417.26",
            fareNote: "Example fare; the app shows the real one before you book.", goal: "cholon", go: "cholon", skill: { transport: 1 },
            tip: "The driver hands you a helmet: put it on and fasten the strap. Keep your phone away from the street side." } },
        { id: "bus1", yaw: -120, pitch: -2, label: "Bus 1 to Cholon (free)", draw: { kind: "busstop", sign: "XE BUÝT SỐ 1", sign2: "Chợ Lớn · Bus stop" },
          act: { type: "choice", prompt: "Bus 1 runs from the city centre to Cholon bus station. City buses are free until 31 December 2026; tap a contactless card to record the trip. A bus is coming.",
            options: [
              { label: "Wave at the bus", sub: "Free · slower than a motorbike", min: 45, goal: "cholon", go: "cholon", skill: { transport: 2 },
                result: "The driver pulls in. You tap your card (nothing is charged) and ride across town to Chinatown." },
              { label: "Wait at the stop without signalling", min: 15, skill: { transport: -1 },
                result: "The bus drives straight past: buses may not stop if nobody signals. Wave clearly next time. Another one comes in about 15 minutes." }
            ] } },
        { id: "metro", yaw: 140, pitch: -4, label: "Metro: Ben Thanh station", nav: "station", draw: { kind: "metroentrance" } },
        { id: "info", yaw: 95, pitch: 6, label: "Bitexco Tower", act: { type: "say", text: "The tower with the helipad. You can see it from much of District 1, which helps when you're lost." } }
      ]
    },

    hall: {
      name: "Inside Ben Thanh Market", nameVi: "Trong chợ Bến Thành", bg: "market", yaw: 0, outdoor: false,
      intro: "Narrow aisles, stalls piled to the roof. Some stalls show fixed prices; many don't.",
      objects: [
        { id: "hats", yaw: -30, pitch: -2, label: "Conical hat stall", draw: { kind: "hats" },
          once: "souvenir", done: { lines: [{ who: "Hat seller", vi: "Mua thêm cái nữa không em?", en: "Want another one?" }] },
          act: { type: "haggle", item: "Conical hat", itemVi: "nón lá", ask: 250000, fair: 120000, floor: 100000, vendor: "Hat seller",
            lines: [{ who: "Hat seller", vi: "Nón lá đẹp nè! Mua đi em!", en: "Nice conical hats! Buy one!" }],
            note: "Example prices. Start low but friendly, smile, and be ready to walk away. Once a price is agreed, buy.",
            goal: "souvenir", flag: "souvenir" } },
        { id: "food", yaw: 60, pitch: -2, label: "Food stalls", draw: { kind: "foodstalls" },
          act: { type: "say", lines: [{ who: "Stall owner", vi: "Ngồi đi em, ăn gì?", en: "Sit down, what will you eat?" }], text: "The food stalls sit together in one part of the hall: a good place for a first taste of many dishes. Save your appetite for Cholon tonight." } },
        { id: "out", yaw: 180, pitch: -6, label: "Back to the gate", nav: "gate" }
      ]
    },

    station: {
      name: "Ben Thanh metro station", nameVi: "Ga Bến Thành, tuyến số 1", bg: "station", yaw: 0, outdoor: false,
      intro: "Metro Line 1 runs from Ben Thanh to Suoi Tien. Trains every 6–12 minutes, 5 am to 10 pm (11 pm at weekends).",
      objects: [
        { id: "machine", yaw: -40, pitch: -4, label: "Ticket machine", draw: { kind: "ticketmachine" },
          once: "ticket", done: { text: "You already have a ticket. Tap it on the gate to go in." },
          act: { type: "choice", prompt: "Buy a single ticket to Opera House (one stop)? The machine takes notes from 1,000 to 200,000 dong.",
            options: [
              { label: "Buy a single ticket", sub: "7,000 ₫ cash", min: 3, flag: "ticket", skill: { transport: 1 },
                pay: { amount: 7000, to: "Ticket machine", vi: "Bảy ngàn đồng.", en: "7,000 dong." }, result: "The machine prints a ticket card. Keep it: you need it to get out." },
              { label: "Not now", result: "" }
            ] } },
        { id: "gates", yaw: 20, pitch: -4, label: "Fare gates and trains", draw: { kind: "gates" },
          act: { type: "choice", prompt: "Tap in at the gate, ride one stop to Opera House, and tap out with the same card or ticket.",
            tip: "No eating or drinking in stations or on trains.",
            options: [
              { label: "Tap your contactless bank card", sub: "6,000 ₫: 1,000 less than cash", min: 10, card: { amount: 6000, what: "Metro, Ben Thanh to Opera House" },
                goal: "metro", go: "opera", skill: { transport: 2 }, result: "Beep. Air-conditioned and quiet. Two minutes later you're under the Opera House." },
              { label: "Use your ticket", sub: "Bought at the machine", needs: "ticket", locked: "Buy a ticket at the machine first.", min: 10,
                goal: "metro", go: "opera", skill: { transport: 1 }, result: "The gate opens. Two minutes later you're under the Opera House." },
              { label: "Not now", result: "" }
            ] } },
        { id: "rules", yaw: 100, pitch: 2, label: "Station rules", act: { type: "say", text: "No eating, drinking or smoking in stations or on trains; no pets; large or bulky luggage may be refused. A carry-on is fine.", link: { text: "Metro guide: stations, fares, hours →", href: "/guides/hcmc-metro/" } } },
        { id: "up", yaw: 180, pitch: -6, label: "Up to Ben Thanh Market", nav: "gate" }
      ]
    },

    opera: {
      name: "Opera House and Nguyen Hue", nameVi: "Nhà hát Thành phố và phố đi bộ Nguyễn Huệ", bg: "street", yaw: 0,
      intro: "You come up from Opera House station. The Opera House is in front of you; Nguyen Hue Walking Street is to your left.",
      objects: [
        { id: "operahouse", yaw: 0, pitch: 4, label: "Saigon Opera House", draw: { kind: "opera" },
          act: { type: "say", text: "Looking at it from outside is free; shows are ticketed. It is a few minutes from the station exit.", link: { text: "Nguyen Hue and the Opera House →", href: "/see-and-do/nguyen-hue-walking-street/" } } },
        { id: "nguyenhue", yaw: -80, pitch: 0, label: "Nguyen Hue Walking Street",
          act: { type: "say", text: "A wide pedestrian boulevard down to the river, open 24 hours and free. Busiest in the evening, when families come out." } },
        { id: "walk", yaw: 180, pitch: -6, label: "Walk back to Ben Thanh (about 15 minutes)", nav: "gate", min: 15 }
      ]
    },

    cholon: {
      name: "Cholon, District 5", nameVi: "Chợ Lớn, Quận 5 cũ", bg: "cholon", yaw: 0,
      intro: "Saigon's Chinatown: old shophouses, herbal shops, lanterns. Dinner opens at 5 pm.",
      objects: [
        { id: "coffee", yaw: -45, pitch: -2, label: "Sidewalk coffee stall", draw: { kind: "coffee" },
          once: "coffee", done: { type: "wait", text: "Sit on a low stool and watch the street go by?", min: 60, label: "Sit for an hour" },
          act: { type: "order", vendor: "Coffee seller", lines: [{ who: "Coffee seller", vi: "Uống gì em?", en: "What would you like to drink?" }],
            menu: [
              { vi: "cà phê sữa đá", en: "iced coffee with condensed milk", unit: "ly", price: 20000 },
              { vi: "cà phê đen đá", en: "iced black coffee", unit: "ly", price: 18000 },
              { vi: "bạc xỉu", en: "milky iced coffee", unit: "ly", price: 22000 }
            ],
            options: [{ vi: "ít đường", en: "less sugar" }, { vi: "ít đá", en: "less ice" }],
            priceNote: "Example prices for a sidewalk stall; cafés charge more.", tip: "A glass of iced tea (trà đá) often comes with your coffee.",
            goal: "coffee", flag: "coffee", min: 45 } },
        { id: "noodles", yaw: 40, pitch: -2, label: "Sidewalk Noodles, 187 Huynh Man Dat", draw: { kind: "noodle", openAfter: 17 * 60 }, from: 17 * 60,
          closed: { lines: [{ who: "Noodle seller", vi: "Chưa bán em ơi, năm giờ chiều mới bán.", en: "Not open yet, dear. We open at 5 pm." }], text: "Have a coffee and watch the street while you wait." },
          once: "dinner", done: { lines: [{ who: "Noodle seller", vi: "Mai ghé nữa nha!", en: "Come again tomorrow!" }] },
          act: { type: "order", vendor: "Noodle seller", lines: [{ who: "Noodle seller", vi: "Mấy tô em?", en: "How many bowls?" }],
            text: "A real stall from this site, known for dry hủ tiếu mì with the soup on the side.",
            link: { text: "The real place: address, videos and tips →", href: "/places/sidewalk-noodles-187-huynh-man-dat/" },
            menu: [
              { vi: "hủ tiếu mì khô", en: "dry rice and egg noodles, soup on the side", unit: "tô", price: 30000 },
              { vi: "hủ tiếu nước", en: "hu tieu in soup", unit: "tô", price: 30000 },
              { vi: "trà đá", en: "iced tea", unit: "ly", price: 3000 }
            ],
            options: [{ vi: "không hành", en: "no spring onion" }, { vi: "thêm trứng cút", en: "extra quail eggs" }],
            priceNote: "The stall charges 25,000–35,000 dong a bowl (from the creators' videos); 30,000 here is an example.",
            bill: true, goal: "dinner", flag: "dinner", min: 40, then: "end" } },
        { id: "gold", yaw: 120, pitch: -2, label: "Jewellery shop (exchange)", draw: { kind: "goldshop" }, act: { type: "exchange", where: "goldshop" } },
        { id: "lanterns", yaw: -130, pitch: 10, label: "Lanterns", draw: { kind: "lanterns" },
          act: { type: "say", text: "Lantern shops line Luong Nhu Hoc street in Cholon, busiest before the Mid-Autumn Festival.", link: { text: "Lantern Street on this site →", href: "/places/lantern-street-luong-nhu-hoc/" } } }
      ]
    }
  },

  events: [
    { id: "phone", title: "Phone at the kerb", scenes: ["gate", "d1", "opera", "cholon"], needs: "online",
      act: { type: "choice", text: "",
        prompt: "You stop at the kerb to check the map on your phone, holding it out over the street. Motorbikes pass a hand's width away.",
        options: [
          { label: "Step back from the road and hold the phone close", skill: { smart: 1 },
            result: "Good habit. Phone and bag snatching from passing motorbikes happens: keep your phone away from the street side and your bag zipped and across your body." },
          { label: "Keep looking at the map where you are", skill: { smart: -1 },
            result: "A rider swerves close and you flinch, nearly dropping the phone. Nothing lost, but that's exactly how phones get snatched. Step back from the road to use it." }
        ] } },
    { id: "rain", title: "Afternoon downpour", scenes: ["gate", "d1", "opera", "cholon"], from: 14 * 60, to: 17 * 60, rain: 45,
      act: { type: "choice", lines: [{ who: "Raincoat seller", vi: "Áo mưa không em? Hai chục nè!", en: "Raincoat? 20,000!" }],
        prompt: "The sky goes dark and it pours: afternoon downpours are common from May to November. They usually pass within the hour.",
        options: [
          { label: "Buy a raincoat", sub: "Example price 20,000 ₫", skill: { smart: 1 }, pay: { amount: 20000, to: "Raincoat seller", vi: "Hai chục.", en: "20,000." },
            result: "A thin plastic poncho over you and your bag. Locals carry one in the motorbike seat from May to November." },
          { label: "Shelter under a shop awning and wait", min: 30, skill: { smart: 1 },
            result: "You wait it out with a dozen others under an awning. Half an hour later the street is steaming in the sun." },
          { label: "Keep walking", skill: { smart: -1 },
            result: "Soaked to the skin in two minutes, phone included. Carry a light rain jacket from May to November." }
        ] } }
  ],

  // A xe ôm (motorbike taxi) for players without data at Ben Thanh
  xeom: { type: "choice", lines: [{ who: "Xe ôm driver", vi: "Xe ôm không em? Đi Chợ Lớn sáu chục.", en: "Motorbike taxi? Cholon for 60,000." }], prompt: "Agree the price before you get on.",
    options: [
      { label: "“Năm chục được không?” (50,000?)", min: 25, goal: "cholon", go: "cholon", skill: { transport: 1, haggle: 1 }, pay: { amount: 50000, to: "Xe ôm driver", vi: "Ok, năm chục.", en: "Okay, 50,000." }, result: "He nods and hands you a helmet." },
      { label: "Accept 60,000", min: 25, goal: "cholon", go: "cholon", skill: { transport: 1 }, pay: { amount: 60000, to: "Xe ôm driver", vi: "Sáu chục nha.", en: "60,000." }, result: "Price agreed before the ride: good." }
    ] },

  // Shown in the end-of-day report when the player's choices make them relevant (affiliate links, same as the site's Plan band)
  realTrip: [
    { text: "Get a Vietnam eSIM", href: "https://airalo.tpo.lu/KP1dEp49", when: ["boughtSim", "noData"], why: "Install it before you fly: data the moment you land, no SIM queue." },
    { text: "Book an airport pickup", href: "https://kiwitaxi.tpo.lu/cz2amFE5", when: ["carRide"], why: "A fixed price agreed in advance; the driver waits in arrivals with your name." },
    { text: "Book a street-food tour", href: "https://klook.tpo.lu/3S1n2OF8", why: "Order and eat at stalls like today, with a local to guide you." }
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
