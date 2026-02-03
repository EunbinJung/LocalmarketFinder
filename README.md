# LocalMarketFinder 📍
**Discover local markets in Australia, powered by real user insights.**

LocalMarketFinder is an iOS app that helps users explore nearby local markets through a **map-based UI**, enriched with **community-driven information** that Google Maps alone doesn’t provide.

Built with **React Native, TypeScript, Firebase**, and **Google Maps APIs**.

<img src="https://github.com/user-attachments/assets/b9094c4e-36ba-4a5e-94bd-7efa3704aa41"  width="200" height="400"/>
<img src="https://github.com/user-attachments/assets/0eb5b7a1-69f1-4660-8333-32867f5e867c"  width="200" height="400"/>
<img src="https://github.com/user-attachments/assets/6326da5f-96d7-4b21-bb35-5f987eb387dd"  width="200" height="400"/>

<img src="https://github.com/user-attachments/assets/af6016ab-4192-42d5-96f2-3c5759729a87"  width="200" height="400"/>
<img src="https://github.com/user-attachments/assets/3f9ebd46-eb61-44e5-b240-ecdbdfdf4a79"  width="200" height="400"/>
<img src="https://github.com/user-attachments/assets/91937bac-6cf9-4bc2-b57b-19055d2ee1fd"  width="200" height="400"/>

<img src="https://github.com/user-attachments/assets/8f8e9938-5edd-4eb2-bc9e-92891d270d91"  width="200" height="400"/>
<img src="https://github.com/user-attachments/assets/cc4a788e-cc0e-478f-a0f8-ce1448b2914b"  width="200" height="400"/>
<img src="https://github.com/user-attachments/assets/59d922b4-c31c-4237-9085-6e1fce2c1462"  width="200" height="400"/>


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


### iOS only   
### Minimum iOS version: 14.0   

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