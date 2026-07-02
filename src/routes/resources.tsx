import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ExternalLink,
  BookOpen,
  IdCard,
  Calendar,
  Car,
  Award,
  MapPin,
  Navigation,
  Cloud,
} from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [{ title: "Resources — DSM by EveryDriver" }],
  }),
  component: ResourcesPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface ResourceItem {
  title: string;
  description: string;
  url: string;
  Icon: typeof BookOpen;
  iconColor: string;
}

const dvsaResources: ResourceItem[] = [
  {
    title: "DVSA guidance",
    description: "Official DVSA instructor guidance and updates",
    url: "https://www.gov.uk/government/organisations/driver-and-vehicle-standards-agency",
    Icon: BookOpen,
    iconColor: "#1877D6",
  },
  {
    title: "Check a driving licence",
    description: "Verify a pupil's licence details",
    url: "https://www.gov.uk/check-driving-information",
    Icon: IdCard,
    iconColor: "#16A34A",
  },
  {
    title: "Book a theory test",
    description: "Help pupils book their theory test",
    url: "https://www.gov.uk/book-theory-test",
    Icon: Calendar,
    iconColor: "#F59E0B",
  },
  {
    title: "Book a driving test",
    description: "Help pupils book their practical test",
    url: "https://www.gov.uk/book-driving-test",
    Icon: Car,
    iconColor: "#CC2229",
  },
  {
    title: "ADI register",
    description: "Check the approved driving instructor register",
    url: "https://www.gov.uk/find-driving-instructor",
    Icon: Award,
    iconColor: "#1877D6",
  },
  {
    title: "Highway Code",
    description: "Latest Highway Code rules and updates",
    url: "https://www.gov.uk/guidance/the-highway-code",
    Icon: BookOpen,
    iconColor: "#6B7280",
  },
];

const usefulTools: ResourceItem[] = [
  {
    title: "What3Words",
    description: "Find precise pickup locations",
    url: "https://what3words.com",
    Icon: MapPin,
    iconColor: "#CC2229",
  },
  {
    title: "Google Maps",
    description: "Navigate to your next lesson",
    url: "https://maps.google.com",
    Icon: Navigation,
    iconColor: "#1877D6",
  },
  {
    title: "Met Office",
    description: "Check weather before lessons",
    url: "https://www.metoffice.gov.uk",
    Icon: Cloud,
    iconColor: "#6B7280",
  },
];

function ResourcesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Resources
        </div>
        <div style={{ width: 40, height: 40 }} />
      </div>

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
    </div>
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
      <ExternalLink size={16} color="#6B7280" className="shrink-0 ml-2" />
    </a>
  );
}

export default ResourcesPage;
