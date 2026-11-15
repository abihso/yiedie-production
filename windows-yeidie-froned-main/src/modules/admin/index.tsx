import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Images } from "../../assets/images";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  normalizeMediaUrl,
  type Booking,
  type Conversation,
} from "../../lib/api";
import Calendar from "../../components/calendar";
import { MobileBottomNav } from "../../components/mobile-bottom-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfessionalDashboard } from "../../features/counsellor/use-professional-dashboard";
import { DashboardDialog } from "../../components/dashboard-dialog";
import { SatisfactionGauge } from "../../components/satisfaction-gauge";

type AppointmentSortKey = "client" | "status" | "date" | "time";

const appointmentColumns: { label: string; sortKey?: AppointmentSortKey }[] = [
  { label: "Client", sortKey: "client" },
  { label: "Appointment" },
  { label: "Status", sortKey: "status" },
  { label: "Date", sortKey: "date" },
  { label: "Time", sortKey: "time" },
  { label: "Action" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    bookings,
    availableSlots,
    conversations,
    reactionCount,
    dashboardLoading,
    loadError,
    liveNotice,
    setLiveNotice,
    actionError,
    setActionError,
    busyIds,
    now,
    updateBooking,
    createSlot,
    deleteSlot,
    joinAppointment,
    retry,
  } = useProfessionalDashboard();
  const [appointmentSort, setAppointmentSort] = useState<{
    key: AppointmentSortKey;
    direction: "ascending" | "descending";
  }>({ key: "date", direction: "ascending" });
  const [searchTerm, setSearchTerm] = useState("");
  const [dialog, setDialog] = useState<
    "availability" | "appointments" | "pending" | "satisfaction" | null
  >(null);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navItems = ["Dashboard", "Why Yiedie", "How it works", "Pricing"];
  const [activeNav, setActiveNav] = useState("Dashboard");

  function openAvailability() {
    setActionError("");
    setDialog("availability");
  }

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setActionError("");
    try {
      await api.logout();
      navigate("/", { replace: true });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
      setIsLoggingOut(false);
    }
  }

  const sidebarGroups = [
    [
      { icon: "mynaui:users-group", label: "Counselors" },
      { icon: "vadivam:network", label: "Organisation" },
    ],
    [
      {
        icon: "weui:discover-outlined",
        label: "Discover",
        link: "/dashboard/discovery",
      },
      { icon: "solar:feed-linear", label: "Feeds", link: "/dashboard/feeds" },
      { icon: "reicon:save", label: "Saved" },
    ],
    [
      {
        icon: "mage:message-round",
        label: "Message",
        link: "/dashboard/messages",
      },
      { icon: "arcticons:google-journal", label: "My Journals" },
      { icon: "grommet-icons:resources", label: "Resources" },
    ],
    [
      { icon: "akar-icons:schedule", label: "Schedule" },
      { icon: "qlementine-icons:task-16", label: "Task" },
    ],
  ];

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-3 py-5 sm:px-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-14 w-16 rounded-2xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="mt-16 space-y-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-8 w-96 max-w-full" />
          <Skeleton className="mt-5 h-14 w-full rounded-full" />
        </div>
      </div>
    );
  }

  const pendingRequests = bookings.filter(
    (booking) => booking.status === "pending",
  );
  const matchingBookings = bookings.filter((booking) =>
    [
      booking.clientName,
      booking.counsellorName,
      booking.status,
      booking.note,
    ].some((value) =>
      value.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    ),
  );
  const sortedBookings = [...matchingBookings].sort((first, second) => {
    const firstDate = new Date(first.startsAt);
    const secondDate = new Date(second.startsAt);
    let comparison = 0;

    switch (appointmentSort.key) {
      case "client":
        comparison = first.clientName.localeCompare(second.clientName);
        break;
      case "status":
        comparison = first.status.localeCompare(second.status);
        break;
      case "date":
        comparison = firstDate.getTime() - secondDate.getTime();
        break;
      case "time":
        comparison =
          firstDate.getHours() * 60 +
          firstDate.getMinutes() -
          (secondDate.getHours() * 60 + secondDate.getMinutes());
        break;
    }

    return appointmentSort.direction === "ascending" ? comparison : -comparison;
  });
  const upcomingAppointments = sortedBookings.filter(
    (booking) =>
      (booking.status === "confirmed" || booking.status === "pending") &&
      Date.parse(booking.endsAt) > now,
  );
  const completedCount = bookings.filter(
    (booking) => booking.status === "completed",
  ).length;
  const recentConversations = conversations
    .filter((conversation) => conversation.latestMessage)
    .slice(0, 5);

  function conversationName(conversation: Conversation) {
    if (conversation.kind === "group") {
      return conversation.title || "Group conversation";
    }
    return (
      conversation.members.find((member) => member.id !== user?.id)?.fullName ??
      "Conversation"
    );
  }

  function formatRelativeTime(date: string) {
    const elapsed = now - new Date(date).getTime();
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return "Now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  function renderBookingActions(booking: Booking) {
    const canManage =
      user?.role === "counsellor" && booking.counsellorId === user.id;
    const busy = busyIds.includes(booking.id);
    const canJoin =
      booking.status === "confirmed" &&
      now >= Date.parse(booking.startsAt) - 15 * 60_000 &&
      now < Date.parse(booking.endsAt);
    if (!canManage) return null;
    return (
      <div className="flex flex-wrap gap-2 pt-2">
        {booking.status === "pending" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void updateBooking(booking, "confirmed")}
            className="rounded bg-[#79ABF8] px-2 py-1 font-semibold text-[#010158] disabled:opacity-50"
          >
            Accept
          </button>
        )}
        {booking.status === "confirmed" && Date.parse(booking.endsAt) > now && (
          <button
            type="button"
            disabled={busy || !canJoin}
            title={
              canJoin
                ? "Join session"
                : "Available 15 minutes before the session starts"
            }
            onClick={() => void joinAppointment(booking)}
            className="rounded bg-[#1900FF] px-2 py-1 font-semibold text-white disabled:opacity-50"
          >
            Join session
          </button>
        )}
        {booking.status === "confirmed" &&
          Date.parse(booking.endsAt) <= now && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void updateBooking(booking, "completed")}
              className="rounded bg-blue-100 px-2 py-1 font-semibold text-blue-700 disabled:opacity-50"
            >
              Mark complete
            </button>
          )}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void updateBooking(booking, "cancelled")}
            className="rounded bg-red-100 px-2 py-1 font-semibold text-red-700 disabled:opacity-50"
          >
            {booking.status === "pending" ? "Reject" : "Cancel"}
          </button>
        )}
      </div>
    );
  }

  function renderAppointmentTable(rows: Booking[]) {
    return (
      <table className="w-full min-w-[600px] text-left text-xs text-[#0A0332]">
        <caption className="sr-only">Appointments</caption>
        <thead className="sticky top-0 z-10 bg-[#DFE5F5]">
          <tr>
            {appointmentColumns.map(({ label, sortKey }) => {
              const active = appointmentSort.key === sortKey;
              const SortIcon = active
                ? appointmentSort.direction === "ascending"
                  ? ArrowUp
                  : ArrowDown
                : ArrowUpDown;

              return (
                <th
                  key={label}
                  scope="col"
                  aria-sort={
                    sortKey
                      ? active
                        ? appointmentSort.direction
                        : "none"
                      : undefined
                  }
                  className="px-3 py-3 font-bold whitespace-nowrap"
                >
                  {sortKey ? (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded cursor-pointer hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
                      aria-label={`Sort by ${label.toLowerCase()}, ${active && appointmentSort.direction === "ascending" ? "descending" : "ascending"}`}
                      onClick={() =>
                        setAppointmentSort((current) => ({
                          key: sortKey,
                          direction:
                            current.key === sortKey &&
                            current.direction === "ascending"
                              ? "descending"
                              : "ascending",
                        }))
                      }
                    >
                      {label}
                      <SortIcon
                        className={`h-3.5 w-3.5 ${active ? "text-blue-600" : "text-slate-400"}`}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ACA9FF]/30">
          {rows.length > 0 ? (
            rows.map((booking) => (
              <tr
                key={booking.id}
                className="transition-colors hover:bg-white/50"
              >
                <td className="px-3 py-3 font-semibold">
                  {booking.clientName}
                </td>
                <td className="px-3 py-3">Consultation</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${booking.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : booking.status === "completed" ? "bg-blue-100 text-blue-700" : booking.status === "cancelled" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-800"}`}
                  >
                    {booking.status}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {new Date(booking.startsAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {new Date(booking.startsAt).toLocaleTimeString("en-GB", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td className="px-3 py-3">
                  <details>
                    <summary className="cursor-pointer font-semibold text-blue-600 rounded focus-visible:outline-2 focus-visible:outline-blue-500">
                      View
                      <span className="sr-only">
                        {" "}
                        appointment for {booking.clientName}
                      </span>
                    </summary>
                    <div className="mt-2 min-w-32 space-y-1 text-[11px]">
                      <p>
                        <span className="font-semibold">Counsellor:</span>{" "}
                        {booking.counsellorName}
                      </p>
                      <p className="whitespace-pre-wrap break-words">
                        {booking.note || "No appointment notes."}
                      </p>
                      {renderBookingActions(booking)}
                    </div>
                  </details>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                No appointments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div className="min-h-screen px-3 py-5 sm:px-5 bg-[#f3f7ff]">
      <AnimatePresence>
        {liveNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className="fixed right-4 top-4 z-100 flex max-w-sm items-start gap-3 rounded-xl border border-[#D5E7FF] bg-white px-4 py-3 text-sm text-[#000057] shadow-lg"
          >
            <span className="min-w-0 flex-1">{liveNotice}</span>
            <button
              type="button"
              onClick={() => setLiveNotice("")}
              aria-label="Dismiss notification"
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Section */}
      <div className="mobile-dashboard-header min-h-48 px-3 sm:px-5 pb-5 overflow-visible rounded-2xl">
        <div className="pt-2 flex items-center justify-center relative">
          <div className="w-[94%] h-12 border pl-10 rounded-3xl bg-[#ECF0FA] flex justify-between items-center">
            <div className="flex gap-7">
              {navItems.map((item) => (
                <p
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={`text-xs font-bold transition-colors duration-200 cursor-pointer hover:text-[#FF9001] ${
                    activeNav === item ? "text-[#FF9001]" : "text-[#0A0332]"
                  }`}
                >
                  {item}
                </p>
              ))}
            </div>
            <div className="flex gap-3 pr-4 items-center">
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon
                  icon="griddy-icons:notification-new"
                  className="text-[#010158] text-xl sm:text-2xl shrink-0 cursor-pointer"
                />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon
                  icon="boxicons:message-circle-notification"
                  className="text-[#010158] text-xl sm:text-2xl shrink-0 cursor-pointer"
                />
              </motion.div>

              {/* Hover Trigger Container */}
              <div
                className="relative cursor-pointer py-2"
                onMouseEnter={() => setIsProfileOpen(true)}
                onMouseLeave={() => setIsProfileOpen(false)}
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-7 h-7 flex justify-center items-center rounded-full bg-[#FF9001]"
                >
                  <Icon
                    icon="ant-design:user-outlined"
                    className="text-[#010158]"
                  />
                </motion.div>

                {/* Animated Dropdown Menu */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="p-4 min-h-78 rounded-xl bg-[#010158] absolute right-0 top-9 w-60 z-50 shadow-xl"
                    >
                      <div className="h-10 w-10 absolute right-2 -top-1 z-0 bg-[#010158] rotate-45" />
                      <div
                        onClick={() => (window.location.href = "/profile")}
                        className="flex items-center gap-3 z-10 relative"
                      >
                        <Avatar>
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <div className="text-white">
                          <p className="text-xs font-bold">
                            Mr. Godfred Kusi (mentor)
                          </p>
                          <p className="text-[8px]">
                            antwiboasiakotheophilus88@gmail.com
                          </p>
                        </div>
                      </div>
                      <div className="h-10 rounded-md flex bg-white items-center justify-center mt-5">
                        <p className="text-sm font-extrabold">
                          Upgrade to Yiedie
                          <span className="bg-[#FF9001] text-white p-2 rounded-md">
                            Premium
                          </span>
                        </p>
                      </div>
                      <div
                        onClick={() => (window.location.href = "/profile")}
                        className="h-10 flex gap-5 items-center mt-2 cursor-pointer hover:bg-white/10 px-1 rounded-md transition-colors"
                      >
                        <Icon
                          icon="iconamoon:profile-bold"
                          className="text-white text-xl"
                        />
                        <div className="border-b border-[#453E3E] h-full flex items-center w-full">
                          <p className="text-[#ACA9FF] text-xs">User Profile</p>
                        </div>
                      </div>
                      <div className="h-10 flex gap-5 items-center mt-2 cursor-pointer hover:bg-white/10 px-1 rounded-md transition-colors">
                        <Icon
                          icon="famicons:language-sharp"
                          className="text-white text-xl"
                        />
                        <div className="border-b border-[#453E3E] h-full flex justify-between items-center w-full">
                          <p className="text-[#ACA9FF] text-xs">Language</p>
                          <select
                            className="bg-[#252566] text-[#ACA9FF] px-2 py-1 rounded-sm text-xs outline-none"
                            name=""
                            id=""
                          >
                            <option value="English">English</option>
                          </select>
                        </div>
                      </div>
                      <div className="h-10 flex gap-5 items-center mt-2 cursor-pointer hover:bg-white/10 px-1 rounded-md transition-colors">
                        <Icon
                          icon="fluent:dark-theme-20-filled"
                          className="text-white text-xl"
                        />
                        <div className="border-b border-[#453E3E] h-full flex items-center justify-between w-full">
                          <p className="text-[#ACA9FF] text-xs">Theme</p>
                          <select
                            className="bg-[#252566] text-[#ACA9FF] px-2 py-1 rounded-sm text-xs outline-none"
                            name=""
                            id=""
                          >
                            <option value="English">System</option>
                          </select>
                        </div>
                      </div>
                      <div className="h-10 flex gap-5 items-center mt-2 cursor-pointer hover:bg-white/10 px-1 rounded-md transition-colors">
                        <Icon
                          icon="griddy-icons:settings-filled"
                          className="text-white text-xl"
                        />
                        <div className="border-b border-[#453E3E] h-full flex items-center w-full">
                          <p className="text-[#ACA9FF] text-xs">Settings</p>
                        </div>
                      </div>
                      <div className="h-10 flex gap-5 items-center mt-2 cursor-pointer hover:bg-white/10 px-1 rounded-md transition-colors">
                        <Icon
                          icon="simple-icons:openproject"
                          className="text-white text-xl"
                        />
                        <div className="h-full flex items-center justify-between w-full">
                          <p className="text-[#ACA9FF] text-xs">Manage plan</p>
                          <p className="text-[#FF9001] text-xs">Free</p>
                        </div>
                      </div>
                      <div className="flex gap-4 border-y border-[#453E3E] items-center h-10 cursor-pointer hover:bg-white/10 px-1 rounded-md transition-colors">
                        <Icon
                          icon="at-icons:arrow-uturn-left-up"
                          className="text-white text-xl"
                        />
                        <p className="text-[#ACA9FF] text-xs">
                          Switch to a Professional
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isLoggingOut}
                        onClick={() => void logout()}
                        className="flex w-full gap-4 items-center h-10 cursor-pointer hover:bg-white/10 px-1 rounded-md transition-colors disabled:cursor-wait disabled:opacity-60"
                      >
                        <Icon
                          icon="solar:logout-3-bold-duotone"
                          className="text-white text-xl"
                        />
                        <p className="text-[#ACA9FF] text-xs">
                          {isLoggingOut ? "Signing out..." : "Logout"}
                        </p>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="absolute left-0">
            <img src={Images[0]} className="w-8" alt="" />
          </div>
        </div>

        {/* Hero Search Area */}
        <div className="mt-16 sm:mt-18">
          <p className="text-[#000057] font-extrabold text-xl sm:text-3xl">
            Professional dashboard
          </p>
          {loadError && (
            <div role="alert" className="text-red-600 text-sm mt-2">
              {loadError}{" "}
              <button
                type="button"
                onClick={() => void retry()}
                className="underline"
              >
                Retry
              </button>
            </div>
          )}
          {user?.role !== "admin" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setDialog("appointments");
              }}
              className="bg-[#ECF0FA] h-auto rounded-3xl sm:rounded-full mt-2 px-3 py-3 sm:py-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="border-b sm:border-b-0 sm:border-r-2 h-auto sm:h-3/5 border-[#B6B6B6] pb-2 sm:pb-0 sm:pl-6 sm:pr-6 w-full sm:w-2/10 flex gap-4 items-center shrink-0">
                <Icon
                  icon="ri:search-fill"
                  className="text-[#010158] text-xl sm:text-2xl shrink-0 transition-transform duration-200 hover:scale-110"
                />
                <p className="text-[#999999] text-sm whitespace-nowrap">
                  Appointment search
                </p>
              </div>

              <div className="w-full h-full flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex items-center w-full h-12">
                  <Icon
                    icon="duo-icons:location"
                    className="absolute left-4 text-xl sm:text-2xl text-[#010158] z-10 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full h-full text-[#999999] rounded-full pl-14 sm:pl-16 pr-4 bg-[#ECF0FA] sm:bg-transparent outline-none border sm:border-none text-sm transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-[#1900FF]/30"
                    placeholder="Search by client name or status"
                  />
                </div>
                <Button
                  type="submit"
                  variant={"secondary"}
                  className={
                    "bg-[#010158] hover:bg-[#1900ffa6] font-bold w-full sm:w-50 rounded-full h-12 text-white px-8 shrink-0 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  }
                >
                  Search
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Main Content Section */}
      <div className="mt-5 flex flex-col lg:flex-row gap-3 sm:gap-5 items-start">
        {/* Left Sidebar Stack */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-3 shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#FF9001] h-15 w-15 rounded-2xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
            >
              <Icon
                icon="hugeicons:menu-square"
                className="w-8 h-8 text-white"
              />
            </motion.div>
          </div>
          <div className="flex flex-col justify-between items-center py-6 bg-color6 border border-[#c1c1ff] rounded-2xl w-15 shrink-0 min-h-[155] lg:min-h-full">
            <div className="flex flex-col items-center gap-2 w-full">
              {sidebarGroups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="flex flex-col items-center gap-2 w-full"
                >
                  {group.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        item.label === "Schedule"
                          ? openAvailability()
                          : item.label === "Counselors"
                            ? navigate("/dashboard/discovery")
                            : item.link && navigate(item.link)
                      }
                      className="relative group flex items-center justify-center w-full h-10 px-3 cursor-pointer bg-transparent border-none transition-transform duration-200 active:scale-90"
                    >
                      <Icon
                        icon={item.icon}
                        className="text-4xl text-[#aabfe1] group-hover:text-[#1900FF] shrink-0 transition-all duration-200 group-hover:scale-110"
                      />
                      <div className="absolute z-10 left-16 h-10 w-32 pl-4 items-center justify-start hidden group-hover:flex">
                        <div className="h-10 w-25 bg-[#0A0332] py-2 px-4 rounded-lg flex items-center justify-center shadow-md relative transition-transform duration-200 animate-in fade-in slide-in-from-left-2 before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-r-[#0A0332]">
                          <p className="text-white font-bold text-sm tracking-tight whitespace-nowrap">
                            {item.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {gIdx < sidebarGroups.length - 1 && (
                    <div className="border border-[#DEDEDE] my-1 w-[80%]" />
                  )}
                </div>
              ))}
            </div>

            <div className="w-full flex flex-col items-center pt-2">
              <div className="border border-[#DEDEDE] mb-2 w-[80%]" />
              <button className="relative group flex items-center justify-center w-full h-10 px-3 cursor-pointer bg-transparent border-none transition-transform duration-200 active:scale-90">
                <Icon
                  icon="uil:setting"
                  className="text-4xl text-[#aabfe1] group-hover:text-[#1900FF] shrink-0 transition-all duration-200 group-hover:scale-110"
                />
                <div className="absolute z-10 left-16 h-10 w-32 pl-4 items-center justify-start hidden group-hover:flex">
                  <div className="h-10 w-25 bg-[#0A0332] py-2 px-4 rounded-lg flex items-center justify-center shadow-md relative transition-transform duration-200 animate-in fade-in slide-in-from-left-2 before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-r-[#0A0332]">
                    <p className="text-white font-bold text-sm tracking-tight whitespace-nowrap">
                      Settings
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 rounded-2xl  min-h-125 grid grid-cols-12 gap-3 sm:gap-5 w-full">
          {/* Messages Section */}
          <div className="bg-[#F0EFFC] border border-[#ACA9FF] col-span-3 rounded-2xl min-h-50 lg:min-h-full p-3 overflow-hidden transition-all duration-300 hover:shadow-sm">
            <div className="flex justify-between items-center">
              <p className="font-extrabold text-xl text-color6">Messages</p>
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard/messages")}
                className="text-xs cursor-pointer font-bold text-color6 transition-all duration-200 hover:underline hover:scale-105 active:scale-95"
              >
                View all
              </button>
            </div>

            {recentConversations.length ? (
              recentConversations.map((conversation) => {
                const latestMessage = conversation.latestMessage;
                const otherMember = conversation.members.find(
                  (member) => member.id !== user?.id,
                );
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() =>
                      (window.location.href = `/dashboard/messages?conversationId=${conversation.id}`)
                    }
                    className="h-14 w-full rounded-full p-2 mt-3 flex items-center gap-3 text-left transition-all duration-200 hover:bg-[#d8d6f0] hover:shadow-sm hover:translate-x-1 cursor-pointer group"
                  >
                    <Avatar className="h-10 w-10 shrink-0 transition-transform duration-200 group-hover:scale-110">
                      <AvatarImage
                        src={normalizeMediaUrl(
                          conversation.kind === "direct"
                            ? otherMember?.avatarUrl
                            : undefined,
                        )}
                        alt={`${conversationName(conversation)} profile picture`}
                      />
                      <AvatarFallback>
                        {conversationName(conversation)
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex justify-between w-full min-w-0 border-b-2 py-5">
                      <div className="w-full min-w-0 overflow-hidden">
                        <p className="text-[#0A0332] font-bold text-sm truncate group-hover:text-[#1900FF] transition-colors">
                          {conversationName(conversation)}
                        </p>
                        <p className="text-[#0A0332]/70 font-medium text-xs truncate">
                          {latestMessage?.body}
                        </p>
                      </div>
                      {latestMessage && (
                        <p className="ml-2 shrink-0 text-[10px]">
                          {formatRelativeTime(latestMessage.createdAt)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="mt-5 text-sm text-slate-600">
                Your recent conversations will appear here.
              </p>
            )}
          </div>
          <div className="col-span-6 min-w-0">
            <div className="flex justify-between items-center gap-3 w-full">
              <div className="border bg-[#ECF0FA] border-[#ACA9FF] h-16 rounded-xl p-2 w-full">
                <div className="flex justify-between items-center">
                  <p className="font-extrabold">Reactions</p>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/feeds")}
                    className="text-blue-500 text-[10px]"
                  >
                    View All
                  </button>
                </div>
                <p className="text-[10px] text-[#000057]/70 mt-1">
                  You have
                  <span className="font-bold text-[#FF9001]">
                    {" "}
                    {reactionCount ?? "—"}
                  </span>{" "}
                  reactions on your recent feeds
                </p>
              </div>
              <div className="border bg-[#ECF0FA] border-[#ACA9FF] h-16 rounded-xl p-2 w-full">
                <div className="flex justify-between items-center">
                  <p className="font-extrabold">Total Appointments</p>
                  <button
                    type="button"
                    onClick={() => setDialog("appointments")}
                    className="text-blue-500 text-[10px]"
                  >
                    View All
                  </button>
                </div>
                <p className="text-[10px] text-[#000057]/70 mt-1">
                  You have
                  <span className="font-bold text-[#FF9001]">
                    {" "}
                    {completedCount}{" "}
                  </span>{" "}
                  completed appointments
                </p>
              </div>
            </div>
            <div className="flex mt-3 justify-between items-center gap-3 w-full">
              <div className="border bg-[#ECF0FA] border-[#ACA9FF] h-70 rounded-xl p-2 w-full">
                <div className="flex justify-between items-center">
                  <p className="font-extrabold">Pending appointment request</p>
                  <button
                    type="button"
                    onClick={() => setDialog("pending")}
                    className="text-blue-500 text-[10px]"
                  >
                    View All
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {pendingRequests.length ? (
                    pendingRequests.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex gap-2 mt-2 bg-[#ECF0FA] border hover:shadow-sm rounded-xl p-2 justify-between items-center"
                      >
                        <div className="flex items-center gap-3 w-full min-w-0">
                          <Avatar className="h-14 w-14 shrink-0 transition-transform duration-200 group-hover:scale-110">
                            <AvatarFallback>
                              {booking.clientName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p
                              className="font-bold truncate"
                              title={booking.clientName}
                            >
                              {booking.clientName}
                            </p>
                            <p className="text-xs py-0.5">
                              Individual consultation
                            </p>
                            <p className="flex items-center gap-2 bg-[#95D0F6] rounded-md py-1 px-2 text-[12px] text-[#010158] font-extrabold">
                              <Icon
                                icon="akar-icons:calendar"
                                className="w-5 h-5 shrink-0 text-[#000057]"
                              />
                              {new Date(booking.startsAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                            {booking.note && (
                              <p
                                className="mt-1 truncate text-[10px] text-slate-600"
                                title={booking.note}
                              >
                                {booking.note}
                              </p>
                            )}
                          </div>
                        </div>
                        {user?.role === "counsellor" &&
                          booking.counsellorId === user.id && (
                            <div className="flex justify-between items-center gap-2">
                              <button
                                type="button"
                                disabled={busyIds.includes(booking.id)}
                                onClick={() =>
                                  void updateBooking(booking, "cancelled")
                                }
                                aria-label={`Reject appointment for ${booking.clientName}`}
                                className="w-10 h-10 shrink-0 flex justify-center items-center rounded-full bg-gray-300 disabled:opacity-50"
                              >
                                <Icon
                                  icon="iconoir:cancel"
                                  className="w-5 h-5 text-[#757575]"
                                />
                              </button>
                              <button
                                type="button"
                                disabled={busyIds.includes(booking.id)}
                                onClick={() =>
                                  void updateBooking(booking, "confirmed")
                                }
                                aria-label={`Accept appointment for ${booking.clientName}`}
                                className="w-10 h-10 shrink-0 flex justify-center items-center rounded-full bg-[#79ABF8] disabled:opacity-50"
                              >
                                <Icon
                                  icon="fluent-mdl2:check-mark"
                                  className="w-5 h-5 text-white"
                                />
                              </button>
                            </div>
                          )}
                      </div>
                    ))
                  ) : (
                    <p className="mt-5 text-sm text-slate-600">
                      No pending appointment requests right now.
                    </p>
                  )}
                </div>
              </div>
              <div className="border bg-[#ECF0FA] border-[#ACA9FF] h-70 rounded-xl p-2 w-full min-w-0 flex flex-col">
                <div className="flex justify-between items-center">
                  <p className="font-extrabold">Satisfaction rate</p>
                  <button
                    type="button"
                    onClick={() => setDialog("satisfaction")}
                    className="text-blue-500 text-[10px]"
                  >
                    View All
                  </button>
                </div>
                {/* Replace the sample value with the user's satisfaction percentage. */}
                <SatisfactionGauge value={8} />
                <p className="mt-1 text-center text-[10px] text-slate-500">
                  Sample data
                </p>
              </div>
            </div>
            <div className="border bg-[#ECF0FA] border-[#ACA9FF] h-70 rounded-xl p-2 w-full mt-3 flex flex-col">
              <div className="flex justify-between items-center">
                <p className="font-extrabold">Upcoming Appointment</p>
                <button
                  type="button"
                  onClick={() => setDialog("appointments")}
                  className="text-blue-500 text-[10px]"
                >
                  View All
                </button>
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-[#ACA9FF]/40">
                {renderAppointmentTable(upcomingAppointments.slice(0, 3))}
              </div>
            </div>
          </div>
          <div className="col-span-3">
            <div className="border bg-[#ECF0FA] border-[#ACA9FF] h-16 rounded-xl p-2 w-full">
              <div className="flex justify-between items-center">
                <p className="font-extrabold">Availability</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openAvailability}
                    className="text-blue-500 text-[10px]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={openAvailability}
                    className="text-blue-500 text-[10px]"
                  >
                    View All
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#000057]/70 mt-1">
                {availableSlots.length
                  ? `${availableSlots.length} available time slots`
                  : "No availability set yet"}
              </p>
            </div>
            <div className="h-70 border mt-3 rounded-xl bg-[#ECF0FA] border-[#ACA9FF] overflow-y-auto p-2">
              <p className="font-extrabold">Upcoming availability</p>
              {availableSlots.length ? (
                availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={openAvailability}
                    className="mt-2 block w-full rounded-lg border border-[#ACA9FF]/50 p-2 text-left text-xs hover:bg-white/50"
                  >
                    <p className="font-semibold">
                      {new Date(slot.startsAt).toLocaleDateString([], {
                        dateStyle: "medium",
                      })}
                      {Date.parse(slot.startsAt) <= now && (
                        <span className="ml-2 text-emerald-700">Available now</span>
                      )}
                    </p>
                    <p>
                      {new Date(slot.startsAt).toLocaleTimeString([], {
                        timeStyle: "short",
                      })}{" "}
                      –{" "}
                      {new Date(slot.endsAt).toLocaleTimeString([], {
                        timeStyle: "short",
                      })}
                    </p>
                  </button>
                ))
              ) : (
                <p className="mt-3 text-xs text-slate-600">
                  Create an availability plan to receive appointment requests.
                </p>
              )}
            </div>
            <div className="mt-3 bg-[#ECF0FA]">
              <Calendar />
              <Button
                type="button"
                onClick={openAvailability}
                className={
                  "font-bold bg-[#000057] hover:bg-[#1500d6] h-20 w-full -mt-4 rounded-t-none rounded-b-3xl text-3xl text-white transition-all duration-300 hover:shadow-lg hover:tracking-wide active:scale-98 cursor-pointer"
                }
              >
                Create Availability plan
              </Button>
            </div>
          </div>
        </div>
      </div>
      {actionError && !dialog && (
        <div
          role="alert"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-lg"
        >
          {actionError}
          <button
            type="button"
            onClick={() => setActionError("")}
            className="ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {dialog && (
        <DashboardDialog
          title={
            dialog === "availability"
              ? "Manage availability"
              : dialog === "pending"
                ? "Pending appointment requests"
                : dialog === "satisfaction"
                  ? "Satisfaction rate"
                  : "All appointments"
          }
          onClose={() => setDialog(null)}
        >
          {actionError && (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {actionError}
            </p>
          )}
          {dialog === "availability" && liveNotice === "Availability saved." && (
            <p role="status" className="mb-3 text-sm text-emerald-700">
              Availability saved. Your time slot is listed below.
            </p>
          )}
          {dialog === "availability" ? (
            user?.role === "counsellor" ? (
              <>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (await createSlot(slotStart, slotEnd)) {
                      setSlotStart("");
                      setSlotEnd("");
                    }
                  }}
                  className="space-y-3 rounded-xl border border-[#ACA9FF]/50 p-3"
                >
                  <p className="font-bold">Add availability</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold">
                      Start time
                      <input
                        type="datetime-local"
                        required
                        value={slotStart}
                        onChange={(event) => setSlotStart(event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-[#ACA9FF] bg-white p-2"
                      />
                    </label>
                    <label className="text-xs font-semibold">
                      End time
                      <input
                        type="datetime-local"
                        required
                        value={slotEnd}
                        onChange={(event) => setSlotEnd(event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-[#ACA9FF] bg-white p-2"
                      />
                    </label>
                  </div>
                  <Button
                    type="submit"
                    disabled={busyIds.includes("create-slot")}
                    className="bg-[#1900FF] text-white"
                  >
                    {busyIds.includes("create-slot")
                      ? "Saving…"
                      : "Save availability"}
                  </Button>
                </form>
                <p className="mb-2 mt-5 font-bold">My upcoming availability</p>
                <div className="space-y-2">
                  {availableSlots.length ? (
                    availableSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#ACA9FF]/50 p-3"
                      >
                        <div className="text-xs">
                          <p className="font-semibold">
                            {new Date(slot.startsAt).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          <p>
                            to{" "}
                            {new Date(slot.endsAt).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyIds.includes(slot.id)}
                          onClick={() => void deleteSlot(slot.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">
                      No availability set yet.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p>Availability can be managed from a counsellor account.</p>
            )
          ) : dialog === "satisfaction" ? (
            <p className="text-sm">
              The gauge currently shows sample data. Client satisfaction ratings
              are not available yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              {renderAppointmentTable(
                dialog === "pending"
                  ? sortedBookings.filter(
                      (booking) => booking.status === "pending",
                    )
                  : sortedBookings,
              )}
            </div>
          )}
        </DashboardDialog>
      )}
      <MobileBottomNav />
    </div>
  );
};

export default AdminDashboard;
