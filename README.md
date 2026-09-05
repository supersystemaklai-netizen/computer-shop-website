# Super System — Computer & CCTV Shop Website

Ek complete website: services (Computer + CCTV) cards ke saath, click karne par
service-specific enquiry form khulta hai, aur wo submission admin panel me
dikhta hai. Admin panel se products (pricing + best offer) bhi manage kar sakte ho.

## Kya-kya hai isme
- **Storefront (`/`)** — Hero section, Computer & CCTV service cards, Products/offers section, contact info.
- **Service form** — Har service ka apna chhota form hai (jaise CCTV Installation me camera count, property type, etc.) jo alag tab/service ke hisaab se change hota hai.
- **Admin panel (`/admin.html`)** — Login karke:
  - Sabhi service enquiries dekho (customer ne kya-kya bhara), status update karo (New/Contacted/In Progress/Completed), delete karo.
  - Products add/edit/delete karo — name, category (CCTV/Computer/Accessories), price, offer price, "Best Offer" badge, stock, image URL.
- Data JSON files me save hota hai (`data/enquiries.json`, `data/products.json`) — koi database install karne ki zaroorat nahi.

## Site chalane ke liye (Run instructions)

1. **Node.js install hona chahiye** (v16+). Check karo: `node -v`
   Agar nahi hai to https://nodejs.org se install kar lo.

2. Zip file ko extract karo, phir terminal me us folder me jao:
   ```
   cd computer-shop-website
   ```

3. Dependencies install karo:
   ```
   npm install
   ```

4. Server start karo:
   ```
   npm start
   ```

5. Browser me kholo:
   - Website: **http://localhost:3000**
   - Admin panel: **http://localhost:3000/admin.html**

## Admin login (default)
```
Username: admin
Password: admin@123
```
⚠️ Production/live use se pehle `server.js` file me `ADMIN_USERNAME` aur
`ADMIN_PASSWORD` change kar lena (top of the file).

## Services list edit karni ho to
`public/services-data.js` file kholo — yahan Computer aur CCTV categories ke
services aur unke form fields defined hain. Naya service add karna ho to isi
pattern me ek object add kar do; form automatically ban jayega.

## Products
Products admin panel ke "Products" tab se add/edit/delete karo — website par
turant show ho jayenge (with best-offer badge aur discounted price agar diya ho).

## Folder structure
```
computer-shop-website/
  server.js              -> backend (Express) + API
  package.json
  data/
    enquiries.json        -> customer service requests
    products.json          -> products list
  public/
    index.html            -> storefront
    admin.html             -> admin panel
    services-data.js        -> service categories + form fields (shared)
    script.js               -> storefront logic
    admin.js                 -> admin panel logic
    style.css / admin.css
```
