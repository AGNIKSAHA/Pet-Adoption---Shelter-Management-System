import { useEffect, useState } from "react";
import { socket } from "../lib/socket";
export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }
        function onDisconnect() {
            setIsConnected(false);
        }
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        if (!socket.connected) {
            socket.connect();
        }
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
        };
    }, []);
    return { socket, isConnected };
};
