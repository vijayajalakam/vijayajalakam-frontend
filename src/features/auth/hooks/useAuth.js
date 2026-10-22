import { useContext } from "react";
import { AuthContext } from "../config/AuthContext";

export const useAuth = () => useContext(AuthContext);
