let products=[],categories=[],selectedCategory='',cart=JSON.parse(localStorage.getItem('sportCart')||'[]'),me=null,favorites=[];
const homeHTML=document.getElementById('app').innerHTML;
const money=n=>Number(n||0).toLocaleString('vi-VN')+'₫';
const api=async(url,options={})=>{const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Có lỗi xảy ra.');return d};
function toast(s){const t=document.getElementById('toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function saveCart(){localStorage.setItem('sportCart',JSON.stringify(cart));document.getElementById('cartCount').textContent=cart.reduce((n,x)=>n+x.quantity,0)}
function openModal(html){document.getElementById('modalContent').innerHTML=html;document.getElementById('modal').classList.remove('hidden')}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
async function init(){try{const d=await api('/api/me');me=d.user;updateAccount();categories=await api('/api/categories');renderCategories();await loadProducts();saveCart()}catch(e){toast(e.message)}}
function updateAccount(){const b=document.getElementById('accountBtn');b.textContent=me?(me.role==='admin'?'Quản trị':'Tài khoản'):'Đăng nhập'}
function renderCategories(){const el=document.getElementById('categories');el.innerHTML=`<button class="cat ${!selectedCategory?'active':''}" onclick="setCategory('',this)">Tất cả</button>`+categories.map(c=>`<button class="cat ${String(selectedCategory)===String(c.id)?'active':''}" onclick="setCategory('${c.id}',this)">${c.name}</button>`).join('')}
function setCategory(id,btn){selectedCategory=id;document.querySelectorAll('.cat').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');loadProducts()}
async function loadProducts(){const q=document.getElementById('search')?.value||'';products=await api('/api/products?q='+encodeURIComponent(q)+'&category='+encodeURIComponent(selectedCategory));const sort=document.getElementById('sort')?.value;if(sort==='low')products.sort((a,b)=>a.price-b.price);if(sort==='high')products.sort((a,b)=>b.price-a.price);if(me)try{favorites=await api('/api/favorites')}catch{}renderProducts()}
function renderProducts(){const el=document.getElementById('productGrid');if(!el)return;if(!products.length){el.innerHTML='<div class="empty">Không tìm thấy sản phẩm phù hợp.</div>';return}el.innerHTML=products.map((p,i)=>`<article class="product-card"><div class="product-image"><img loading="lazy" src="${escapeHtml(p.image||'')}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/600x600/f1f3e9/333?text=Sport+Shop'"><span class="tag">${i<2?'BEST SELLER':'SPORT ESSENTIAL'}</span><button class="heart ${favorites.includes(p.id)?'liked':''}" onclick="toggleFavorite(${p.id})">${favorites.includes(p.id)?'♥':'♡'}</button></div><div class="product-info"><div class="product-category">${escapeHtml(p.category||'Thể thao')}</div><h3>${escapeHtml(p.name)}</h3><div class="product-bottom"><div class="price">${money(p.price)}</div><button class="addbtn" onclick="addCart(${p.id})" title="Thêm vào giỏ">+</button></div><div class="stock">${p.stock>0?'Còn '+p.stock+' sản phẩm':'Tạm hết hàng'}</div></div></article>`).join('')}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function addCart(id){const p=products.find(x=>x.id===id);if(!p||p.stock<1)return toast('Sản phẩm đã hết hàng.');const line=cart.find(x=>x.id===id);if(line){if(line.quantity>=p.stock)return toast('Số lượng vượt quá tồn kho.');line.quantity++}else cart.push({id:p.id,quantity:1});saveCart();toast('Đã thêm sản phẩm vào giỏ hàng!')}
async function toggleFavorite(id){if(!me){authModal('login');return}try{await api('/api/favorites/'+id,{method:'POST'});favorites=await api('/api/favorites');renderProducts();toast('Đã cập nhật danh sách yêu thích.')}catch(e){toast(e.message)}}
function authModal(mode='login'){const register=mode==='register';openModal(`<p class="eyebrow">WELCOME TO SPORT SHOP</p><h2>${register?'Tạo tài khoản':'Chào mừng trở lại'}</h2><p>${register?'Đăng ký để lưu thông tin và theo dõi đơn hàng.':'Đăng nhập để tiếp tục mua sắm của bạn.'}</p><form class="form" onsubmit="submitAuth(event,'${mode}')">${register?'<label>Họ và tên<input name="name" required placeholder="Nguyễn Văn A"></label>':''}<label>Email<input name="email" type="email" required placeholder="ban@email.com"></label>${register?'<label>Số điện thoại<input name="phone" placeholder="09xxxxxxxx"></label>':''}<label>Mật khẩu<input name="password" type="password" minlength="8" required placeholder="Ít nhất 8 ký tự"></label><button>${register?'ĐĂNG KÝ TÀI KHOẢN':'ĐĂNG NHẬP'}</button></form><p class="switchline">${register?'Đã có tài khoản?':'Chưa có tài khoản?'} <button class="linkbtn" onclick="authModal('${register?'login':'register'}')">${register?'Đăng nhập':'Đăng ký ngay'}</button></p>`)}
async function submitAuth(e,mode){e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{const d=await api('/api/'+(mode==='register'?'register':'login'),{method:'POST',body:JSON.stringify(data)});me=d.user;updateAccount();closeModal();toast(d.message);await loadProducts()}catch(err){toast(err.message)}}
async function showPage(page){const app=document.getElementById('app');if(page==='home'){app.innerHTML=homeHTML;await init();return}
if(page==='about'){document.getElementById('about')?.scrollIntoView({behavior:'smooth'});return}
if(page==='account'){if(!me)return authModal('login');if(me.role==='admin')return adminPage();return accountPage()}
if(page==='cart')return cartPage();if(page==='favorites')return favoritesPage();if(page==='orders')return ordersPage()}
function accountPage(){document.getElementById('app').innerHTML=`<section class="page"><p class="eyebrow">MY ACCOUNT</p><h2>Thông tin cá nhân</h2><form class="form" style="max-width:500px" onsubmit="saveProfile(event)"><label>Họ và tên<input name="name" required value="${escapeHtml(me.name)}"></label><label>Email<input value="${escapeHtml(me.email)}" disabled></label><label>Số điện thoại<input name="phone" value="${escapeHtml(me.phone||'')}"></label><label>Địa chỉ nhận hàng<input name="address" value="${escapeHtml(me.address||'')}"></label><label>Tuổi<input name="age" type="number" min="1" value="${me.age||''}"></label><button>LƯU THÔNG TIN</button></form><button class="secondary" style="margin-top:20px" onclick="passwordModal()">Đổi mật khẩu</button> <button class="secondary" onclick="logout()">Đăng xuất</button></section>`}
async function saveProfile(e){e.preventDefault();try{const d=await api('/api/profile',{method:'PUT',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});me=d.user;toast(d.message);accountPage()}catch(err){toast(err.message)}}
function passwordModal(){openModal(`<h2>Đổi mật khẩu</h2><form class="form" onsubmit="changePassword(event)"><label>Mật khẩu hiện tại<input name="currentPassword" type="password" required></label><label>Mật khẩu mới<input name="newPassword" type="password" minlength="8" required></label><button>LƯU MẬT KHẨU</button></form>`)}
async function changePassword(e){e.preventDefault();try{const d=await api('/api/password',{method:'PUT',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});closeModal();toast(d.message)}catch(err){toast(err.message)}}
async function logout(){await api('/api/logout',{method:'POST'});me=null;updateAccount();toast('Đã đăng xuất.');location.reload()}
function cartPage(){const app=document.getElementById('app');const lines=cart.map(c=>({...c,p:products.find(p=>p.id===c.id)})).filter(c=>c.p);const total=lines.reduce((s,c)=>s+c.p.price*c.quantity,0);app.innerHTML=`<section class="page"><p class="eyebrow">YOUR SELECTION</p><h2>Giỏ hàng của bạn</h2>${lines.length?lines.map(c=>`<div class="item-row"><img src="${escapeHtml(c.p.image)}" onerror="this.src='https://placehold.co/100x100'"><div class="grow"><h3>${escapeHtml(c.p.name)}</h3><p>${money(c.p.price)}</p></div><div class="qty"><button onclick="changeQty(${c.id},-1)">−</button>${c.quantity}<button onclick="changeQty(${c.id},1)">+</button></div><b>${money(c.p.price*c.quantity)}</b><button class="secondary" onclick="removeCart(${c.id})">Xóa</button></div>`).join('')+`<div class="totalrow"><span>Tạm tính</span><span>${money(total)}</span></div><button class="primary" onclick="checkoutModal()">TIẾN HÀNH THANH TOÁN ↗</button>`:'<div class="empty">Giỏ hàng đang trống. Hãy chọn món đồ yêu thích nhé!<br><br><button class="primary" onclick="location.reload()">TIẾP TỤC MUA SẮM</button></div>'}</section>`}
function changeQty(id,delta){const x=cart.find(x=>x.id===id),p=products.find(p=>p.id===id);if(!x)return;x.quantity+=delta;if(x.quantity<1){cart=cart.filter(x=>x.id!==id)}else if(p&&x.quantity>p.stock){x.quantity=p.stock;toast('Đã đạt số lượng tồn kho.')}saveCart();cartPage()}
function removeCart(id){cart=cart.filter(x=>x.id!==id);saveCart();cartPage()}
function checkoutModal(){if(!me)return authModal('login');openModal(`<p class="eyebrow">CHECKOUT</p><h2>Thông tin nhận hàng</h2><form class="form" onsubmit="placeOrder(event)"><label>Họ tên người nhận<input name="customerName" required value="${escapeHtml(me.name)}"></label><label>Số điện thoại<input name="phone" required value="${escapeHtml(me.phone||'')}"></label><label>Địa chỉ nhận hàng<textarea name="address" required>${escapeHtml(me.address||'')}</textarea></label><label>Phương thức thanh toán<select name="paymentMethod"><option value="COD">Thanh toán khi nhận hàng (COD)</option></select></label><button>ĐẶT HÀNG · ${money(cart.reduce((s,c)=>s+(products.find(p=>p.id===c.id)?.price||0)*c.quantity,0))}</button></form>`)}
async function placeOrder(e) {
    e.preventDefault();

    try {
        const formData = Object.fromEntries(new FormData(e.target));

        const d = await api('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
                ...formData,
                items: cart
            })
        });

        // Cập nhật địa chỉ và số điện thoại vào hồ sơ
        const profile = await api('/api/profile', {
            method: 'PUT',
            body: JSON.stringify({
                name: me.name,
                phone: formData.phone,
                address: formData.address,
                age: me.age || ''
            })
        });

        me = profile.user;

        cart = [];
        saveCart();
        closeModal();
        updateAccount();

        toast('Đặt hàng thành công! Mã đơn #' + d.order.id);

        await loadProducts();
        ordersPage();

    } catch (err) {
        toast(err.message);
    }
}
async function ordersPage(){if(!me)return authModal('login');try{const orders=me.role==='admin'?await api('/api/admin/orders'):await api('/api/my-orders');document.getElementById('app').innerHTML=`<section class="page"><p class="eyebrow">ORDER TRACKING</p><h2>${me.role==='admin'?'Quản lý đơn hàng':'Đơn hàng của tôi'}</h2>${orders.length?orders.map(o=>`<div class="item-row"><div class="grow"><h3>Đơn hàng #${o.id} · ${escapeHtml(o.customer_name)}</h3><p>${new Date(o.created_at+'Z').toLocaleString('vi-VN')} · ${o.items.map(i=>escapeHtml(i.product_name)+' × '+i.quantity).join(', ')}</p><p>Địa chỉ: ${escapeHtml(o.address)}</p></div><div><b>${money(o.total)}</b><p>${escapeHtml(o.status)}</p>${me.role==='admin'?`<select onchange="updateOrder(${o.id},this.value)">${['Chờ xác nhận','Đang xử lý','Đang giao','Hoàn thành','Đã hủy'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select>`:''}</div></div>`).join(''):'<div class="empty">Bạn chưa có đơn hàng nào.</div>'}</section>`}catch(e){toast(e.message)}}
async function updateOrder(id,status){try{await api('/api/admin/orders/'+id,{method:'PATCH',body:JSON.stringify({status})});toast('Đã cập nhật đơn hàng.')}catch(e){toast(e.message)}}
async function favoritesPage(){if(!me)return authModal('login');favorites=await api('/api/favorites');const all=await api('/api/products');products=all.filter(p=>favorites.includes(p.id));document.getElementById('app').innerHTML=`<section class="page"><p class="eyebrow">SAVED ITEMS</p><h2>Sản phẩm yêu thích</h2><div id="productGrid" class="product-grid"></div></section>`;renderProducts()}
async function adminPage(){document.getElementById('app').innerHTML=`<section class="page"><p class="eyebrow">ADMIN PANEL</p><h2>Quản trị cửa hàng</h2><div class="admin-actions"><button class="primary" onclick="adminProducts()">QUẢN LÝ SẢN PHẨM</button><button class="primary" onclick="ordersPage()">QUẢN LÝ ĐƠN HÀNG</button><button class="primary" onclick="adminReport()">BÁO CÁO DOANH THU</button><button class="secondary" onclick="logout()">Đăng xuất</button></div><div id="adminContent"></div></section>`}
async function adminProducts(){const [ps,cs]=await Promise.all([api('/api/admin/products'),api('/api/categories')]);document.getElementById('adminContent').innerHTML=`<h3>Danh sách sản phẩm</h3>
<table class="admin-table">
<tr>
<th>Sản phẩm</th>
<th>Giá</th>
<th>Tồn kho</th>
<th>Trạng thái</th>
<th>Thao tác</th>
</tr>
${ps.map(p=>`
<tr>
<td>${escapeHtml(p.name)}</td>
<td>${money(p.price)}</td>
<td>${p.stock}</td>
<td>${p.is_hidden ? 'Đã ẩn' : 'Đang hiển thị'}</td>
<td>
${p.is_hidden
? `<button class="primary" onclick="restoreProduct(${p.id})">Hiện</button>`
: `<button class="secondary" onclick="deleteProduct(${p.id})">Ẩn</button>`
}
</td>
</tr>
`).join('')}
</table>`}
async function saveProduct(e){e.preventDefault();try{const d=await api('/api/admin/products',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});toast(d.message);adminProducts()}catch(e){toast(e.message)}}
async function deleteProduct(id){if(!confirm('Ẩn sản phẩm này khỏi cửa hàng?'))return;try{await api('/api/admin/products/'+id,{method:'DELETE'});toast('Đã ẩn sản phẩm.');adminProducts()}catch(e){toast(e.message)}}

async function adminReport(){const r=await api('/api/admin/report');document.getElementById('adminContent').innerHTML=`<div class="benefits" style="padding:20px 0"><div><span><b>Doanh thu hoàn thành</b><small>${money(r.revenue)}</small></span></div><div><span><b>Tổng đơn hàng</b><small>${r.orderCount}</small></span></div><div><span><b>Sản phẩm đang bán</b><small>${r.productCount}</small></span></div></div><h3>Sản phẩm bán chạy</h3><table class="admin-table"><tr><th>Sản phẩm</th><th>Số lượng đã đặt</th></tr>${r.bestSellers.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${p.quantity}</td></tr>`).join('')}</table>`}
init();