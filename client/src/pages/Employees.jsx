import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Employees.css";

const API = "http://localhost:5000/api/employees";

function EmployeesPage(){

const [employees,setEmployees] = useState([]);
const [search,setSearch] = useState("");
const [firstName,setFirstName] = useState("");
const [lastName,setLastName] = useState("");
const [position,setPosition] = useState("");
const [email,setEmail] = useState("");
const [phone,setPhone] = useState("");
const [salary,setSalary] = useState("");
const [departmentId,setDepartmentId] = useState("");
const [hireDate,setHireDate] = useState("");
const [editId,setEditId] = useState(null);
const [departments,setDepartments] = useState([]);

useEffect(()=>{
loadEmployees();
loadDepartments();
},[]);

const loadEmployees = async ()=>{
const res = await axios.get(API);
setEmployees(res.data);
};

const loadDepartments = async ()=>{
const res = await axios.get("http://localhost:5000/api/departments");
setDepartments(res.data);
};

const addEmployee = async ()=>{

if(!firstName || !lastName || !position || !email || !departmentId || !hireDate){
alert("All required fields must be filled");
return;
}

if(editId){

await axios.put(`${API}/${editId}`,{
first_name:firstName,
last_name:lastName,
position:position,
email:email,
phone_no:phone,
salary:salary,
hire_date:hireDate,
department_id:departmentId
});

setEditId(null);

}else{

await axios.post(API,{
first_name:firstName,
last_name:lastName,
position:position,
email:email,
phone_no:phone,
salary:salary,
hire_date:hireDate,
department_id:departmentId
});

}

setFirstName("");
setLastName("");
setPosition("");
setEmail("");
setPhone("");
setSalary("");
setDepartmentId("");
setHireDate("");

loadEmployees();
};

const editEmployee = (e)=>{
setFirstName(e.first_name);
setLastName(e.last_name);
setPosition(e.position);
setEmail(e.email);
setPhone(e.phone_no || "");
setSalary(e.salary || "");
setDepartmentId(e.department_id);
setHireDate(e.hire_date || "");
setEditId(e.employee_id);
};

const deleteEmployee = async (id)=>{
await axios.delete(`${API}/${id}`);
loadEmployees();
};

const filtered = employees.filter(e =>
e.first_name.toLowerCase().includes(search.toLowerCase()) ||
e.last_name.toLowerCase().includes(search.toLowerCase()) ||
e.email.toLowerCase().includes(search.toLowerCase())
);

const getDepartmentName = (id) => {
const dept = departments.find(d => d.department_id === id);
return dept ? dept.department_name : "N/A";
};

return(

<div className="employees-container">

<h1>Employees</h1>

<div className="search-bar">
<input
className="search"
placeholder="Search employees..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>
<button className="search-btn" onClick={()=>setSearch(search)}>🔍 Search</button>
</div>

<div className="quick-add">

<input
placeholder="First Name"
value={firstName}
onChange={(e)=>setFirstName(e.target.value)}
/>

<input
placeholder="Last Name"
value={lastName}
onChange={(e)=>setLastName(e.target.value)}
/>

<input
placeholder="Position"
value={position}
onChange={(e)=>setPosition(e.target.value)}
/>

<input
placeholder="Hire Date"
type="date"
value={hireDate}
onChange={(e)=>setHireDate(e.target.value)}
/>

<input
placeholder="Email"
type="email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>

<input
placeholder="Phone"
value={phone}
onChange={(e)=>setPhone(e.target.value)}
/>

<input
placeholder="Salary"
type="number"
value={salary}
onChange={(e)=>setSalary(e.target.value)}
/>

<select
value={departmentId}
onChange={(e)=>setDepartmentId(e.target.value)}
>
<option value="">Select Department</option>
{departments.map(d=>(
<option key={d.department_id} value={d.department_id}>
{d.department_name}
</option>
))}
</select>

<button onClick={addEmployee}>
{editId ? "Update" : "Quick Add"}
</button>

</div>

<table>

<thead>
<tr>
<th>ID</th>
<th>Name</th>
<th>Position</th>
<th>Hire Date</th>
<th>Email</th>
<th>Phone</th>
<th>Department</th>
<th>Salary</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{filtered.map(e=>(
<tr key={e.employee_id}>

<td>{e.employee_id}</td>
<td>{e.first_name} {e.last_name}</td>
<td>{e.position}</td>
<td>{e.hire_date ? new Date(e.hire_date).toLocaleDateString() : "N/A"}</td>
<td>{e.email}</td>
<td>{e.phone_no || "N/A"}</td>
<td>{getDepartmentName(e.department_id)}</td>
<td>{e.salary ? `$${e.salary}` : "N/A"}</td>

<td>

<button
className="edit-btn"
onClick={()=>editEmployee(e)}
>
Edit
</button>

<button
className="delete-btn"
onClick={()=>deleteEmployee(e.employee_id)}
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

export default function Employees(){
const location = useLocation();
const isManagerRoute = location.pathname.startsWith("/manager/");
const role = (localStorage.getItem("role") || "admin").toLowerCase();
const DashboardLayout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

return(
<DashboardLayout active="employees">
<EmployeesPage/>
</DashboardLayout>
);
}