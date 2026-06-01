import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Departments.css";

const API = "http://localhost:5000/api/departments";
const EMPLOYEE_API = "http://localhost:5000/api/employees";

function DepartmentsPage(){

const [departments,setDepartments] = useState([]);
const [search,setSearch] = useState("");
const [name,setName] = useState("");
const [budget,setBudget] = useState("");
const [editId,setEditId] = useState(null);
const [employees,setEmployees] = useState([]);
const [viewDepartment,setViewDepartment] = useState(null);

useEffect(()=>{
loadDepartments();
loadEmployees();
},[]);

const loadDepartments = async ()=>{
const res = await axios.get(API);
setDepartments(res.data);
};

const loadEmployees = async ()=>{
const res = await axios.get(EMPLOYEE_API);
setEmployees(res.data);
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

const getDepartmentEmployees = (departmentId) => {
return employees.filter(
e => String(e.department_id) === String(departmentId)
);
};

const viewedDepartmentEmployees = viewDepartment
? getDepartmentEmployees(viewDepartment.department_id)
: [];

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
placeholder="Budget (LKR)"
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
<th>Employee Count</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{filtered.map(d=>(
<tr key={d.department_id}>

<td>{d.department_id}</td>
<td>{d.department_name}</td>
<td>{d.budget ? `LKR ${Number(d.budget).toLocaleString("en-LK")}` : "N/A"}</td>
<td>{getDepartmentEmployees(d.department_id).length}</td>

<td>

<button
className="view-btn"
onClick={()=>setViewDepartment(d)}
>
View
</button>

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

{viewDepartment && (
<div className="department-employees-panel">
<div className="department-employees-header">
<h2>{viewDepartment.department_name} - Employees</h2>
<button
className="close-view-btn"
onClick={()=>setViewDepartment(null)}
>
Close
</button>
</div>

{viewedDepartmentEmployees.length === 0 ? (
<p className="empty-employee-text">No employees in this department.</p>
) : (
<table className="department-employees-table">
<thead>
<tr>
<th>ID</th>
<th>Name</th>
<th>Position</th>
<th>Email</th>
<th>Phone</th>
<th>Hire Date</th>
</tr>
</thead>
<tbody>
{viewedDepartmentEmployees.map(e => (
<tr key={e.employee_id}>
<td>{e.employee_id}</td>
<td>{e.first_name} {e.last_name}</td>
<td>{e.position || "N/A"}</td>
<td>{e.email || "N/A"}</td>
<td>{e.phone_no || "N/A"}</td>
<td>{e.hire_date ? new Date(e.hire_date).toLocaleDateString() : "N/A"}</td>
</tr>
))}
</tbody>
</table>
)}
</div>
)}

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
