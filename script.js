/*
  Everyday Market storefront.
  Configure SUPABASE_URL, SUPABASE_ANON_KEY, WHATSAPP_NUMBER below.
  The Supabase anon key is intended for browser use; never put a service_role key here.
*/
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const WHATSAPP_NUMBER = "2547XXXXXXXX"; // Kenya country code, digits only

const isConfigured = SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_") && SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes("YOUR_");

const db = isConfigured && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const demoProducts = [
  {id:"demo-1",name:"Everyday Tote Bag",category:"Fashion",price:1800,description:"A practical bag for busy days.",image_url:"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",stock:12},
  {id:"demo-2",name:"Minimal Desk Lamp",category:"Home",price:2400,description:"Warm light for your favourite corner.",image_url:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",stock:8},
  {id:"demo-3",name:"Wireless Headphones",category:"Electronics",price:3200,description:"Your music, wherever the day goes.",image_url:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",stock:6},
  {id:"demo-4",name:"Skin Care Set",category:"Beauty",price:1500,description:"A simple self-care routine.",image_url:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85",stock:10},
  {id:"demo-5",name:"Classic Sneakers",category:"Fashion",price:2800,description:"Comfort for everyday adventures.",image_url:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",stock:9},
  {id:"demo-6",name:"Ceramic Home Vase",category:"Home",price:1100,description:"A little detail that changes a room.",image_url:"https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85",stock:15},
  {id:"demo-7",name:"Smart Watch",category:"Electronics",price:4200,description:"Keep your day within reach.",image_url:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",stock:5},
  {id:"demo-8",name:"Everyday Sunglasses",category:"Other",price:900,description:"An easy finishing touch.",image_url:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85",stock:20}
];

let products = [...demoProducts];
let cart = loadCart();
let category = "All";
let currentUser = null;
let isAdmin = false;
let toastTimer;

const $ = (id) => document.getElementById(id);
const money = (amount) => `KSh ${Number(amount || 0).toLocaleString("en-KE")}`;
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const safeImage = (url) => {
  try {
    const parsed = new URL(url, window.location.href);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
  } catch { return ""; }
};

function loadCart() {
  try { return JSON.parse(localStorage.getItem("everyday-market-cart") || "[]"); }
  catch { return []; }
}
function saveCart() {
  localStorage.setItem("everyday-market-cart", JSON.stringify(cart));
}
function notify(message, error = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.background = error ? "#8d3328" : "#202d25";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
}
function setNotice(id, message, error = false) {
  const el = $(id);
  el.textContent = message;
  el.classList.toggle("error", error);
}
function showModal(id) {
  closePanels();
  $("overlay").classList.remove("hidden");
  $(id).classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function showCart() {
  closePanels();
  $("overlay").classList.remove("hidden");
  $("cart-drawer").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closePanels() {
  $("overlay").classList.add("hidden");
  ["cart-drawer","account-modal","checkout-modal","orders-modal","admin-modal"].forEach(id => $(id).classList.add("hidden"));
  document.body.style.overflow = "";
}
function renderProducts() {
  const query = $("search-input").value.trim().toLowerCase();
  const shown = products.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.name} ${p.description || ""} ${p.category}`.toLowerCase().includes(query)
  );
  $("product-grid").innerHTML = shown.length ? shown.map(p => {
    const image = safeImage(p.image_url);
    return `<article class="product-card">
      <div class="product-image-wrap">
        ${image ? `<img class="product-image" src="${escapeHTML(image)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.style.display='none'">` : ""}
        <span class="product-category">${escapeHTML(p.category)}</span>
      </div>
      <div class="product-info">
        <h3>${escapeHTML(p.name)}</h3>
        <p class="product-description">${escapeHTML(p.description || "A useful find for everyday life.")}</p>
        <div class="product-bottom"><span class="price">${money(p.price)}</span>
        <button class="add-button" data-add="${escapeHTML(p.id)}" aria-label="Add ${escapeHTML(p.name)} to cart">+</button></div>
      </div>
    </article>`;
  }).join("") : `<div class="empty-state">No products found. Try another search or category.</div>`;
  $("product-grid").querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.add));
  });
}
function addToCart(id) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;
  const item = cart.find(p => String(p.id) === String(id));
  const quantity = item ? item.quantity + 1 : 1;
  if (product.stock != null && quantity > Number(product.stock)) {
    notify("Sorry, that is more than the available stock.", true); return;
  }
  if (item) item.quantity = quantity;
  else cart.push({id:product.id,name:product.name,price:Number(product.price),image_url:product.image_url,quantity:1});
  saveCart(); renderCart(); notify(`${product.name} added to your cart.`);
}
function changeQty(id, change) {
  const item = cart.find(p => String(p.id) === String(id));
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) cart = cart.filter(p => String(p.id) !== String(id));
  saveCart(); renderCart();
}
function removeFromCart(id) {
  cart = cart.filter(p => String(p.id) !== String(id));
  saveCart(); renderCart();
}
function cartTotal() { return cart.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0); }
function renderCart() {
  $("cart-count").textContent = cart.reduce((sum,p) => sum + p.quantity, 0);
  $("cart-subtotal").textContent = money(cartTotal());
  $("checkout-total").textContent = money(cartTotal());
  $("cart-items").innerHTML = cart.length ? cart.map(p => `
    <div class="cart-line">
      <img class="cart-thumb" src="${escapeHTML(safeImage(p.image_url))}" alt="">
      <div><h3>${escapeHTML(p.name)}</h3><p>${money(p.price)} each</p>
        <div class="quantity-controls">
          <button data-minus="${escapeHTML(p.id)}" aria-label="Decrease quantity">−</button><span>${p.quantity}</span>
          <button data-plus="${escapeHTML(p.id)}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="remove-button" data-remove="${escapeHTML(p.id)}">Remove</button>
    </div>`).join("") : `<div class="empty-state">Your cart is empty.<br>Explore the collection to add something you love.</div>`;
  $("cart-items").querySelectorAll("[data-minus]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.minus,-1)));
  $("cart-items").querySelectorAll("[data-plus]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.plus,1)));
  $("cart-items").querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>removeFromCart(b.dataset.remove)));
}

async function loadProducts() {
  if (!db) {
    products = [...demoProducts];
    renderProducts();
    notify("Preview mode: connect Supabase to enable accounts, shared orders, and admin tools.");
    return;
  }
  const {data,error} = await db.from("products").select("*").eq("active",true).order("created_at",{ascending:false});
  if (error) {
    console.error(error);
    products = [...demoProducts];
    renderProducts();
    notify("Could not load database products. Showing preview products.", true);
    return;
  }
  products = data || [];
  renderProducts();
}
async function refreshSession() {
  if (!db) return;
  const {data} = await db.auth.getSession();
  currentUser = data.session?.user || null;
  await updateAccountUI();
}
async function updateAccountUI() {
  const signedIn = Boolean(currentUser);
  $("signed-in-panel").classList.toggle("hidden", !signedIn);
  $("auth-form").classList.toggle("hidden", signedIn);
  $("account-title").textContent = signedIn ? "You're signed in" : "Your account";
  $("signed-in-email").textContent = signedIn ? currentUser.email : "";
  $("account-open").textContent = signedIn ? "My account" : "Account";
  isAdmin = false;
  $("admin-shortcut").classList.add("hidden");
  if (signedIn && db) {
    const {data,error} = await db.from("profiles").select("role").eq("id",currentUser.id).maybeSingle();
    if (!error && data?.role === "admin") {
      isAdmin = true;
      $("admin-shortcut").classList.remove("hidden");
    }
  }
}
async function signIn(event) {
  event.preventDefault();
  if (!db) return setNotice("account-message","Connect Supabase in script.js first. Preview mode does not create real accounts.",true);
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const {data,error} = await db.auth.signInWithPassword({email,password});
  if (error) return setNotice("account-message",error.message,true);
  currentUser = data.user;
  await updateAccountUI();
  setNotice("account-message","Signed in successfully.");
  notify("Welcome back!");
}
async function signUp() {
  if (!db) return setNotice("account-message","Connect Supabase in script.js first. Preview mode does not create real accounts.",true);
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  if (!email || password.length < 6) return setNotice("account-message","Enter a valid email and a password with at least 6 characters.",true);
  const {data,error} = await db.auth.signUp({email,password});
  if (error) return setNotice("account-message",error.message,true);
  if (data.session) {
    currentUser = data.user;
    await updateAccountUI();
    setNotice("account-message","Account created. You are signed in.");
  } else {
    setNotice("account-message","Account created. Check your email to confirm your account, then sign in.");
  }
}
async function signOut() {
  if (db) await db.auth.signOut();
  currentUser = null; isAdmin = false;
  await updateAccountUI();
  setNotice("account-message","You have signed out.");
  notify("Signed out.");
}
function checkoutOpen() {
  if (!cart.length) return notify("Your cart is empty.",true);
  showModal("checkout-modal");
  if (!currentUser) {
    setNotice("checkout-message","Please sign in or create an account before placing an order.",true);
  } else {
    setNotice("checkout-message","");
  }
}
async function placeOrder(event) {
  event.preventDefault();
  if (!cart.length) return setNotice("checkout-message","Your cart is empty.",true);
  if (!db) return setNotice("checkout-message","Connect Supabase to place and save real orders. Preview mode cannot submit orders.",true);
  if (!currentUser) return setNotice("checkout-message","Please sign in first. Open Account to sign in or create an account.",true);
  const button = $("place-order-button");
  button.disabled = true; button.textContent = "Placing order…";
  try {
    // Re-fetch prices and stock from the database; never trust browser cart prices.
    const ids = cart.map(p=>p.id);
    const {data:serverProducts,error:productsError} = await db.from("products").select("id,name,price,stock,active").in("id",ids);
    if (productsError) throw productsError;
    if (!serverProducts || serverProducts.length !== cart.length) throw new Error("One or more cart products are no longer available.");
    const orderItems = [];
    let total = 0;
    for (const item of cart) {
      const product = serverProducts.find(p=>String(p.id)===String(item.id));
      if (!product || !product.active) throw new Error(`${item.name} is no longer available.`);
      if (product.stock != null && item.quantity > Number(product.stock)) throw new Error(`Only ${product.stock} units of ${product.name} are available.`);
      total += Number(product.price)*item.quantity;
      orderItems.push({product_id:product.id,name:product.name,unit_price:Number(product.price),quantity:item.quantity});
    }
    const {data:order,error:orderError} = await db.from("orders").insert({
      customer_id:currentUser.id,
      customer_name:$("customer-name").value.trim(),
      phone:$("customer-phone").value.trim(),
      address:$("customer-address").value.trim(),
      payment_method:$("payment-method").value,
      note:$("order-note").value.trim(),
      items:orderItems,
      total,
      status:"Received"
    }).select("id").single();
    if (orderError) throw orderError;
    const orderRef = String(order.id).slice(0,8).toUpperCase();
    const msg = `Hello, I placed order ${orderRef} at Everyday Market.\n${orderItems.map(i=>`${i.name} x ${i.quantity}`).join("\n")}\nTotal: ${money(total)}\nPayment: ${$("payment-method").value}\nName: ${$("customer-name").value.trim()}\nPhone: ${$("customer-phone").value.trim()}`;
    cart = []; saveCart(); renderCart(); $("checkout-form").reset();
    setNotice("checkout-message",`Order placed successfully. Your reference is ${orderRef}.`);
    notify("Order placed successfully!");
    if (WHATSAPP_NUMBER && !WHATSAPP_NUMBER.includes("X")) {
      const wa = document.createElement("a");
      wa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
      wa.target = "_blank"; wa.rel = "noopener"; wa.className = "btn btn-outline full-width";
      wa.textContent = "Send order details to WhatsApp";
      $("checkout-message").appendChild(document.createElement("br"));
      $("checkout-message").appendChild(wa);
    }
    await loadOrders();
  } catch (error) {
    console.error(error);
    setNotice("checkout-message",error.message || "Could not place order. Please try again.",true);
  } finally {
    button.disabled = false; button.textContent = "Place order";
  }
}
async function loadOrders() {
  const container = $("orders-content");
  if (!db || !currentUser) {
    container.innerHTML = `<p class="muted">Connect Supabase and sign in to see saved orders. Preview mode cannot store shared orders.</p>`;
    return;
  }
  container.innerHTML = `<p class="muted">Loading your orders…</p>`;
  const {data,error} = await db.from("orders").select("id,created_at,items,total,status,payment_method").eq("customer_id",currentUser.id).order("created_at",{ascending:false});
  if (error) {
    container.innerHTML = `<p class="notice error">${escapeHTML(error.message)}</p>`; return;
  }
  if (!data?.length) {
    container.innerHTML = `<div class="empty-state">No orders yet. Your future orders will appear here.</div>`; return;
  }
  container.innerHTML = data.map(o=>`
    <article class="order-card">
      <div class="order-top"><h3>Order #${escapeHTML(String(o.id).slice(0,8).toUpperCase())}</h3><span class="status-pill">${escapeHTML(o.status)}</span></div>
      <p class="order-meta">${new Date(o.created_at).toLocaleString()} · ${escapeHTML(o.payment_method || "Payment to be confirmed")}</p>
      <div class="order-items">${(Array.isArray(o.items)?o.items:[]).map(i=>`${escapeHTML(i.name)} × ${Number(i.quantity)||1}`).join("<br>")}</div>
      <div class="total-line" style="margin-top:12px"><span>Total</span><strong>${money(o.total)}</strong></div>
    </article>`).join("");
}
async function openOrders() {
  showModal("orders-modal");
  await loadOrders();
}
async function loadAdmin() {
  const container = $("admin-content");
  showModal("admin-modal");
  if (!db || !currentUser) {
    container.innerHTML = `<p class="notice error">Connect Supabase and sign in with an administrator account to manage the store.</p>`; return;
  }
  const {data:profile,error:profileError} = await db.from("profiles").select("role").eq("id",currentUser.id).maybeSingle();
  if (profileError || profile?.role !== "admin") {
    container.innerHTML = `<p class="notice error">Access denied. This account does not have the admin role.</p>`; return;
  }
  isAdmin = true;
  const {data:orders,error:ordersError} = await db.from("orders").select("id,created_at,customer_name,phone,total,status,payment_method").order("created_at",{ascending:false}).limit(50);
  const {data:adminProducts,error:productsError} = await db.from("products").select("*").order("created_at",{ascending:false});
  if (ordersError || productsError) {
    container.innerHTML = `<p class="notice error">${escapeHTML((ordersError||productsError).message)}</p>`; return;
  }
  container.innerHTML = `
    <h3>Products</h3>
    <form id="product-form" class="admin-form">
      <label>Product name<input name="name" required maxlength="100"></label>
      <label>Category<select name="category"><option>Fashion</option><option>Home</option><option>Electronics</option><option>Beauty</option><option>Other</option></select></label>
      <label>Price (KSh)<input name="price" type="number" min="0" step="1" required></label>
      <label>Stock quantity<input name="stock" type="number" min="0" step="1" value="1" required></label>
      <label class="span-two">Image URL<input name="image_url" type="url" required placeholder="https://..."></label>
      <label class="span-two">Description<textarea name="description" rows="2"></textarea></label>
      <button class="btn btn-dark span-two" type="submit">Add product</button>
    </form>
    <div id="admin-product-list">${adminProducts.map(p=>`
      <div class="admin-order-row"><div><strong>${escapeHTML(p.name)}</strong><div class="tiny muted">${money(p.price)} · Stock: ${p.stock} · ${p.active?"Active":"Hidden"}</div></div>
      <button class="btn btn-outline" data-toggle-product="${p.id}" data-active="${p.active}">${p.active?"Hide":"Publish"}</button></div>`).join("") || "<p>No products yet.</p>"}</div>
    <h3 style="margin-top:28px">Recent orders</h3>
    <div>${orders.map(o=>`
      <div class="admin-order-row">
        <div><strong>#${escapeHTML(String(o.id).slice(0,8).toUpperCase())} · ${escapeHTML(o.customer_name)}</strong>
          <div class="tiny muted">${escapeHTML(o.phone)} · ${money(o.total)} · ${escapeHTML(o.payment_method||"")}</div>
          <div class="tiny muted">${new Date(o.created_at).toLocaleString()}</div>
        </div>
        <select data-order-status="${o.id}" aria-label="Update order status">
          ${["Received","Confirmed","Preparing","Dispatched","Delivered","Cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}
        </select>
      </div>`).join("") || "<p>No orders yet.</p>"}
    </div>`;
  $("product-form").addEventListener("submit",addProduct);
  container.querySelectorAll("[data-toggle-product]").forEach(b=>b.addEventListener("click",()=>toggleProduct(b.dataset.toggleProduct,b.dataset.active==="true")));
  container.querySelectorAll("[data-order-status]").forEach(s=>s.addEventListener("change",()=>updateOrderStatus(s.dataset.orderStatus,s.value)));
}
async function addProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const payload = {name:values.name.trim(),category:values.category,price:Number(values.price),stock:Number(values.stock),image_url:values.image_url.trim(),description:values.description.trim(),active:true};
  const {error} = await db.from("products").insert(payload);
  if (error) return notify(error.message,true);
  notify("Product added."); await loadProducts(); await loadAdmin();
}
async function toggleProduct(id,active) {
  const {error} = await db.from("products").update({active:!active}).eq("id",id);
  if (error) return notify(error.message,true);
  notify(active?"Product hidden.":"Product published."); await loadProducts(); await loadAdmin();
}
async function updateOrderStatus(id,status) {
  const {error} = await db.from("orders").update({status}).eq("id",id);
  if (error) return notify(error.message,true);
  notify("Order status updated.");
}

$("year").textContent = new Date().getFullYear();
$("search-input").addEventListener("input",renderProducts);
$("category-row").querySelectorAll("[data-category]").forEach(button=>button.addEventListener("click",()=>{
  category = button.dataset.category;
  $("category-row").querySelectorAll(".category-chip").forEach(b=>b.classList.toggle("active",b===button));
  renderProducts();
}));
$("cart-open").addEventListener("click",showCart);
$("account-open").addEventListener("click",()=>{showModal("account-modal");});
$("track-open").addEventListener("click",openOrders);
$("checkout-open").addEventListener("click",checkoutOpen);
$("auth-form").addEventListener("submit",signIn);
$("signup-button").addEventListener("click",signUp);
$("signout-button").addEventListener("click",signOut);
$("checkout-form").addEventListener("submit",placeOrder);
$("admin-shortcut").addEventListener("click",loadAdmin);
$("overlay").addEventListener("click",closePanels);
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closePanels));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePanels();});

renderCart();
loadProducts();
if (db) {
  db.auth.onAuthStateChange((_event,session)=>{
    currentUser = session?.user || null;
    // Defer DB reads to avoid doing work inside the auth callback.
    setTimeout(()=>updateAccountUI(),0);
  });
  refreshSession();
} else {
  $("admin-shortcut").classList.add("hidden");
}
