import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  PenSquare,
  Target,
  TrendingUp,
  Settings,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Log Entry", href: "/log", icon: PenSquare },
  { title: "Trends", href: "/trends", icon: TrendingUp },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-label="VitalVault logo"
          >
            <rect
              x="2"
              y="2"
              width="24"
              height="24"
              rx="6"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />
            <path
              d="M8 14L12 18L20 10"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            />
          </svg>
          <span className="font-semibold text-base tracking-tight">
            VitalVault
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.href}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Privacy</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>All data stored locally</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Your health data never leaves your device. Export anytime.
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <PerplexityAttribution />
      </SidebarFooter>
    </Sidebar>
  );
}
