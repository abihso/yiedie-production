import { Icon } from "@iconify/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Images } from "../../assets/images";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MobileBottomNav } from "../../components/mobile-bottom-nav";
import { useProfessionalDashboard } from "../../features/counsellor/use-professional-dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@base-ui/react/button";

const Saveds = () => {
  const navigate = useNavigate();
  const { dashboardLoading, setActionError } = useProfessionalDashboard();

  const [, setDialog] = useState<
    "availability" | "appointments" | "pending" | "satisfaction" | null
  >(null);

  function openAvailability() {
    setActionError("");
    setDialog("availability");
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

  return (
    <div className="min-h-screen px-3 py-5 sm:px-5 bg-[#f3f7ff]">
      {/* Top Header Section */}
      <div className="mobile-dashboard-header min-h-48 px-3 sm:px-5 pb-5 overflow-visible rounded-2xl">
        <div className="pt-2 flex items-center justify-center relative">
          <div className="absolute left-0">
            <img src={Images[0]} className="w-8" alt="" />
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="mt-5 flex flex-col lg:flex-row gap-3 sm:gap-5 items-start">
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
        <div className=" min-h-screen flex flex-col items-center w-full -mt-40">
          <div className="h-45 w-[70%] flex items-center rounded-2xl border-[#DEDEDE] shadow-sm px-5 py-2 border">
            <div className="w-full flex items-center gap-5">
              <div className="w-28 h-28 rounded-full bg-[#000057] flex items-center justify-center shadow-md">
                <Avatar className="w-25 h-25">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className=" font-bold text-sm text-[#000057] tracking-tight whitespace-nowrap">
                  Theophilus, Antwi Boasiako
                </p>
                <p className="text-gray-500 text-xs">@ABkobby_11</p>
                <div className="flex gap-5 mt-2">
                  <div>
                    <p className="font-bold text-[#000057]">20</p>
                    <p className="text-gray-500 text-xs">Posts</p>
                  </div>
                  <div>
                    <p className="font-bold text-[#000057]">20k</p>
                    <p className="text-gray-500 text-xs">Followers</p>
                  </div>
                  <div>
                    <p className="font-bold text-[#000057]">500</p>
                    <p className="text-gray-500 text-xs">Following</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full border-l-2 pl-10 border-[#DEDEDE] h-full flex flex-col justify-center ">
              <p className="font-bold">Bio</p>
              <p className="text-[#000057] text-xs">
                Software Company <br /> Software Engineer and Programmer💻
                <br />
                Artificial Intelligence and Automation <br />
                Entrepreneur <br />
                CEO of @altbit.com <br />
                Music Lover/ bass guitarist 🎸Jesus Boy
              </p>
            </div>
          </div>
          <div className="w-[70%] flex mt-10 gap-3 ">
            <Button className="w-full h-10 font-bold rounded-md bg-[#000057] text-white">
              Edit
            </Button>
            <Button className="w-full h-10 font-bold rounded-md bg-[#000057] text-white">
              Archive
            </Button>
            <Button className="w-full h-10 font-bold rounded-md bg-[#000057] text-white">
              Add another account
            </Button>
            <Button className="w-full h-10 font-bold rounded-md bg-[#FF0105] text-white">
              Delete Account
            </Button>
          </div>
          <div className="w-[70%] flex mt-10 gap-3 ">
            <div className="w-20 h-20 rounded-full border-2 flex justify-center items-center border-[#ACA9FF] ">
              <div className="w-18 h-18 rounded-full bg-[#C1C1C1] " />
            </div>
            <div className="w-20 h-20 rounded-full border-2 flex justify-center items-center border-[#ACA9FF] ">
              <div className="w-18 h-18 rounded-full bg-[#C1C1C1] " />
            </div>
            <div className="w-20 h-20 rounded-full border-2 flex justify-center items-center border-[#ACA9FF] ">
              <div className="w-18 h-18 rounded-full bg-[#C1C1C1] " />
            </div>
            <div className="w-20 h-20 rounded-full border-2 flex justify-center items-center border-[#ACA9FF] ">
              <div className="w-18 h-18 rounded-full bg-[#C1C1C1] " />
            </div>
          </div>
          <div className="w-[80%] border-[#ACA9FF] border-b flex justify-center gap-20 mt-10">
            <div className="flex flex-col items-center border-b-4 px-2 border-[#FF9001] pb-2 -mb-0.5">
              <Icon
                icon="ri:notification-line"
                className="w-5 h-5 text-[#000057]"
              />
            </div>
            <div className="flex flex-col items-center hover:border-b-4 px-2 hover:border-[#FF9001] pb-2 -mb-0.5">
              <Icon
                icon="fluent:people-community-20-regular"
                className="w-5 h-5 text-[#000057]"
              />
            </div>
            <div className="flex flex-col items-center hover:border-b-4 px-2 hover:border-[#FF9001] pb-2 -mb-0.5">
              <Icon icon="proicons:video" className="w-5 h-5 text-[#000057]" />
            </div>
            <div className="flex flex-col items-center hover:border-b-4 px-2 hover:border-[#FF9001] pb-2 -mb-0.5">
              <Icon icon="reicon:save" className="w-5 h-5 text-[#000057]" />
            </div>
            <div className="flex flex-col items-center hover:border-b-4 px-2 hover:border-[#FF9001] pb-2 -mb-0.5">
              <Icon
                icon="hugeicons:repost"
                className="w-5 h-5 text-[#000057]"
              />
            </div>
          </div>
          <div className="w-[75%] flex flex-col gap-5 mt-5">
            <div className="flex justify-between items-center">
              <p className="text-sm">
                Only you can see until you decide to share
              </p>
              <p className="text-[#FF9001] text-sm flex ">
                <Icon
                  icon="hugeicons:repost"
                  className="w-5 h-5 text-[#000057]"
                />
                Add new collection
              </p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
};

export default Saveds;
