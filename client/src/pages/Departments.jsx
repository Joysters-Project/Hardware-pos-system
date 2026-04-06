import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Departments.css";

const API = "http://localhost:5000/api/departments";

function DepartmentsPage(){

const [departments,setDepartments] = useState([]);
const [search,setSearch] = useState("");
const [name,setName] = useState("");
const [budget,setBudget] = useState("");
const [editId,setEditId] = useState(null);

useEffect(()=>{
loadDepartments();
},[]);

const loadDepartments = async ()=>{
const res = await axios.get(API);
setDepartments(res.data);
};

const addDepartment = async ()=>{

if(!name){
alert("Department name required");
return;
}

if(editId){

await axios.put(`${API}/${editId}`,{
department_name:name,
budget:budget
});

setEditId(null);

}else{

await axios.post(API,{
department_name:name,
budget:budget
});

}

setName("");
setBudget("");

loadDepartments();
};

const editDepartment = (d)=>{
setName(d.department_name);
setBudget(d.budget);
setEditId(d.department_id);
};

const deleteDepartment = async (id)=>{
await axios.delete(`${API}/${id}`);
loadDepartments();
};

const filtered = departments.filter(d =>
d.department_name.toLowerCase().includes(search.toLowerCase())
);

return(

<div className="departments-container">

<h1>Departments</h1>

<div className="search-bar">
<input
className="search"
placeholder="Search department..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>
<button className="search-btn" onClick={()=>setSearch(search)}>🔍 Search</button>
</div>

<div className="quick-add">

<input
placeholder="Department Name"
value={name}
onChange={(e)=>setName(e.target.value)}
/>

<input
placeholder="Budget"
type="number"
value={budget}
onChange={(e)=>setBudget(e.target.value)}
/>

<button onClick={addDepartment}>
{editId ? "Update" : "Quick Add"}
</button>

</div>

<table>

<thead>
<tr>
<th>ID</th>
<th>Department</th>
<th>Budget</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{filtered.map(d=>(
<tr key={d.department_id}>

<td>{d.department_id}</td>
<td>{d.department_name}</td>
<td>{d.budget}</td>

<td>

<button
className="edit-btn"
onClick={()=>editDepartment(d)}
>
Edit
</button>

<button
className="delete-btn"
onClick={()=>deleteDepartment(d.department_id)}
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

export default function Departments(){
const location = useLocation();
const isManagerRoute = location.pathname.startsWith("/manager/");
const role = (localStorage.getItem("role") || "admin").toLowerCase();
const DashboardLayout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

return(
<DashboardLayout active="departments">
<DepartmentsPage/>
</DashboardLayout>
);
}
