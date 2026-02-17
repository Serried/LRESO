import React from "react";
import { Navigate } from "react-router-dom";

function RoleBasedRoute({ teacherComponent, studentComponent }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user.role === "TEACHER") return teacherComponent;
  if (user.role === "STUDENT") return studentComponent;

  return <Navigate to="/" replace />;
}

export default RoleBasedRoute;
