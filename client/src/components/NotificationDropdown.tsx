import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Clock, Trash2, ExternalLink, Loader2, BellOff, } from "lucide-react";
import api from "../lib/api";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}
export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const { data: notifications, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const response = await api.get("/notifications");
            return response.data.data;
        },
        refetchInterval: 30000,
    });
    const markReadMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
    const markAllReadMutation = useMutation({
        mutationFn: () => api.patch("/notifications/mark-all-read"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast.success("All marked as read");
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/notifications/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const unreadCount = notifications?.filter((n: Notification) => !n.isRead).length || 0;
    return (<div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`p-2 rounded-full relative transition-all ${isOpen
            ? "bg-primary-50 text-primary-600"
            : "text-gray-600 hover:bg-gray-100"}`}>
        <Bell className="w-5 h-5"/>
        {unreadCount > 0 && (<span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>)}
      </button>

      {isOpen && (<div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">
                {unreadCount} Unread
              </p>
            </div>
            {unreadCount > 0 && (<button onClick={() => markAllReadMutation.mutate()} className="text-[10px] bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-bold hover:bg-primary-100 transition-colors" disabled={markAllReadMutation.isPending}>
                Mark all as read
              </button>)}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (<div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-2"/>
                <p className="text-xs">Loading updates...</p>
              </div>) : notifications?.length === 0 ? (<div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <BellOff className="w-10 h-10 mb-2 opacity-20"/>
                <p className="text-xs">All caught up!</p>
              </div>) : (notifications?.map((notification: Notification) => (<div key={notification._id} className={`p-4 transition-all group hover:bg-gray-50 ${!notification.isRead ? "bg-primary-50/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notification.isRead
                    ? "bg-primary-100 text-primary-600"
                    : "bg-gray-100 text-gray-500"}`}>
                      {notification.type === "message" ? (<Bell className="w-4 h-4"/>) : (<Clock className="w-4 h-4"/>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm leading-tight mb-1 ${!notification.isRead ? "font-bold text-gray-900" : "text-gray-600"}`}>
                          {notification.title}
                        </p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (<button onClick={() => markReadMutation.mutate(notification._id)} className="p-1 hover:bg-white rounded text-primary-600 shadow-sm border border-gray-100" title="Mark read">
                              <Check className="w-3 h-3"/>
                            </button>)}
                          <button onClick={() => deleteMutation.mutate(notification._id)} className="p-1 hover:bg-white rounded text-red-500 shadow-sm border border-gray-100" title="Delete">
                            <Trash2 className="w-3 h-3"/>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {notification.link && (<Link to={notification.link} onClick={() => {
                        setIsOpen(false);
                        if (!notification.isRead)
                            markReadMutation.mutate(notification._id);
                    }} className="text-[10px] text-primary-600 font-bold flex items-center gap-0.5 hover:underline">
                            View Details{" "}
                            <ExternalLink className="w-2.5 h-2.5"/>
                          </Link>)}
                      </div>
                    </div>
                  </div>
                </div>)))}
          </div>

          <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              End of Notifications
            </span>
          </div>
        </div>)}
    </div>);
}
