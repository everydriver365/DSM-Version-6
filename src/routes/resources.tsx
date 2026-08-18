import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconAward, IconBook, IconCalendar, IconCar, IconCloud, IconExternalLink, IconId, IconMapPin, IconNavigation } from "@tabler/icons-react";
import { toast } from "sonner";
import InstructorTopBar, { TOP_BAR_SPACER } from "@/components/dsm/InstructorTopBar";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [{ title: "Resources — DSM by EveryDriver" }],
  }),
  component: ResourcesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface ResourceItem {
  title: string;
  description: string;
  url: string;
  Icon: typeof IconBook;
  iconColor: string;
}

const dvsaResources: ResourceItem[] = [
  {
    title: "DVSA guidance",
    description: "Official DVSA instructor guidance and updates",
    url: "https://www.gov.uk/government/organisations/driver-and-vehicle-standards-agency",
    Icon: IconBook,
    iconColor: "#1877D6",
  },
  {
    title: "Check a driving licence",
    description: "Verify a pupil's licence details",
    url: "https://www.gov.uk/check-driving-information",
    Icon: IconId,
    iconColor: "#1877D6",
  },
  {
    title: "Book a theory test",
    description: "Help pupils book their theory test",
    url: "https://www.gov.uk/book-theory-test",
    Icon: IconCalendar,
    iconColor: "#1877D6",
  },
  {
    title: "Book a driving test",
    description: "Help pupils book their practical test",
    url: "https://www.gov.uk/book-driving-test",
    Icon: IconCar,
    iconColor: "#1877D6",
  },
  {
    title: "ADI register",
    description: "Check the approved driving instructor register",
    url: "https://www.gov.uk/find-driving-instructor",
    Icon: IconAward,
    iconColor: "#1877D6",
  },
  {
    title: "Highway Code",
    description: "Latest Highway Code rules and updates",
    url: "https://www.gov.uk/guidance/the-highway-code",
    Icon: IconBook,
    iconColor: "#6B7280",
  },
];

const usefulTools: ResourceItem[] = [
  {
    title: "What3Words",
    description: "Find precise pickup locations",
    url: "https://what3words.com",
    Icon: IconMapPin,
    iconColor: "#1877D6",
  },
  {
    title: "Google Maps",
    description: "Navigate to your next lesson",
    url: "https://maps.google.com",
    Icon: IconNavigation,
    iconColor: "#1877D6",
  },
  {
    title: "Met Office",
    description: "Check weather before lessons",
    url: "https://www.metoffice.gov.uk",
    Icon: IconCloud,
    iconColor: "#6B7280",
  },
];

function ResourcesPage() {
  const navigate = useNavigate();

  return (
    <PageLayout className="pb-8" style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="Resources"
        onBack={() => navigate({ to: "/home" } as never)}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "TOP_BAR_SPACER" }} />


      {/* DVSA RESOURCES */}
      <div className="px-4">
        <SectionHeader>DVSA RESOURCES</SectionHeader>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {dvsaResources.map((r) => (
            <ResourceCard key={r.title} resource={r} />
          ))}
        </div>
      </div>

      {/* USEFUL TOOLS */}
      <div className="px-4">
        <SectionHeader>USEFUL TOOLS</SectionHeader>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {usefulTools.map((r) => (
            <ResourceCard key={r.title} resource={r} />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

function ResourceCard({ resource }: { resource: ResourceItem }) {
  const { title, description, url, Icon, iconColor } = resource;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center bg-[#F8F9FB] rounded-xl p-4"
      style={{
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        textDecoration: "none",
      }}
    >
      <span
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 36, height: 36, backgroundColor: `${iconColor}14` }}
      >
        <Icon size={18} color={iconColor} />
      </span>
      <div className="ml-3 flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-[#0B1F3A] truncate" style={POPPINS}>
          {title}
        </div>
        <div className="text-[13px] text-[#6B7280] truncate">{description}</div>
      </div>
      <IconExternalLink size={16} color="#6B7280" className="shrink-0 ml-2" />
    </a>
  );
}

export default ResourcesPage;
