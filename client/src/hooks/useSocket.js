import { useSocketContext } from "../context/SocketContext";

export default function useSocket() {
  return useSocketContext().socket;
}
