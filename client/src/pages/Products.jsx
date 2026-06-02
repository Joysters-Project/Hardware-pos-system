import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Products.css";

const API = "http://localhost:5000/api/products";

async function loadProducts(setProducts, setFilteredProducts) {
  const res = await axios.get(API);
  setProducts(res.data);
  setFilteredProducts(res.data);
}

function ProductsPage(){

const [products,setProducts] = useState([]);
const [filteredProducts,setFilteredProducts] = useState([]);
const [search,setSearch] = useState("");

const [product,setProduct] = useState({
product_name:"",
unit_price:"",
cost_price:"",
stock_quantity:"",
min_stock_quantity:"",
reorder_level:"",
type:"",
batch_no:"",
category_id:"",
brand_id:"",
unit_id:""
});

const [editId,setEditId] = useState(null);

useEffect(()=>{
  loadProducts(setProducts, setFilteredProducts);
},[]);

const handleSearch = async (value) => {
setSearch(value);
const trimmed = value.trim();
if (!trimmed) {
setFilteredProducts(products);
return;
}

try {
const res = await axios.get(`${API}/search`, { params: { q: trimmed } });
setFilteredProducts(Array.isArray(res.data) ? res.data : []);
} catch (error) {
console.error("Product search failed:", error);
setFilteredProducts([]);
}
};

const handleChange = (e)=>{
setProduct({...product,[e.target.name]:e.target.value});
};

const saveProduct = async ()=>{

if(!product.product_name){
alert("Product name required");
return;
}

if(editId){

await axios.put(`${API}/${editId}`,product);
setEditId(null);

}else{

await axios.post(API,product);

}

setProduct({
product_name:"",
unit_price:"",
cost_price:"",
stock_quantity:"",
min_stock_quantity:"",
reorder_level:"",
type:"",
batch_no:"",
category_id:"",
brand_id:"",
unit_id:""
});

loadProducts();
};

const editProduct = (p)=>{
setProduct(p);
setEditId(p.product_id);
};

const deleteProduct = async (id)=>{
await axios.delete(`${API}/${id}`);
loadProducts();
};

const filtered = filteredProducts;

return(

<div className="products-container">

<h1>Products</h1>

<input
className="search"
placeholder="Search product..."
value={search}
onChange={(e)=>handleSearch(e.target.value)}
/>

<div className="product-form">

<input name="product_name" placeholder="Product Name" value={product.product_name} onChange={handleChange}/>
<input name="unit_price" placeholder="Unit Price" value={product.unit_price} onChange={handleChange}/>
<input name="cost_price" placeholder="Cost Price" value={product.cost_price} onChange={handleChange}/>
<input name="stock_quantity" placeholder="Stock Quantity" value={product.stock_quantity} onChange={handleChange}/>
<input name="min_stock_quantity" placeholder="Min Stock" value={product.min_stock_quantity} onChange={handleChange}/>
<input name="reorder_level" placeholder="Reorder Level" value={product.reorder_level} onChange={handleChange}/>
<input name="type" placeholder="Type" value={product.type} onChange={handleChange}/>
<input name="batch_no" placeholder="Batch No" value={product.batch_no} onChange={handleChange}/>
<input name="category_id" placeholder="Category ID" value={product.category_id} onChange={handleChange}/>
<input name="brand_id" placeholder="Brand ID" value={product.brand_id} onChange={handleChange}/>
<input name="unit_id" placeholder="Unit ID" value={product.unit_id} onChange={handleChange}/>

<button onClick={saveProduct}>
{editId ? "Update Product" : "Add Product"}
</button>

</div>

<table>

<thead>

<tr>
<th>ID</th>
<th>Name</th>
<th>Unit Price</th>
<th>Stock</th>
<th>Type</th>
<th>Actions</th>
</tr>

</thead>

<tbody>

{filtered.map(p=>(

<tr key={p.product_id}>

<td>{p.product_id}</td>
<td>{p.product_name}</td>
<td>{p.unit_price}</td>
<td>{p.stock_quantity}</td>
<td>{p.type}</td>

<td>

<button
className="edit-btn"
onClick={()=>editProduct(p)}
>
Edit
</button>

<button
className="delete-btn"
onClick={()=>deleteProduct(p.product_id)}
>
Delete
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

);
}

export default function Products(){
const location = useLocation();
const isManagerRoute = location.pathname.startsWith("/manager/");
const role = (localStorage.getItem("role") || "admin").toLowerCase();
const DashboardLayout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

return(
<DashboardLayout active="products">
<ProductsPage/>
</DashboardLayout>
);
}
