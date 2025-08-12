import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./pages/PrivateRoute";
import UploadFile from "./pages/UploadFile";
import MyTables from "./pages/MyTables";
import TableData from "./pages/TableData";

export default function App() {
  return (
    <Router>
      <nav>
        <Link to="/login">Login</Link> | <Link to="/register">Registro</Link>
      </nav>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard/> </PrivateRoute>}/>
        <Route path="/subir" element={<PrivateRoute><UploadFile/> </PrivateRoute>}/>
        <Route path="/tablas" element={<PrivateRoute><MyTables/> </PrivateRoute>}/>
        <Route path="/tablas:id" element={<PrivateRoute><TableData/> </PrivateRoute>}/>
      </Routes>
    </Router>
  );
}
