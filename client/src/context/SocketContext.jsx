import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) return undefined;
    const s = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    s.on("connect", () => {
      if (user.role === "customer") {
        s.emit("customer-join", { customerId: user.id });
      }
      if (user.role === "barber" && user.salonId) {
        s.emit("barber-join", { salonId: user.salonId, barberId: user.id });
      }
    });

    setSocket(s);
    return () => s.disconnect();
  }, [token, user]);

  const value = useMemo(() => ({ socket }), [socket]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocketContext = () => useContext(SocketContext);
