import { Search, Loader2, MessageSquare } from "lucide-react";
import { User } from "../../../../types";

interface Conversation {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ConversationSidebarProps {
  conversations: Conversation[] | undefined;
  loadingConversations: boolean;
  selectedUserId: string | null;
  setSelectedUserId: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: User[] | undefined;
}

export default function ConversationSidebar({
  conversations,
  loadingConversations,
  selectedUserId,
  setSelectedUserId,
  searchTerm,
  setSearchTerm,
  searchResults,
}: ConversationSidebarProps) {
  return (
    <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
      <div className="p-4 border-b border-gray-100 bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchTerm.length > 2 ? (
          <div className="p-2 space-y-1">
            <p className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Search Results
            </p>
            {searchResults?.map((u: User) => (
              <button
                key={u._id}
                onClick={() => {
                  setSelectedUserId(u._id);
                  setSearchTerm("");
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedUserId === u._id
                    ? "bg-white shadow-sm ring-1 ring-gray-100"
                    : "hover:bg-white"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                  {u.firstName[0]}
                  {u.lastName[0]}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 leading-none">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {u.role.replace("_", " ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {loadingConversations ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : conversations?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 px-4 text-center">
                <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">
                  No conversations yet. Start one by searching for someone!
                </p>
              </div>
            ) : (
              conversations?.map((conv: Conversation) => (
                <button
                  key={conv._id}
                  onClick={() => setSelectedUserId(conv._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                    selectedUserId === conv._id
                      ? "bg-white shadow-sm ring-1 ring-gray-100"
                      : "hover:bg-white"
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg">
                      {conv.user.firstName[0]}
                      {conv.user.lastName[0]}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-900 truncate">
                        {conv.user.firstName} {conv.user.lastName}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "text-gray-500"}`}
                    >
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
