const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, {recursive:true});
const db = new Database(path.join(DATA_DIR, 'sportshop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 phone TEXT DEFAULT '', address TEXT DEFAULT '', age INTEGER, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'customer', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '',
 price INTEGER NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
 image TEXT DEFAULT '', category_id INTEGER REFERENCES categories(id), active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id),
 customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL,
 total INTEGER NOT NULL, payment_method TEXT NOT NULL DEFAULT 'COD',
 status TEXT NOT NULL DEFAULT 'Chờ xác nhận', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 product_id INTEGER REFERENCES products(id), product_name TEXT NOT NULL,
 price INTEGER NOT NULL, quantity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id, product_id)
);
`);
const count = db.prepare('SELECT COUNT(*) n FROM products').get().n;
if (!count) {
 const cat = db.prepare('INSERT INTO categories(name) VALUES (?)');
 ['Giày thể thao','Quần áo','Phụ kiện','Dụng cụ tập luyện'].forEach(x=>cat.run(x));
 const ids = Object.fromEntries(db.prepare('SELECT id,name FROM categories').all().map(x=>[x.name,x.id]));
 const ins = db.prepare('INSERT INTO products(name,description,price,stock,image,category_id) VALUES (?,?,?,?,?,?)');
 [
  ['Giày chạy bộ AirRun','Giày nhẹ, êm chân phù hợp chạy bộ hằng ngày.',899000,18,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700',ids['Giày thể thao']],
  ['Giày Training Pro','Đế bám tốt cho luyện tập và gym.',1099000,12,'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=700',ids['Giày thể thao']],
  ['Áo thể thao DryFit','Vải thoáng khí, nhanh khô.',259000,35,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700',ids['Quần áo']],
  ['Áo hoodie Sport','Áo hoodie năng động cho ngày thường.',459000,20,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=700',ids['Quần áo']],
  ['Balo thể thao','Ngăn chứa rộng, tiện đi học và tập luyện.',389000,14,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700',ids['Phụ kiện']],
  ['Bình nước Sport','Bình nước dùng khi tập luyện.',99000,40,'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=700',ids['Phụ kiện']],
  ['Thảm yoga','Bề mặt chống trượt, dễ vệ sinh.',329000,16,'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=700',ids['Dụng cụ tập luyện']],
  ['Tạ tay 5kg','Tạ tập luyện tại nhà.',219000,22,'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=700',ids['Dụng cụ tập luyện']]
 ].forEach(p=>ins.run(...p));
}
const adminEmail = process.env.ADMIN_EMAIL || 'admin@sportshop.local';
const adminPassword = process.env.ADMIN_PASSWORD || 'SportShop@123';
if (!db.prepare('SELECT id FROM users WHERE email=?').get(adminEmail)) {
 db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
 .run('Quản trị Sport Shop',adminEmail,bcrypt.hashSync(adminPassword,10),'admin');
}
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
 secret: process.env.SESSION_SECRET || 'change-this-secret-before-deploy',
 resave:false, saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*24*60*60*1000}
}));
app.use(express.static(path.join(__dirname,'public')));
const getUser = req => req.session.user || null;
const auth = (req,res,next)=>getUser(req)?next():res.status(401).json({error:'Vui lòng đăng nhập.'});
const admin = (req,res,next)=>getUser(req)?.role==='admin'?next():res.status(403).json({error:'Bạn không có quyền truy cập.'});
const safeUser = u => ({id:u.id,name:u.name,email:u.email,phone:u.phone,address:u.address,age:u.age,role:u.role});
app.get('/api/me',(req,res)=>res.json({user:getUser(req)}));
app.post('/api/register',(req,res)=>{
 const {name,email,password,phone=''}=req.body;
 if(!name?.trim()||!email?.trim()||!password||password.length<8) return res.status(400).json({error:'Nhập họ tên, email và mật khẩu ít nhất 8 ký tự.'});
 try {
  const r=db.prepare('INSERT INTO users(name,email,phone,password_hash) VALUES(?,?,?,?)').run(name.trim(),email.trim().toLowerCase(),phone,bcrypt.hashSync(password,10));
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
  req.session.user=safeUser(u); res.json({message:'Đăng ký thành công!',user:req.session.user});
 } catch(e){res.status(400).json({error:'Email đã được sử dụng.'});}
});
app.post('/api/login',(req,res)=>{
 const email=String(req.body.email||'').toLowerCase().trim(), password=String(req.body.password||'');
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!u||!bcrypt.compareSync(password,u.password_hash)) return res.status(401).json({error:'Email hoặc mật khẩu không chính xác.'});
 req.session.user=safeUser(u); res.json({message:'Đăng nhập thành công!',user:req.session.user});
});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({message:'Đã đăng xuất.'})));
app.get('/api/categories',(req,res)=>res.json(db.prepare('SELECT * FROM categories ORDER BY name').all()));
app.get('/api/products',(req,res)=>{
 const {q='',category=''}=req.query;
 let sql=`SELECT p.*, c.name category FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1`;
 const args=[];
 if(q){sql+=' AND (p.name LIKE ? OR p.description LIKE ?)';args.push('%'+q+'%','%'+q+'%');}
 if(category){sql+=' AND c.id=?';args.push(Number(category));}
 sql+=' ORDER BY p.id DESC';
 res.json(db.prepare(sql).all(...args));
});
app.get('/api/favorites',auth,(req,res)=>res.json(db.prepare('SELECT product_id FROM favorites WHERE user_id=?').all(req.session.user.id).map(x=>x.product_id)));
app.post('/api/favorites/:id',auth,(req,res)=>{
 const uid=req.session.user.id,pid=Number(req.params.id);
 const exists=db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND product_id=?').get(uid,pid);
 if(exists) db.prepare('DELETE FROM favorites WHERE user_id=? AND product_id=?').run(uid,pid);
 else db.prepare('INSERT OR IGNORE INTO favorites(user_id,product_id) VALUES(?,?)').run(uid,pid);
 res.json({favorite:!exists});
});
app.put('/api/profile',auth,(req,res)=>{
 const {name,phone,address,age}=req.body;
 if(!name?.trim())return res.status(400).json({error:'Họ tên không được để trống.'});
 db.prepare('UPDATE users SET name=?,phone=?,address=?,age=? WHERE id=?').run(name.trim(),phone||'',address||'',age?Number(age):null,req.session.user.id);
 req.session.user=safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.session.user.id));
 res.json({message:'Cập nhật thông tin thành công.',user:req.session.user});
});
app.put('/api/password',auth,(req,res)=>{
 const {currentPassword,newPassword}=req.body;
 const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.session.user.id);
 if(!bcrypt.compareSync(currentPassword||'',u.password_hash))return res.status(400).json({error:'Mật khẩu hiện tại không chính xác.'});
 if(!newPassword||newPassword.length<8)return res.status(400).json({error:'Mật khẩu mới phải có ít nhất 8 ký tự.'});
 db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword,10),u.id);
 res.json({message:'Đổi mật khẩu thành công.'});
});
app.post('/api/orders',auth,(req,res)=>{
 const {items,customerName,phone,address,paymentMethod='COD'}=req.body;
 if(!Array.isArray(items)||!items.length)return res.status(400).json({error:'Giỏ hàng của bạn đang trống.'});
 if(!customerName?.trim()||!phone?.trim()||!address?.trim())return res.status(400).json({error:'Vui lòng nhập đầy đủ thông tin nhận hàng.'});
 const create=db.transaction(()=>{
  let total=0,lines=[];
  for(const item of items){
   const p=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(Number(item.id));
   const qty=Number(item.quantity);
   if(!p||!Number.isInteger(qty)||qty<1||p.stock<qty)throw new Error(`Sản phẩm ${p?.name||''} không đủ hàng.`);
   total+=p.price*qty;lines.push({p,qty});
  }
  const order=db.prepare('INSERT INTO orders(user_id,customer_name,phone,address,total,payment_method) VALUES(?,?,?,?,?,?)')
   .run(req.session.user.id,customerName.trim(),phone.trim(),address.trim(),total,paymentMethod);
  for(const l of lines){
   db.prepare('INSERT INTO order_items(order_id,product_id,product_name,price,quantity) VALUES(?,?,?,?,?)')
   .run(order.lastInsertRowid,l.p.id,l.p.name,l.p.price,l.qty);
   db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(l.qty,l.p.id);
  }
  return {id:order.lastInsertRowid,total};
 });
 try{res.json({message:'Đặt hàng thành công!',order:create()});}catch(e){res.status(400).json({error:e.message||'Không thể tạo đơn hàng.'});}
});
app.get('/api/my-orders',auth,(req,res)=>{
 const orders=db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(req.session.user.id);
 res.json(orders.map(o=>({...o,items:db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id)})));
});
app.get('/api/admin/products',auth,admin,(req,res)=>res.json(db.prepare('SELECT p.*,c.name category FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC').all()));
app.post('/api/admin/products',auth,admin,(req,res)=>{
 const {name,description='',price,stock,image='',category_id}=req.body;
 if(!name?.trim()||!Number.isFinite(Number(price))||Number(price)<0||!Number.isInteger(Number(stock))||Number(stock)<0)return res.status(400).json({error:'Vui lòng kiểm tra tên, giá và số lượng.'});
 const r=db.prepare('INSERT INTO products(name,description,price,stock,image,category_id) VALUES(?,?,?,?,?,?)').run(name.trim(),description,Number(price),Number(stock),image,category_id?Number(category_id):null);
 res.json({message:'Đã thêm sản phẩm.',id:r.lastInsertRowid});
});
app.put('/api/admin/products/:id',auth,admin,(req,res)=>{
 const {name,description='',price,stock,image='',category_id}=req.body;
 if(!name?.trim()||Number(price)<0||Number(stock)<0)return res.status(400).json({error:'Dữ liệu sản phẩm không hợp lệ.'});
 db.prepare('UPDATE products SET name=?,description=?,price=?,stock=?,image=?,category_id=? WHERE id=?').run(name.trim(),description,Number(price),Number(stock),image,category_id?Number(category_id):null,Number(req.params.id));
 res.json({message:'Đã cập nhật sản phẩm.'});
});
app.delete('/api/admin/products/:id',auth,admin,(req,res)=>{
 db.prepare('UPDATE products SET active=0 WHERE id=?').run(Number(req.params.id));res.json({message:'Đã ẩn sản phẩm.'});
});
app.get('/api/admin/orders',auth,admin,(req,res)=>res.json(db.prepare(`SELECT o.*,u.email FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.id DESC`).all().map(o=>({...o,items:db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id)}))));
app.patch('/api/admin/orders/:id',auth,admin,(req,res)=>{
 const allowed=['Chờ xác nhận','Đang xử lý','Đang giao','Hoàn thành','Đã hủy'];
 if(!allowed.includes(req.body.status))return res.status(400).json({error:'Trạng thái không hợp lệ.'});
 db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,Number(req.params.id));res.json({message:'Đã cập nhật trạng thái.'});
});
app.get('/api/admin/report',auth,admin,(req,res)=>res.json({
 revenue:db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status='Hoàn thành'").get().n,
 orderCount:db.prepare('SELECT COUNT(*) n FROM orders').get().n,
 productCount:db.prepare('SELECT COUNT(*) n FROM products WHERE active=1').get().n,
 bestSellers:db.prepare('SELECT product_name name,SUM(quantity) quantity FROM order_items GROUP BY product_name ORDER BY quantity DESC LIMIT 5').all()
}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Sport Shop running on port ${PORT}`));
