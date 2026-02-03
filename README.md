# LocalMarketFinder 📍
**Discover local markets in Australia, powered by real user insights.**

LocalMarketFinder is an iOS app that helps users explore nearby local markets through a **map-based UI**, enriched with **community-driven information** that Google Maps alone doesn’t provide.

Built with **React Native, TypeScript, Firebase**, and **Google Maps APIs**.

---

## ✨ Why LocalMarketFinder?

Local market information in Australia is:
- scattered across Google Maps,
- often outdated or incomplete,
- missing practical details like parking, pet access, or overall vibe.

**LocalMarketFinder solves this by combining:**
- reliable base data from Google Maps  
- continuously updated **real user reactions and comments**

All in one place.

---

## 🚀 Key Features

### 🗺 Map-based Discovery
- Search nearby markets using **Google Places Autocomplete**
- Explore markets directly from an interactive map

### 📄 Market Details
- Opening hours & photos
- Ratings and quick Google Maps navigation
- Directions via Google Maps

### 🧠 Community-driven Insights
Users can leave quick reactions for each market:
- 🅿️ Parking  
- 🐾 Pet Friendly  
- ♻️ Reusable  
- 🚻 Toilet  
- 🎵 Live Music  
- ♿ Accessibility  

🔄 Reactions reset every **7 days**, keeping information fresh and relevant.

### 💬 Comments
- Users can leave free-text comments
- Focused on real visit experiences

### 🧾 Bottom Sheet UI
- Swipeable bottom sheet for market listings
- Smooth gesture handling with Reanimated

---

## 🧠 Technical Decisions (Interview Highlight)

### Reducing Google Maps API Cost
**Initial approach**
- Real-time Google Maps API calls  
- Estimated cost: **$200+ / month**

**Final solution**
- Market data is **pre-fetched via script**
- Stored in **Firebase Firestore**
- App primarily reads from the database
- Google API used only for search & navigation

✅ Result: **~$10–20 / month** operating cost

---

## 🛠 Tech Stack

- React Native (iOS)
- TypeScript
- Firebase (Firestore)
- Google Maps & Places API
- React Native Reanimated
- React Native Gesture Handler
- NativeWind (Tailwind CSS)

---

## 🎨 UI & UX

- Map + Bottom Sheet layout
- Emoji-based quick links (📸 Instagram / 📘 Facebook / 🔗 Website)
- Designed for one-handed mobile use

---

## ⚙️ Setup

```npm install
cd ios
bundle install
bundle exec pod install
cd ..

npx react-native start --reset-cache

npm run ios
```

---

# [x] iOS only   
# [x] Minimum iOS version: 14.0   

---

## 📌 Notes

Community reactions reset every 7 days   

Designed with scalability and cost-efficiency in mind   

Focused on local Australian markets   


---

## 👤 Author

Eunbin Jung

Frontend / Mobile Developer

Built with ❤️ using React Native