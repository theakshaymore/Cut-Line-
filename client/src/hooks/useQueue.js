import { useEffect, useState } from "react";
import api from "../utils/api";
import useSocket from "./useSocket";

export default function useQueue() {
  const socket = useSocket();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    const res = await api.get("/queue/my-status");
    setEntry(res.data.entry);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const onPositionChanged = ({ newPosition, estimatedWait }) => {
      setEntry((prev) => (prev ? { ...prev, position: newPosition, estimatedWait } : prev));
    };
    const onKicked = () => setEntry(null);
    socket.on("position-changed", onPositionChanged);
    socket.on("kicked-from-queue", onKicked);
    socket.on("your-turn", () => fetchStatus());
    return () => {
      socket.off("position-changed", onPositionChanged);
      socket.off("kicked-from-queue", onKicked);
      socket.off("your-turn");
    };
  }, [socket]);

  return { entry, loading, refresh: fetchStatus, setEntry };
}
