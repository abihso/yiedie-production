import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  type AvailabilitySlot,
  type Booking,
  type Conversation,
  type User,
} from "../../lib/api";
import { useCalls } from "../calls/call-context";

async function allPages<T>(readPage: (offset: number) => Promise<T[]>) {
  const items: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await readPage(offset);
    items.push(...page);
    if (page.length < 100) return items;
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useProfessionalDashboard() {
  const navigate = useNavigate();
  const { socket } = useCalls();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reactionCount, setReactionCount] = useState<number | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [liveNotice, setLiveNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const locks = useRef(new Set<string>());
  const refreshVersion = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = useCallback(async (currentUser: User) => {
    const version = ++refreshVersion.current;
    const results = await Promise.allSettled([
      allPages(async (offset) => (await api.bookings(offset, 100)).bookings),
      currentUser.role === "counsellor"
        ? allPages(
            async (offset) =>
              (await api.counsellorAvailability(currentUser.id, offset, 100))
                .slots,
          )
        : Promise.resolve([] as AvailabilitySlot[]),
      api.conversations(),
      api.posts(),
    ]);
    if (version !== refreshVersion.current) return;
    const [bookingResult, slotResult, conversationResult, postResult] = results;
    if (bookingResult.status === "fulfilled") {
      setBookings(
        bookingResult.value.filter(
          (booking) =>
            currentUser.role === "admin" ||
            booking.counsellorId === currentUser.id,
        ),
      );
    }
    if (slotResult.status === "fulfilled") setAvailableSlots(slotResult.value);
    if (conversationResult.status === "fulfilled")
      setConversations(conversationResult.value.conversations);
    if (postResult.status === "fulfilled") {
      setReactionCount(
        postResult.value.posts
          .filter((post) => post.author.id === currentUser.id)
          .reduce((count, post) => count + (post.likes ?? 0), 0),
      );
    }
    const errors = results.flatMap((result) =>
      result.status === "rejected"
        ? [
            errorMessage(
              result.reason,
              "Some dashboard data could not be loaded.",
            ),
          ]
        : [],
    );
    setLoadError([...new Set(errors)].join(" "));
  }, []);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const currentUser = await api.me();
        if (disposed) return;
        if (currentUser.role === "client") {
          navigate("/home", { replace: true });
          return;
        }
        setUser(currentUser);
        await refresh(currentUser);
      } catch (error) {
        if (disposed) return;
        if ((error as { status?: number }).status === 401)
          navigate("/", { replace: true });
        else
          setLoadError(errorMessage(error, "Unable to load your dashboard."));
      } finally {
        if (!disposed) setDashboardLoading(false);
      }
    })();
    return () => {
      disposed = true;
      refreshVersion.current += 1;
    };
  }, [navigate, refresh]);

  useEffect(() => {
    if (!socket || !user) return;
    const reload = () => {
      void refresh(user);
    };
    const bookingChanged = (booking: Booking) => {
      if (booking.counsellorId !== user.id && user.role !== "admin") return;
      setBookings((current) =>
        current.some((item) => item.id === booking.id)
          ? current.map((item) => (item.id === booking.id ? booking : item))
          : [booking, ...current],
      );
      setLiveNotice(
        booking.status === "pending"
          ? `New appointment request from ${booking.clientName}.`
          : `Appointment with ${booking.clientName}: ${booking.status}.`,
      );
      reload();
    };
    const availabilityChanged = (change: { counsellorId: string }) => {
      if (change.counsellorId === user.id) reload();
    };
    socket.on("booking:created", bookingChanged);
    socket.on("booking:updated", bookingChanged);
    socket.on("availability:created", availabilityChanged);
    socket.on("availability:deleted", availabilityChanged);
    socket.on("availability:changed", availabilityChanged);
    socket.on("message:new", reload);
    socket.on("connect", reload);
    if (socket.connected) reload();
    return () => {
      socket.off("booking:created", bookingChanged);
      socket.off("booking:updated", bookingChanged);
      socket.off("availability:created", availabilityChanged);
      socket.off("availability:deleted", availabilityChanged);
      socket.off("availability:changed", availabilityChanged);
      socket.off("message:new", reload);
      socket.off("connect", reload);
    };
  }, [socket, user, refresh]);

  useEffect(() => {
    if (!liveNotice) return;
    const timer = window.setTimeout(() => setLiveNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [liveNotice]);

  async function runAction(id: string, action: () => Promise<void>) {
    if (locks.current.has(id)) return false;
    locks.current.add(id);
    setBusyIds((current) => [...current, id]);
    setActionError("");
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          "Unable to complete this action. Please try again.",
        ),
      );
      return false;
    } finally {
      locks.current.delete(id);
      setBusyIds((current) => current.filter((item) => item !== id));
    }
  }

  async function updateBooking(booking: Booking, status: Booking["status"]) {
    return runAction(booking.id, async () => {
      const response = await api.updateBookingStatus(booking.id, status);
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id ? response.booking : item,
        ),
      );
      setLiveNotice(`Appointment ${status}.`);
      if (user) await refresh(user);
    });
  }

  async function createSlot(startsAt: string, endsAt: string) {
    return runAction("create-slot", async () => {
      const start = new Date(startsAt).getTime();
      const end = new Date(endsAt).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end))
        throw new Error("Select both start and end times.");
      if (start <= Date.now())
        throw new Error("Availability must start in the future.");
      if (end <= start)
        throw new Error("The end time must be after the start time.");
      const { slot } = await api.createAvailability(
        new Date(start).toISOString(),
        new Date(end).toISOString(),
      );
      setAvailableSlots((current) =>
        [...current.filter((item) => item.id !== slot.id), slot].sort(
          (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
        ),
      );
      setLiveNotice("Availability saved.");
      if (user) await refresh(user);
    });
  }

  async function deleteSlot(slotId: string) {
    return runAction(slotId, async () => {
      await api.deleteAvailability(slotId);
      setAvailableSlots((current) =>
        current.filter((slot) => slot.id !== slotId),
      );
      setLiveNotice("Availability removed.");
      if (user) await refresh(user);
    });
  }

  async function joinAppointment(booking: Booking) {
    return runAction(booking.id, async () => {
      const response = await api.createCall({
        bookingId: booking.id,
        mode: "video",
      });
      navigate(`/callroom/session?callId=${response.call.id}`, {
        state: { peerName: booking.clientName },
      });
    });
  }

  return {
    user,
    bookings,
    availableSlots: availableSlots.filter(
      (slot) => Date.parse(slot.endsAt) > now,
    ),
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
    retry: () => (user ? refresh(user) : window.location.reload()),
  };
}
